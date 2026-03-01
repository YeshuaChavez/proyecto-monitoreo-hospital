"""
=============================================================
 MONITOR IoT HOSPITALARIO — Backend FastAPI
 UNMSM FISI 2026
=============================================================
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import SessionLocal, init_db
from models import Suero, Vitales, Alerta
from mqtt_client import MQTTManager
from telegram_bot import polling

# ── Singleton MQTT ────────────────────────────────────────────
mqtt_manager = MQTTManager()

# ── WebSocket manager ─────────────────────────────────────────
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
        msg  = json.dumps(data, default=str)
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(msg)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()

# ── Lifespan ──────────────────────────────────────────────────
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════
#  WEBSOCKET
# ═══════════════════════════════════════════════════════════════
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        db = SessionLocal()
        try:
            # Enviar último suero y últimos vitales al conectar
            ultimo_suero   = db.query(Suero).order_by(Suero.id.desc()).first()
            ultimos_vitales = db.query(Vitales).order_by(Vitales.id.desc()).first()

            if ultimo_suero:
                await websocket.send_text(json.dumps({
                    "type": "lectura",
                    "data": ultimo_suero.to_dict(),
                    "estado": {
                        **ultimo_suero.to_dict(),
                        **(ultimos_vitales.to_dict() if ultimos_vitales else {"fc": 0, "spo2": 0, "estado_vitales": "MIDIENDO"}),
                    }
                }, default=str))

            if ultimos_vitales:
                await websocket.send_text(json.dumps({
                    "type": "vitales",
                    "data": ultimos_vitales.to_dict(),
                }, default=str))
        finally:
            db.close()

        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping"}))

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# ═══════════════════════════════════════════════════════════════
#  REST — GENERAL
# ═══════════════════════════════════════════════════════════════
@app.get("/")
def root():
    return {"status": "ok", "service": "Monitor IoT Hospitalario UNMSM"}

# ═══════════════════════════════════════════════════════════════
#  REST — SUERO (tabla suero)
# ═══════════════════════════════════════════════════════════════
@app.get("/suero")
def get_suero(limit: int = 60):
    """Últimas N lecturas de suero para gráfica de peso."""
    db = SessionLocal()
    try:
        rows = db.query(Suero).order_by(Suero.id.desc()).limit(limit).all()
        return [r.to_dict() for r in reversed(rows)]
    finally:
        db.close()

@app.get("/suero/ultimo")
def get_ultimo_suero():
    db = SessionLocal()
    try:
        row = db.query(Suero).order_by(Suero.id.desc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="Sin lecturas de suero aún")
        return row.to_dict()
    finally:
        db.close()

@app.get("/suero/rango")
def get_suero_rango(desde: str, hasta: str):
    db = SessionLocal()
    try:
        rows = (
            db.query(Suero)
            .filter(Suero.timestamp >= desde, Suero.timestamp <= hasta)
            .order_by(Suero.timestamp)
            .all()
        )
        return [r.to_dict() for r in rows]
    finally:
        db.close()

# ═══════════════════════════════════════════════════════════════
#  REST — VITALES (tabla vitales)
# ═══════════════════════════════════════════════════════════════
@app.get("/vitales")
def get_vitales(limit: int = 60):
    """Últimas N lecturas de vitales promediados para gráfica FC/SpO2."""
    db = SessionLocal()
    try:
        rows = db.query(Vitales).order_by(Vitales.id.desc()).limit(limit).all()
        return [r.to_dict() for r in reversed(rows)]
    finally:
        db.close()

@app.get("/vitales/ultimo")
def get_ultimos_vitales():
    db = SessionLocal()
    try:
        row = db.query(Vitales).order_by(Vitales.id.desc()).first()
        if not row:
            raise HTTPException(status_code=404, detail="Sin lecturas de vitales aún")
        return row.to_dict()
    finally:
        db.close()

@app.get("/vitales/rango")
def get_vitales_rango(desde: str, hasta: str):
    db = SessionLocal()
    try:
        rows = (
            db.query(Vitales)
            .filter(Vitales.timestamp >= desde, Vitales.timestamp <= hasta)
            .order_by(Vitales.timestamp)
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
#  REST — COMANDOS
# ═══════════════════════════════════════════════════════════════
class ComandoRequest(BaseModel):
    cmd: str

COMANDOS_VALIDOS = {"bomba_on", "bomba_off", "reset"}

@app.post("/comandos")
async def enviar_comando(body: ComandoRequest):
    if body.cmd not in COMANDOS_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Comando inválido. Válidos: {COMANDOS_VALIDOS}")
    await mqtt_manager.publicar_comando(body.cmd)
    return {"ok": True, "cmd": body.cmd, "timestamp": datetime.utcnow().isoformat()}

# ═══════════════════════════════════════════════════════════════
#  REST — EMAIL
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
        destinatario = body.destinatario,
    )
    return {"ok": True, "destinatario": body.destinatario}

# ═══════════════════════════════════════════════════════════════
#  REST — STATS
# ═══════════════════════════════════════════════════════════════
@app.get("/stats")
def get_stats():
    db = SessionLocal()
    try:
        total_suero   = db.query(Suero).count()
        total_vitales = db.query(Vitales).count()
        alertas_activas = db.query(Alerta).filter(Alerta.activa == True).count()
        ultimo_suero    = db.query(Suero).order_by(Suero.id.desc()).first()
        ultimos_vitales = db.query(Vitales).order_by(Vitales.id.desc()).first()
        return {
            "total_suero":      total_suero,
            "total_vitales":    total_vitales,
            "alertas_activas":  alertas_activas,
            "ultimo_suero":     ultimo_suero.to_dict()    if ultimo_suero    else None,
            "ultimos_vitales":  ultimos_vitales.to_dict() if ultimos_vitales else None,
            "clientes_ws":      len(ws_manager.active),
        }
    finally:
        db.close()