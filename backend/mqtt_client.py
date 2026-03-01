"""
MQTTManager — Posta Médica / Consultorio General
  - posta/consultorio/lecturas  → peso + bomba + estado_suero  (cada 1s)  → tabla suero
  - posta/consultorio/vitales   → fc + spo2 + estado_vitales   (cada 10s) → tabla vitales
  - posta/consultorio/comandos  → publica comandos al ESP32
"""

import asyncio
import json
import os
import ssl
from datetime import datetime, timedelta

import aiomqtt

from database import SessionLocal
from models import Suero, Vitales, Alerta
from telegram_bot import enviar_alerta, construir_mensaje

# ── Credenciales HiveMQ ───────────────────────────────────────
MQTT_HOST   = os.environ.get("MQTT_HOST",   "fd3a3baad98a46c3a2a0caabe973c4b3.s1.eu.hivemq.cloud")
MQTT_PORT   = int(os.environ.get("MQTT_PORT", "8883"))
MQTT_USER   = os.environ.get("MQTT_USER",   "esp32_cama04")
MQTT_PASS   = os.environ.get("MQTT_PASS",   "Hospital123")
MQTT_CLIENT = os.environ.get("MQTT_CLIENT", "FastAPI_Backend")

TOPIC_LECTURAS = "posta/consultorio/lecturas"
TOPIC_VITALES  = "posta/consultorio/vitales"
TOPIC_COMANDOS = "posta/consultorio/comandos"

# ── Umbrales alertas ──────────────────────────────────────────
UMBRAL_FC_ALTA       = 100
UMBRAL_FC_BAJA       = 60
UMBRAL_SPO2          = 95
UMBRAL_SUERO_ALERTA  = 150.0
UMBRAL_SUERO_CRITICO = 100.0

# ── Anti-spam Telegram ────────────────────────────────────────
INTERVALO_TELEGRAM = 15


class MQTTManager:
    def __init__(self):
        self._client          = None
        self._cola_comandos   = asyncio.Queue()
        self._ultimo_telegram = datetime.min

        self._ultimo_suero: dict = {
            "peso":         999.0,
            "bomba":        False,
            "estado_suero": "NORMAL",
        }
        self._ultimos_vitales: dict = {
            "fc":             0,
            "spo2":           0,
            "estado_vitales": "MIDIENDO",
        }

    # ── Guardar en tabla suero ────────────────────────────────
    def _guardar_suero(self, peso: float, bomba: bool, estado_suero: str) -> Suero:
        db = SessionLocal()
        try:
            registro = Suero(
                timestamp    = datetime.utcnow() - timedelta(hours=5),
                peso         = peso,
                bomba        = bomba,
                estado_suero = estado_suero,
            )
            db.add(registro)
            db.commit()
            db.refresh(registro)
            return registro
        finally:
            db.close()

    # ── Guardar en tabla vitales ──────────────────────────────
    def _guardar_vitales(self, fc: int, spo2: int, estado_vitales: str) -> Vitales:
        db = SessionLocal()
        try:
            registro = Vitales(
                timestamp      = datetime.utcnow() - timedelta(hours=5),
                fc             = fc,
                spo2           = spo2,
                estado_vitales = estado_vitales,
            )
            db.add(registro)
            db.commit()
            db.refresh(registro)
            return registro
        finally:
            db.close()

    # ── Alertas de suero ──────────────────────────────────────
    def _alertas_suero(self, peso: float, bomba: bool) -> list:
        db = SessionLocal()
        try:
            alertas = []
            if peso <= UMBRAL_SUERO_CRITICO:
                alertas.append(Alerta(
                    tipo    = "SUERO_CRITICO",
                    mensaje = f"Nivel crítico de suero: {peso:.1f}g — bomba activada",
                    valor   = peso,
                ))
            elif peso <= UMBRAL_SUERO_ALERTA:
                alertas.append(Alerta(
                    tipo    = "SUERO_BAJO",
                    mensaje = f"Nivel bajo de suero: {peso:.1f}g",
                    valor   = peso,
                ))
            if bomba:
                alertas.append(Alerta(
                    tipo    = "BOMBA_ON",
                    mensaje = "Bomba peristáltica activada — recargando suero",
                    valor   = None,
                ))
            for a in alertas:
                db.add(a)
            if alertas:
                db.commit()
            return [a.to_dict() for a in alertas]
        finally:
            db.close()

    # ── Alertas de vitales ────────────────────────────────────
    def _alertas_vitales(self, fc: int, spo2: int) -> list:
        db = SessionLocal()
        try:
            alertas = []
            if fc and fc > UMBRAL_FC_ALTA:
                alertas.append(Alerta(
                    tipo    = "FC_ALTA",
                    mensaje = f"Taquicardia: {fc} bpm (normal: 60-100)",
                    valor   = fc,
                ))
            elif fc and 0 < fc < UMBRAL_FC_BAJA:
                alertas.append(Alerta(
                    tipo    = "FC_BAJA",
                    mensaje = f"Bradicardia: {fc} bpm (normal: 60-100)",
                    valor   = fc,
                ))
            if spo2 and 0 < spo2 < UMBRAL_SPO2:
                alertas.append(Alerta(
                    tipo    = "SPO2_BAJA",
                    mensaje = f"Saturación O₂ baja: {spo2}% (normal: ≥95%)",
                    valor   = spo2,
                ))
            for a in alertas:
                db.add(a)
            if alertas:
                db.commit()
            return [a.to_dict() for a in alertas]
        finally:
            db.close()

    # ── Telegram anti-spam ────────────────────────────────────
    async def _enviar_telegram_si_aplica(self, payload_completo: dict, alertas: list):
        if not alertas:
            return
        ahora = datetime.utcnow()
        if (ahora - self._ultimo_telegram).total_seconds() < INTERVALO_TELEGRAM:
            restante = int(INTERVALO_TELEGRAM - (ahora - self._ultimo_telegram).total_seconds())
            print(f"📱 Telegram anti-spam ({restante}s restantes)")
            return
        mensaje, tipos = construir_mensaje(payload_completo, alertas)
        if mensaje:
            await enviar_alerta(mensaje, tipos)
            self._ultimo_telegram = ahora
            print("📱 Notificación Telegram enviada")

    # ── Handler: lecturas → tabla suero ──────────────────────
    async def _procesar_lecturas(self, payload: dict, ws_manager):
        peso         = payload.get("peso",   999.0)
        bomba        = payload.get("bomba",  False)
        estado_suero = payload.get("estado", "NORMAL")

        self._ultimo_suero = {
            "peso":         peso,
            "bomba":        bomba,
            "estado_suero": estado_suero,
        }

        registro = self._guardar_suero(peso, bomba, estado_suero)
        payload_completo = {**self._ultimo_suero, **self._ultimos_vitales}

        await ws_manager.broadcast({
            "type":   "lectura",
            "data":   registro.to_dict(),
            "estado": payload_completo,
        })

        alertas = self._alertas_suero(peso, bomba)
        if alertas:
            await ws_manager.broadcast({"type": "alertas", "data": alertas})
            await self._enviar_telegram_si_aplica(payload_completo, alertas)

    # ── Handler: vitales → tabla vitales ─────────────────────
    async def _procesar_vitales(self, payload: dict, ws_manager):
        fc             = payload.get("fc",     0)
        spo2           = payload.get("spo2",   0)
        estado_vitales = payload.get("estado", "NORMAL")

        self._ultimos_vitales = {
            "fc":             fc,
            "spo2":           spo2,
            "estado_vitales": estado_vitales,
        }

        registro = self._guardar_vitales(fc, spo2, estado_vitales)
        payload_completo = {**self._ultimo_suero, **self._ultimos_vitales}

        await ws_manager.broadcast({
            "type":   "vitales",
            "data":   registro.to_dict(),
            "estado": payload_completo,
        })

        alertas = self._alertas_vitales(fc, spo2)
        if alertas:
            await ws_manager.broadcast({"type": "alertas", "data": alertas})
            await self._enviar_telegram_si_aplica(payload_completo, alertas)

    # ── Publicar comando al ESP32 ─────────────────────────────
    async def publicar_comando(self, cmd: str):
        await self._cola_comandos.put(cmd)

    # ── Loop principal MQTT ───────────────────────────────────
    async def start(self, ws_manager):
        while True:
            try:
                print(f"Conectando MQTT → {MQTT_HOST}:{MQTT_PORT}")
                tls = ssl.create_default_context()

                async with aiomqtt.Client(
                    hostname   = MQTT_HOST,
                    port       = MQTT_PORT,
                    username   = MQTT_USER,
                    password   = MQTT_PASS,
                    identifier = MQTT_CLIENT,
                    tls_context= tls,
                    keepalive  = 30,
                ) as client:
                    self._client = client
                    print("✅ MQTT conectado")
                    await client.subscribe("posta/consultorio/#")
                    print("📡 Suscrito: posta/consultorio/#")

                    await asyncio.gather(
                        self._recibir(client, ws_manager),
                        self._enviar_comandos(client),
                        return_exceptions=True,
                    )

            except Exception as e:
                print(f"❌ MQTT error: {e}")

            print("🔄 Reconectando MQTT en 5s...")
            await asyncio.sleep(5)

    # ── Recibir y rutear por topic ────────────────────────────
    async def _recibir(self, client, ws_manager):
        async for msg in client.messages:
            topic       = str(msg.topic)
            payload_raw = msg.payload.decode("utf-8", errors="ignore")

            try:
                payload = json.loads(payload_raw)
            except json.JSONDecodeError:
                print(f"⚠️ JSON inválido en {topic}: {payload_raw}")
                continue

            print(f"📨 {topic} → {payload}")

            if topic == TOPIC_LECTURAS:
                await self._procesar_lecturas(payload, ws_manager)
            elif topic == TOPIC_VITALES:
                await self._procesar_vitales(payload, ws_manager)

    # ── Enviar comandos encolados ─────────────────────────────
    async def _enviar_comandos(self, client):
        while True:
            cmd = await self._cola_comandos.get()
            await client.publish(TOPIC_COMANDOS, json.dumps({"cmd": cmd}), qos=1)
            print(f"📤 Comando enviado: {cmd}")