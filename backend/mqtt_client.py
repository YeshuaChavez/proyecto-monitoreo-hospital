"""
MQTTManager:
  - Se suscribe a hospital/cama04/# en HiveMQ Cloud (TLS)
  - Guarda cada lectura en MySQL
  - Detecta alertas y las guarda
  - Hace broadcast por WebSocket a todos los clientes conectados
  - Publica comandos de vuelta al ESP32
"""

import asyncio
import json
import os
import ssl
from datetime import datetime

import aiomqtt

from database import SessionLocal
from models import Lectura, Alerta

# ── Credenciales HiveMQ (variables de entorno Railway) ────────
MQTT_HOST   = os.environ.get("MQTT_HOST",   "fd3a3baad98a46c3a2a0caabe973c4b3.s1.eu.hivemq.cloud")
MQTT_PORT   = int(os.environ.get("MQTT_PORT", "8883"))
MQTT_USER   = os.environ.get("MQTT_USER",   "esp32_cama04")
MQTT_PASS   = os.environ.get("MQTT_PASS",   "Hospital123")
MQTT_CLIENT = os.environ.get("MQTT_CLIENT", "FastAPI_Backend")

TOPIC_LECTURAS = "hospital/cama04/lecturas"
TOPIC_VITALES  = "hospital/cama04/vitales"
TOPIC_COMANDOS = "hospital/cama04/comandos"

# ── Umbrales para alertas automáticas ─────────────────────────
UMBRAL_FC_ALTA  = 100
UMBRAL_FC_BAJA  = 60
UMBRAL_SPO2     = 95
UMBRAL_SUERO_ALERTA  = 150.0
UMBRAL_SUERO_CRITICO = 100.0


class MQTTManager:
    def __init__(self):
        self._client = None
        self._ultimo_estado: dict = {}   # cache última lectura
        self._cola_comandos: asyncio.Queue = asyncio.Queue()

    # ── Guardar lectura en MySQL ───────────────────────────────
    def _guardar_lectura(self, payload: dict, topic: str) -> Lectura:
        db = SessionLocal()
        try:
            lectura = Lectura(
                timestamp       = datetime.utcnow(),
                fc              = payload.get("fc"),
                spo2            = payload.get("spo2"),
                peso            = payload.get("peso"),
                bomba           = bool(payload.get("bomba", False)),
                estado_suero    = payload.get("estado"),
                estado_vitales  = payload.get("estado_vitales"),
                topic           = topic,
            )
            db.add(lectura)
            db.commit()
            db.refresh(lectura)
            return lectura
        finally:
            db.close()

    # ── Detectar y guardar alertas ────────────────────────────
    def _verificar_alertas(self, payload: dict):
        db = SessionLocal()
        try:
            alertas_nuevas = []

            fc   = payload.get("fc",   0)
            spo2 = payload.get("spo2", 0)
            peso = payload.get("peso", 999)

            if fc and fc > UMBRAL_FC_ALTA:
                alertas_nuevas.append(Alerta(
                    tipo="FC_ALTA",
                    mensaje=f"Frecuencia cardíaca elevada: {fc} bpm (normal: 60-100)",
                    valor=fc,
                ))
            elif fc and fc < UMBRAL_FC_BAJA and fc > 0:
                alertas_nuevas.append(Alerta(
                    tipo="FC_BAJA",
                    mensaje=f"Bradicardia detectada: {fc} bpm (normal: 60-100)",
                    valor=fc,
                ))

            if spo2 and spo2 < UMBRAL_SPO2 and spo2 > 0:
                alertas_nuevas.append(Alerta(
                    tipo="SPO2_BAJA",
                    mensaje=f"Saturación O₂ baja: {spo2}% (normal: ≥95%)",
                    valor=spo2,
                ))

            if peso is not None and peso <= UMBRAL_SUERO_CRITICO:
                alertas_nuevas.append(Alerta(
                    tipo="SUERO_CRITICO",
                    mensaje=f"Nivel crítico de suero: {peso:.1f}g — bomba activada",
                    valor=peso,
                ))
            elif peso is not None and peso <= UMBRAL_SUERO_ALERTA:
                alertas_nuevas.append(Alerta(
                    tipo="SUERO_BAJO",
                    mensaje=f"Nivel bajo de suero: {peso:.1f}g",
                    valor=peso,
                ))

            if payload.get("bomba"):
                alertas_nuevas.append(Alerta(
                    tipo="BOMBA_ON",
                    mensaje="Bomba peristáltica activada — recargando suero",
                    valor=None,
                ))

            for a in alertas_nuevas:
                db.add(a)
            if alertas_nuevas:
                db.commit()

            return [a.to_dict() for a in alertas_nuevas]
        finally:
            db.close()

    # ── Publicar comando al ESP32 ─────────────────────────────
    async def publicar_comando(self, cmd: str):
        await self._cola_comandos.put(cmd)

    # ── Loop principal MQTT ───────────────────────────────────
    async def start(self, ws_manager):
        """Corre indefinidamente, reconecta si se cae."""
        while True:
            try:
                print(f"Conectando MQTT → {MQTT_HOST}:{MQTT_PORT}")
                tls = ssl.create_default_context()

                async with aiomqtt.Client(
                    hostname=MQTT_HOST,
                    port=MQTT_PORT,
                    username=MQTT_USER,
                    password=MQTT_PASS,
                    identifier=MQTT_CLIENT,
                    tls_context=tls,
                    keepalive=30,
                ) as client:
                    self._client = client
                    print("✅ MQTT conectado")

                    await client.subscribe("hospital/cama04/#")
                    print("📡 Suscrito: hospital/cama04/#")

                    # Procesar mensajes + comandos concurrentemente
                    await asyncio.gather(
                        self._recibir(client, ws_manager),
                        self._enviar_comandos(client),
                        return_exceptions=True,
                    )

            except Exception as e:
                print(f"❌ MQTT error: {e}")

            print("🔄 Reconectando MQTT en 5s...")
            await asyncio.sleep(5)

    # ── Recibir mensajes ──────────────────────────────────────
    async def _recibir(self, client, ws_manager):
        async for msg in client.messages:
            topic   = str(msg.topic)
            payload_raw = msg.payload.decode("utf-8", errors="ignore")

            try:
                payload = json.loads(payload_raw)
            except json.JSONDecodeError:
                print(f"⚠️  JSON inválido en {topic}: {payload_raw}")
                continue

            print(f"📨 {topic} → {payload}")

            # Guardar en DB
            lectura = self._guardar_lectura(payload, topic)

            # Detectar alertas
            alertas = self._verificar_alertas(payload)

            # Broadcast WebSocket
            await ws_manager.broadcast({
                "type":    "lectura",
                "data":    lectura.to_dict(),
                "alertas": alertas,
            })

            # Si hay alertas también broadcast por separado
            if alertas:
                await ws_manager.broadcast({
                    "type":    "alertas",
                    "data":    alertas,
                })

    # ── Enviar comandos encolados ─────────────────────────────
    async def _enviar_comandos(self, client):
        while True:
            cmd = await self._cola_comandos.get()
            payload = json.dumps({"cmd": cmd})
            await client.publish(TOPIC_COMANDOS, payload, qos=1)
            print(f"📤 Comando enviado: {cmd}")