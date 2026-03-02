"""
=============================================================
 MONITOR IoT — POSTA MÉDICA
 UNMSM FISI 2026
=============================================================
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models import Suero, Vitales, Alerta, Config, Usuario, Paciente
from mqtt_client import MQTTManager
from telegram_bot import polling
from email_service import enviar_email_familiar


mqtt_manager = MQTTManager()


# ═══════════════════════════════════════════════════════════════
#  DEPENDENCY — DB SESSION
# ═══════════════════════════════════════════════════════════════
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════
#  WEBSOCKET MANAGER
# ═══════════════════════════════════════════════════════════════
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


# ═══════════════════════════════════════════════════════════════
#  LIFESPAN
# ═══════════════════════════════════════════════════════════════
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


app = FastAPI(
    title="Monitor IoT Posta Médica",
    description="UNMSM FISI 2026 — Consultorio General",
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
#  ESTADO GLOBAL — PACIENTE ACTIVO
# ═══════════════════════════════════════════════════════════════
_paciente_activo_id: int | None = None


# ═══════════════════════════════════════════════════════════════
#  WEBSOCKET
# ═══════════════════════════════════════════════════════════════
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        db = SessionLocal()
        try:
            ultimo_suero    = db.query(Suero).order_by(Suero.id.desc()).first()
            ultimos_vitales = db.query(Vitales).order_by(Vitales.id.desc()).first()

            if ultimo_suero:
                await websocket.send_text(json.dumps({
                    "type": "lectura",
                    "data": ultimo_suero.to_dict(),
                    "estado": {
                        **ultimo_suero.to_dict(),
                        **(ultimos_vitales.to_dict() if ultimos_vitales else {
                            "fc": 0, "spo2": 0, "estado_vitales": "MIDIENDO"
                        }),
                    }
                }, default=str))

            if ultimos_vitales:
                await websocket.send_text(json.dumps({
                    "type": "vitales",
                    "data": ultimos_vitales.to_dict(),
                }, default=str))

            # Enviar paciente activo al conectarse
            if _paciente_activo_id:
                p = db.query(Paciente).filter(Paciente.id == _paciente_activo_id).first()
                if p:
                    await websocket.send_text(json.dumps({
                        "type":     "paciente_activo",
                        "paciente": p.to_dict(),
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
    return {"status": "ok", "service": "Monitor IoT Posta Médica — Consultorio General"}


# ═══════════════════════════════════════════════════════════════
#  REST — SUERO
# ═══════════════════════════════════════════════════════════════
@app.get("/suero")
def get_suero(limit: int = 60):
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
            .order_by(Suero.timestamp).all()
        )
        return [r.to_dict() for r in rows]
    finally:
        db.close()

from sqlalchemy import Integer, func

@app.get("/suero/por-minuto")
def get_suero_por_minuto(limit: int = 60, db: Session = Depends(get_db)):
    q = db.query(
        func.date_format(Suero.timestamp, "%Y-%m-%d %H:%i").label("minuto"),
        func.avg(Suero.peso).label("peso"),
        func.max(Suero.bomba.cast(Integer)).label("bomba"),
        func.max(Suero.estado_suero).label("estado_suero"),
    )
    if _paciente_activo_id:
        q = q.filter(Suero.paciente_id == _paciente_activo_id)
    rows = q.group_by("minuto").order_by("minuto").limit(limit).all()
    return [
        {
            "time":         row.minuto[-5:],
            "timestamp":    row.minuto,
            "peso":         round(float(row.peso), 1),
            "bomba":        bool(row.bomba),
            "estado_suero": row.estado_suero or "NORMAL",
        }
        for row in rows
    ]


@app.get("/vitales/por-minuto")
def get_vitales_por_minuto(limit: int = 60, db: Session = Depends(get_db)):
    q = db.query(
        func.date_format(Vitales.timestamp, "%Y-%m-%d %H:%i").label("minuto"),
        func.avg(Vitales.fc).label("fc"),
        func.avg(Vitales.spo2).label("spo2"),
        func.max(Vitales.estado_vitales).label("estado_vitales"),
    ).filter(Vitales.fc > 0, Vitales.spo2 > 0)
    if _paciente_activo_id:
        q = q.filter(Vitales.paciente_id == _paciente_activo_id)
    rows = q.group_by("minuto").order_by("minuto").limit(limit).all()
    return [
        {
            "time":           row.minuto[-5:],
            "timestamp":      row.minuto,
            "fc":             round(float(row.fc)),
            "spo2":           round(float(row.spo2), 1),
            "estado_vitales": row.estado_vitales or "NORMAL",
        }
        for row in rows
    ]

# ═══════════════════════════════════════════════════════════════
#  REST — VITALES
# ═══════════════════════════════════════════════════════════════
@app.get("/vitales")
def get_vitales(limit: int = 60):
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
            .order_by(Vitales.timestamp).all()
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
        if _paciente_activo_id:
            q = q.filter(Alerta.paciente_id == _paciente_activo_id)
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
    cmd:    str
    origen: str = "dashboard"

COMANDOS_VALIDOS = {"bomba_on", "bomba_off", "reset", "tare"}

@app.post("/comandos")
async def enviar_comando(body: ComandoRequest):
    if body.cmd not in COMANDOS_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Comando inválido. Válidos: {COMANDOS_VALIDOS}"
        )
    mqtt_manager.ultimo_origen = body.origen
    await mqtt_manager.publicar_comando(body.cmd)
    return {"ok": True, "cmd": body.cmd, "timestamp": datetime.utcnow().isoformat()}


# ═══════════════════════════════════════════════════════════════
#  REST — EMAIL
# ═══════════════════════════════════════════════════════════════
class EmailRequest(BaseModel):
    destinatario: str
    payload:      dict = {}
    alertas:      list = []
    paciente_id:  int | None = None

@app.post("/enviar-email")
async def enviar_email_endpoint(body: EmailRequest):
    from email_service import enviar_email_familiar
    
    db = SessionLocal()
    try:
        paciente = None
        if _paciente_activo_id:  # ← usa la variable global, no cfg
            p = db.query(Paciente).filter(Paciente.id == _paciente_activo_id).first()
            if p:
                paciente = p.to_dict()
    finally:
        db.close()
    
    await enviar_email_familiar(
        payload      = body.payload,
        alertas      = body.alertas,
        destinatario = body.destinatario,
        paciente     = paciente,
    )
    return {"ok": True, "destinatario": body.destinatario}


# ═══════════════════════════════════════════════════════════════
#  REST — CONFIG / UMBRALES
# ═══════════════════════════════════════════════════════════════
class ConfigRequest(BaseModel):
    peso_alerta:  float
    peso_critico: float

@app.get("/config")
def get_configuracion():
    db = SessionLocal()
    try:
        q = db.query(Config).order_by(Config.id.desc())
        if _paciente_activo_id:
            # Busca config específica del paciente, si no existe usa la global
            cfg = q.filter(Config.paciente_id == _paciente_activo_id).first()
            if not cfg:
                cfg = q.filter(Config.paciente_id == None).first()
        else:
            cfg = q.first()
        if cfg:
            return cfg.to_dict()
        return {"peso_alerta": 150.0, "peso_critico": 100.0}
    finally:
        db.close()

@app.post("/config")
async def guardar_configuracion(body: ConfigRequest):
    if body.peso_critico >= body.peso_alerta:
        raise HTTPException(status_code=400, detail="El umbral crítico debe ser menor que el de alerta")
    if body.peso_critico < 10 or body.peso_alerta > 490:
        raise HTTPException(status_code=400, detail="Umbrales fuera de rango (10–490g)")

    db = SessionLocal()
    try:
        cfg = Config(
            paciente_id  = _paciente_activo_id,  # ← vincula al paciente activo
            peso_alerta  = body.peso_alerta,
            peso_critico = body.peso_critico,
            updated_at   = datetime.utcnow() - timedelta(hours=5),
        )
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
        result = cfg.to_dict()
    finally:
        db.close()

    await mqtt_manager.publicar_config(body.peso_alerta, body.peso_critico)
    return {"ok": True, "config": result}

# ═══════════════════════════════════════════════════════════════
#  REST — STATS
# ═══════════════════════════════════════════════════════════════
@app.get("/stats")
def get_stats():
    db = SessionLocal()
    try:
        total_suero     = db.query(Suero).count()
        total_vitales   = db.query(Vitales).count()
        alertas_activas = db.query(Alerta).filter(Alerta.activa == True).count()
        ultimo_suero    = db.query(Suero).order_by(Suero.id.desc()).first()
        ultimos_vitales = db.query(Vitales).order_by(Vitales.id.desc()).first()
        return {
            "total_suero":     total_suero,
            "total_vitales":   total_vitales,
            "alertas_activas": alertas_activas,
            "ultimo_suero":    ultimo_suero.to_dict()    if ultimo_suero    else None,
            "ultimos_vitales": ultimos_vitales.to_dict() if ultimos_vitales else None,
            "clientes_ws":     len(ws_manager.active),
        }
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════
#  REST — LOGIN
# ═══════════════════════════════════════════════════════════════
class LoginRequest(BaseModel):
    usuario:  str
    password: str

@app.post("/login")
def login(body: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(Usuario).filter(
            Usuario.usuario  == body.usuario,
            Usuario.password == body.password,
            Usuario.activo   == True,
        ).first()
        if not user:
            raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")
        return user.to_dict()
    finally:
        db.close()

@app.post("/logout")
async def logout():
    global _paciente_activo_id
    _paciente_activo_id = None
    mqtt_manager.set_paciente_activo(None)
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════
#  REST — PACIENTES (CRUD)
# ═══════════════════════════════════════════════════════════════
class PacienteRequest(BaseModel):
    nombre:            str
    apellido:          str
    codigo:            str | None = None
    doctor_id:         int | None = None          
    grupo_sanguineo:   str = ""
    fecha_nacimiento:  str = ""
    fecha_ingreso:     str = ""
    direccion:         str = ""
    contacto_nombre:   str = ""
    contacto_telefono: str = ""
    contacto_relacion: str = ""

@app.get("/pacientes")
def get_pacientes(solo_activos: bool = True, doctor_id: int | None = Query(None)):
    db = SessionLocal()
    try:
        q = db.query(Paciente)
        if solo_activos:
            q = q.filter(Paciente.activo == True)
        if doctor_id:
            q = q.filter(Paciente.doctor_id == doctor_id)
        return [p.to_dict() for p in q.order_by(Paciente.id.desc()).all()]
    finally:
        db.close()

@app.get("/pacientes/{paciente_id}")
def get_paciente(paciente_id: int):
    db = SessionLocal()
    try:
        p = db.query(Paciente).filter(Paciente.id == paciente_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        return p.to_dict()
    finally:
        db.close()

@app.post("/pacientes")
def crear_paciente(body: PacienteRequest):
    db = SessionLocal()
    try:
        p = Paciente(
            nombre            = body.nombre,
            apellido          = body.apellido,
            codigo            = body.codigo,
            doctor_id         = body.doctor_id,
            grupo_sanguineo   = body.grupo_sanguineo,
            fecha_nacimiento  = body.fecha_nacimiento,
            fecha_ingreso     = body.fecha_ingreso,
            direccion         = body.direccion,
            contacto_nombre   = body.contacto_nombre,
            contacto_telefono = body.contacto_telefono,
            contacto_relacion = body.contacto_relacion,
            activo            = True,
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        # Generar código si no vino del frontend
        if not p.codigo:
            p.codigo = f"PCT-{datetime.now().year}-{str(p.id).zfill(4)}"
            db.commit()

        return p.to_dict()
    finally:
        db.close()

@app.put("/pacientes/{paciente_id}")
def actualizar_paciente(paciente_id: int, body: PacienteRequest):
    db = SessionLocal()
    try:
        p = db.query(Paciente).filter(Paciente.id == paciente_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        p.nombre            = body.nombre
        p.apellido          = body.apellido
        p.codigo            = body.codigo
        p.doctor_id         = body.doctor_id    # ← cambio
        p.grupo_sanguineo   = body.grupo_sanguineo
        p.fecha_nacimiento  = body.fecha_nacimiento
        p.fecha_ingreso     = body.fecha_ingreso
        p.direccion         = body.direccion
        p.contacto_nombre   = body.contacto_nombre
        p.contacto_telefono = body.contacto_telefono
        p.contacto_relacion = body.contacto_relacion
        db.commit()
        db.refresh(p)
        return p.to_dict()
    finally:
        db.close()

@app.delete("/pacientes/{paciente_id}")
def desactivar_paciente(paciente_id: int):
    db = SessionLocal()
    try:
        p = db.query(Paciente).filter(Paciente.id == paciente_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")
        p.activo = False
        db.commit()
        return {"ok": True, "mensaje": f"Paciente desactivado"}
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════
#  REST — PACIENTE ACTIVO + RESET
# ═══════════════════════════════════════════════════════════════
@app.get("/paciente-activo")
def get_paciente_activo():
    if _paciente_activo_id is None:
        return {"paciente": None}
    db = SessionLocal()
    try:
        p = db.query(Paciente).filter(Paciente.id == _paciente_activo_id).first()
        return {"paciente": p.to_dict() if p else None}
    finally:
        db.close()

class SeleccionarPacienteRequest(BaseModel):
    paciente_id: int

@app.post("/paciente-activo")
async def seleccionar_paciente(body: SeleccionarPacienteRequest):
    global _paciente_activo_id
    db = SessionLocal()
    try:
        p = db.query(Paciente).filter(
            Paciente.id     == body.paciente_id,
            Paciente.activo == True,
        ).first()
        if not p:
            raise HTTPException(status_code=404, detail="Paciente no encontrado")

        _paciente_activo_id = p.id
        p.fecha_ingreso = datetime.now().strftime("%d-%m-%Y")
        db.commit()

        mqtt_manager.set_paciente_activo(p.to_dict())
        await mqtt_manager.publicar_comando("reset")
        await asyncio.sleep(0.5)  # ← dar tiempo al MQTT de procesar

        # ← NUEVO: revisar peso actual y activar bomba si es necesario
        cfg = db.query(Config).filter(
            Config.paciente_id == p.id
        ).first() or db.query(Config).filter(Config.paciente_id == None).first()
        
        peso_critico = cfg.peso_critico if cfg else 100.0

        ultimo_suero = db.query(Suero).filter(
            Suero.paciente_id == p.id
        ).order_by(Suero.id.desc()).first()

        if ultimo_suero and ultimo_suero.peso <= peso_critico:
            await asyncio.sleep(1)  # espera que el ESP32 termine el reset
            await mqtt_manager.publicar_comando("bomba_on")

        await ws_manager.broadcast({
            "type":     "paciente_activo",
            "paciente": p.to_dict(),
        })

        return {"ok": True, "paciente": p.to_dict()}
    finally:
        db.close()

@app.get("/usuarios/medicos")
def get_usuarios_medicos():
    db = SessionLocal()
    try:
        return [u.to_dict() for u in db.query(Usuario)
                .filter(Usuario.activo == True, Usuario.rol != "Administrador")
                .order_by(Usuario.nombre).all()]
    finally:
        db.close()

