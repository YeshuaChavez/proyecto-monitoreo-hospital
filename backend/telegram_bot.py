"""
telegram_bot.py
- Envía alertas con botones inline para controlar la bomba
- Polling para escuchar cuando el médico presiona un botón
- Llama al backend para enviar comando MQTT al ESP32
"""

import os
import asyncio
import aiohttp

TELEGRAM_TOKEN   = os.environ.get("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
BACKEND_URL      = os.environ.get("VITE_API_URL", "https://proyecto-monitoreo-hospital-production.up.railway.app")

TELEGRAM_URL     = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# ── Enviar mensaje con botones inline ─────────────────────────
async def enviar_alerta(mensaje: str):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ Telegram no configurado")
        return
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(f"{TELEGRAM_URL}/sendMessage", json={
                "chat_id":    TELEGRAM_CHAT_ID,
                "text":       mensaje,
                "parse_mode": "HTML",
                "reply_markup": {
                    "inline_keyboard": [[
                        {"text": "▶️ ENCENDER BOMBA", "callback_data": "bomba_on"},
                        {"text": "⏹ APAGAR BOMBA",   "callback_data": "bomba_off"},
                    ]]
                }
            })
            print("📱 Mensaje Telegram enviado con botones")
    except Exception as e:
        print(f"❌ Error Telegram enviar: {e}")


# ── Responder al callback (cuando presionan un botón) ─────────
async def responder_callback(callback_query_id: str, texto: str):
    try:
        async with aiohttp.ClientSession() as session:
            await session.post(f"{TELEGRAM_URL}/answerCallbackQuery", json={
                "callback_query_id": callback_query_id,
                "text":              texto,
                "show_alert":        False,
            })
    except Exception as e:
        print(f"❌ Error Telegram callback: {e}")


# ── Enviar comando al backend → MQTT → ESP32 ──────────────────
async def ejecutar_comando(cmd: str):
    try:
        async with aiohttp.ClientSession() as session:
            res = await session.post(
                f"{BACKEND_URL}/comandos",
                json={"cmd": cmd},
                headers={"Content-Type": "application/json"},
            )
            data = await res.json()
            print(f"📤 Comando {cmd} enviado → {data}")
            return True
    except Exception as e:
        print(f"❌ Error enviando comando: {e}")
        return False


# ── Polling — escucha botones presionados ─────────────────────
async def polling():
    """
    Corre en background infinitamente.
    Escucha los callback_query (botones) que manda Telegram.
    """
    if not TELEGRAM_TOKEN:
        print("⚠️ Telegram polling desactivado — sin token")
        return

    offset = 0
    print("🤖 Telegram polling iniciado")

    while True:
        try:
            async with aiohttp.ClientSession() as session:
                res = await session.get(
                    f"{TELEGRAM_URL}/getUpdates",
                    params={"offset": offset, "timeout": 30},
                    timeout=aiohttp.ClientTimeout(total=35),
                )
                data = await res.json()

            for update in data.get("result", []):
                offset = update["update_id"] + 1

                # Solo procesar callback_query (botones)
                cb = update.get("callback_query")
                if not cb:
                    continue

                cmd        = cb["data"]           # "bomba_on" o "bomba_off"
                cb_id      = cb["id"]
                usuario    = cb["from"].get("first_name", "Médico")

                print(f"🎛️ Botón presionado: {cmd} por {usuario}")

                if cmd == "bomba_on":
                    ok = await ejecutar_comando("bomba_on")
                    texto = "✅ Bomba ENCENDIDA" if ok else "❌ Error al encender"

                elif cmd == "bomba_off":
                    ok = await ejecutar_comando("bomba_off")
                    texto = "✅ Bomba APAGADA" if ok else "❌ Error al apagar"

                else:
                    texto = "⚠️ Comando desconocido"

                await responder_callback(cb_id, texto)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"❌ Polling error: {e}")
            await asyncio.sleep(5)


# ── Construir mensaje de alerta ───────────────────────────────
def construir_mensaje(payload: dict, alertas: list) -> str | None:
    if not alertas:
        return None

    fc    = payload.get("fc",    0)
    spo2  = payload.get("spo2",  0)
    peso  = payload.get("peso",  999)
    bomba = payload.get("bomba", False)

    lineas = ["🏥 <b>ALERTA — Monitor UCI Cama 04</b>", ""]

    for alerta in alertas:
        tipo = alerta.get("tipo", "")

        if tipo == "BOMBA_ON":
            lineas.append("💉 <b>BOMBA INTRAVENOSA ACTIVADA</b>")
            lineas.append(f"   Nivel de suero crítico: <b>{peso:.1f}g</b>")

        elif tipo == "SUERO_CRITICO":
            lineas.append("🚨 <b>SUERO EN NIVEL CRÍTICO</b>")
            lineas.append(f"   Nivel actual: <b>{peso:.1f}g</b> (umbral: 100g)")

        elif tipo == "SUERO_BAJO":
            lineas.append("⚠️ <b>SUERO BAJO</b>")
            lineas.append(f"   Nivel actual: <b>{peso:.1f}g</b> (umbral alerta: 150g)")

        elif tipo == "FC_ALTA":
            lineas.append("❤️ <b>TAQUICARDIA DETECTADA</b>")
            lineas.append(f"   Frecuencia cardíaca: <b>{fc} bpm</b> (normal: 60–100)")

        elif tipo == "FC_BAJA":
            lineas.append("❤️ <b>BRADICARDIA DETECTADA</b>")
            lineas.append(f"   Frecuencia cardíaca: <b>{fc} bpm</b> (normal: 60–100)")

        elif tipo == "SPO2_BAJA":
            lineas.append("🫁 <b>SATURACIÓN O₂ BAJA</b>")
            lineas.append(f"   SpO2: <b>{spo2}%</b> (normal: ≥95%)")

    if len(lineas) <= 2:
        return None

    lineas.append("")
    lineas.append("📊 <b>Estado actual:</b>")
    lineas.append(f"   FC:    {fc if fc > 0 else '--'} bpm")
    lineas.append(f"   SpO2:  {spo2 if spo2 > 0 else '--'}%")
    lineas.append(f"   Suero: {peso:.1f}g")
    lineas.append(f"   Bomba: {'🟡 ACTIVA' if bomba else '🟢 STANDBY'}")
    lineas.append("")
    lineas.append("🔗 <a href='https://proyecto-monitoreo-hospital-production.up.railway.app'>Ver dashboard</a>")

    return "\n".join(lineas)