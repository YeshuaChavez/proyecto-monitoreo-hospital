"""
telegram_bot.py
- Envía alertas según el estado real del paciente (FC, SpO2, Suero)
- Los botones de bomba SOLO aparecen en alertas de suero
- Link directo al dashboard en Vercel (no JSON)
- Polling para escuchar botones presionados por el médico
"""

import os
import asyncio
import aiohttp

TELEGRAM_TOKEN   = os.environ.get("TELEGRAM_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
BACKEND_URL      = os.environ.get("VITE_API_URL", "https://proyecto-monitoreo-hospital-production.up.railway.app")
DASHBOARD_URL    = "https://proyecto-monitoreo-hospital.vercel.app"
TELEGRAM_URL     = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# Solo estos tipos muestran botones de bomba
TIPOS_CON_BOTONES = {"SUERO_CRITICO", "SUERO_BAJO", "BOMBA_ON"}


# ── Enviar mensaje ─────────────────────────────────────────────
async def enviar_alerta(mensaje: str, tipos_alerta: set = None):
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print("⚠️ Telegram no configurado")
        return

    es_suero = bool(tipos_alerta and tipos_alerta & TIPOS_CON_BOTONES)

    payload_msg = {
        "chat_id":    TELEGRAM_CHAT_ID,
        "text":       mensaje,
        "parse_mode": "HTML",
    }

    if es_suero:
        # Alertas de suero: botones de control + link al dashboard
        payload_msg["reply_markup"] = {
            "inline_keyboard": [
                [
                    {"text": "▶️ ENCENDER BOMBA", "callback_data": "bomba_on"},
                    {"text": "⏹ APAGAR BOMBA",   "callback_data": "bomba_off"},
                ],
                [
                    {"text": "📊 Ver Dashboard", "url": DASHBOARD_URL},
                ]
            ]
        }
    else:
        # Alertas de signos vitales: solo link al dashboard
        payload_msg["reply_markup"] = {
            "inline_keyboard": [[
                {"text": "📊 Ver Dashboard", "url": DASHBOARD_URL},
            ]]
        }

    try:
        async with aiohttp.ClientSession() as session:
            await session.post(f"{TELEGRAM_URL}/sendMessage", json=payload_msg)
            print(f"📱 Telegram enviado {'con botones bomba ✅' if es_suero else 'sin botones'}")
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
                json={"cmd": cmd, "origen": "telegram"},  # ← solo esto cambia
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

                cb = update.get("callback_query")
                if not cb:
                    continue

                cmd     = cb["data"]
                cb_id   = cb["id"]
                usuario = cb["from"].get("first_name", "Médico")

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


# ── Construir mensaje según estado del paciente ───────────────
def construir_mensaje(payload: dict, alertas: list) -> tuple[str | None, set]:
    """
    Genera un mensaje clínico claro según el estado del paciente.
    Retorna (mensaje, tipos_presentes).
    """
    if not alertas:
        return None, set()

    fc    = payload.get("fc",    0)
    spo2  = payload.get("spo2",  0)
    peso  = payload.get("peso",  999)
    bomba = payload.get("bomba", False)

    tipos_presentes = {a.get("tipo", "") for a in alertas}

    # ── Determinar severidad global ───────────────────────────
    es_critico = any(t in tipos_presentes for t in {"SUERO_CRITICO", "SPO2_BAJA"})

    if es_critico:
        encabezado = "🚨 <b>ALERTA CRÍTICA — UCI Cama 04</b>"
    else:
        encabezado = "⚠️ <b>ALERTA — UCI Cama 04</b>"

    lineas = [encabezado, ""]

    # ── Mensaje por tipo de alerta ────────────────────────────

    # SpO2 baja
    if "SPO2_BAJA" in tipos_presentes:
        nivel = "GRAVE" if spo2 < 90 else "BAJO"
        lineas.append(f"🫁 <b>Saturación O₂ {nivel}</b>")
        lineas.append(f"   El paciente presenta SpO2 de <b>{spo2}%</b>")
        lineas.append(f"   Valor normal ≥95% — Se recomienda intervención inmediata.")
        lineas.append("")

    # FC alta → taquicardia
    if "FC_ALTA" in tipos_presentes:
        lineas.append("❤️ <b>Taquicardia detectada</b>")
        lineas.append(f"   El paciente registra <b>{fc} lpm</b>")
        lineas.append(f"   Rango normal: 60–100 lpm — Monitorear evolución.")
        lineas.append("")

    # FC baja → bradicardia
    if "FC_BAJA" in tipos_presentes:
        lineas.append("❤️ <b>Bradicardia detectada</b>")
        lineas.append(f"   El paciente registra <b>{fc} lpm</b>")
        lineas.append(f"   Rango normal: 60–100 lpm — Evaluar estado de consciencia.")
        lineas.append("")

    # Suero crítico
    if "SUERO_CRITICO" in tipos_presentes:
        lineas.append("💉 <b>Suero IV en nivel crítico</b>")
        lineas.append(f"   Nivel actual: <b>{peso:.0f}g</b> — Bomba peristáltica activada.")
        lineas.append(f"   Verificar bolsa de respaldo y conexión del catéter.")
        lineas.append("")

    # Suero bajo (sin llegar a crítico)
    elif "SUERO_BAJO" in tipos_presentes:
        lineas.append("💧 <b>Nivel de suero bajo</b>")
        lineas.append(f"   Nivel actual: <b>{peso:.0f}g</b> — Umbral de alerta: 150g.")
        lineas.append(f"   Preparar bolsa de reemplazo.")
        lineas.append("")

    # Bomba activada automáticamente
    if "BOMBA_ON" in tipos_presentes:
        lineas.append("🔄 <b>Bomba intravenosa activa</b>")
        lineas.append(f"   Recargando suero desde bolsa de respaldo.")
        lineas.append("")

    # ── Estado actual del paciente ────────────────────────────
    lineas.append("📋 <b>Estado del paciente:</b>")
    lineas.append(f"   FC:    <b>{fc if fc > 0 else '--'} lpm</b>")
    lineas.append(f"   SpO2:  <b>{spo2 if spo2 > 0 else '--'}%</b>")
    lineas.append(f"   Suero: <b>{peso:.0f}g</b>")
    lineas.append(f"   Bomba: {'🟡 Activa' if bomba else '🟢 Standby'}")

    return "\n".join(lineas), tipos_presentes