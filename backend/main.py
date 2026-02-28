"""
=============================================================
 MONITOR IoT HOSPITALARIO — Backend FastAPI
 UNMSM FISI 2026
=============================================================
 Flujo:
   ESP32 → MQTT (HiveMQ) → este servidor → MySQL
                                         → WebSocket (Vercel)
   Vercel → REST API → este servidor → MQTT → ESP32
=============================================================
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime

import aiomqtt
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from database import engine, SessionLocal, init_db
from models import Lectura, Alerta
from mqtt_client import MQTTManager

from telegram_bot import polling

# ── Singleton MQTT ────────────────────────────────────────────
mqtt_manager = MQTTManager()

# ── WebSocket manager ────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        msg = json.dumps(data, default=str)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()

# ── Lifespan ─────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    task_mqtt     = asyncio.create_task(mqtt_manager.start(ws_manager))
    task_telegram = asyncio.create_task(polling())  
    yield
    task_mqtt.cancel()
    task_telegram.cancel()
    try:
        await task_mqtt
        await task_telegram
    except asyncio.CancelledError:
        pass

# ── App ───────────────────────────────────────────────────────
app = FastAPI(
    title="Monitor IoT Hospitalario",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # En producción: ["https://tu-app.vercel.app"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════
#  WEBSOCKET — dashboard se conecta aquí
# ═══════════════════════════════════════════════════════════════
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Enviar última lectura al conectar
        db = SessionLocal()
        try:
            ultima = db.query(Lectura).order_by(Lectura.id.desc()).first()
            if ultima:
                await websocket.send_text(json.dumps({
                    "type": "lectura",
                    "data": ultima.to_dict()
                }, default=str))
        finally:
            db.close()

        # Mantener conexión viva
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping"}))

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# ═══════════════════════════════════════════════════════════════
#  REST — LECTURAS
# ═══════════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"status": "ok", "service": "Monitor IoT Hospitalario UNMSM"}

@app.get("/lecturas")
def get_lecturas(limit: int = 60):
    """Últimas N lecturas para gráficas históricas."""
    db = SessionLocal()
    try:
        rows = (
            db.query(Lectura)
            .order_by(Lectura.id.desc())
            .limit(limit)
            .all()
        )
        return [r.to_dict() for r in reversed(rows)]
    finally:
        db.close()

@app.get("/lecturas/ultima")
def get_ultima_lectura():
    """Última lectura en tiempo real."""
    db = SessionLocal()
    try:
        row = db.query(Lectura).order_by(Lectura.id.desc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="Sin lecturas aún")
        return row.to_dict()
    finally:
        db.close()

@app.get("/lecturas/rango")
def get_lecturas_rango(desde: str, hasta: str):
    """Lecturas entre dos timestamps ISO (para analytics)."""
    db = SessionLocal()
    try:
        rows = (
            db.query(Lectura)
            .filter(Lectura.timestamp >= desde, Lectura.timestamp <= hasta)
            .order_by(Lectura.timestamp)
            .all()
        )
        return [r.to_dict() for r in rows]
    finally:
        db.close()

# ═══════════════════════════════════════════════════════════════
#  REST — ALERTAS
# ═══════════════════════════════════════════════════════════════
@app.get("/alertas")
def get_alertas(limit: int = 20, solo_activas: bool = False):
    db = SessionLocal()
    try:
        q = db.query(Alerta).order_by(Alerta.id.desc())
        if solo_activas:
            q = q.filter(Alerta.activa == True)
        return [r.to_dict() for r in q.limit(limit).all()]
    finally:
        db.close()

@app.delete("/alertas")
def limpiar_alertas():
    db = SessionLocal()
    try:
        db.query(Alerta).update({"activa": False})
        db.commit()
        return {"ok": True, "mensaje": "Alertas desactivadas"}
    finally:
        db.close()

# ═══════════════════════════════════════════════════════════════
#  REST — COMANDOS hacia ESP32 vía MQTT
# ═══════════════════════════════════════════════════════════════
class ComandoRequest(BaseModel):
    cmd: str   # "bomba_on" | "bomba_off" | "reset"

COMANDOS_VALIDOS = {"bomba_on", "bomba_off", "reset"}

@app.post("/comandos")
async def enviar_comando(body: ComandoRequest):
    if body.cmd not in COMANDOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Comando inválido. Válidos: {COMANDOS_VALIDOS}")
    await mqtt_manager.publicar_comando(body.cmd)
    return {"ok": True, "cmd": body.cmd, "timestamp": datetime.utcnow().isoformat()}

# ═══════════════════════════════════════════════════════════════
#  REST — ENVIAR CORREO A CONTACTO DEL PACIENTE
# ═══════════════════════════════════════════════════════════════
class EmailRequest(BaseModel):
    destinatario: str
    payload: dict = {}
    alertas: list = []

@app.post("/enviar-email")
async def enviar_email_endpoint(body: EmailRequest):
    from email_service import enviar_email_familiar
    await enviar_email_familiar(
        payload      = body.payload,
        alertas      = body.alertas,
        destinatario = body.destinatario
    )
    return {"ok": True, "destinatario": body.destinatario}

# ═══════════════════════════════════════════════════════════════
#  REST — STATS para analytics
# ═══════════════════════════════════════════════════════════════
@app.get("/stats")
def get_stats():
    db = SessionLocal()
    try:
        total = db.query(Lectura).count()
        ultima = db.query(Lectura).order_by(Lectura.id.desc()).first()
        alertas_activas = db.query(Alerta).filter(Alerta.activa == True).count()
        return {
            "total_lecturas": total,
            "alertas_activas": alertas_activas,
            "ultima_lectura": ultima.to_dict() if ultima else None,
            "clientes_ws": len(ws_manager.active),
        }
    finally:
        db.close()
