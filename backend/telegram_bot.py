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
BACKEND_URL   = os.environ.get("BACKEND_URL", "https://proyecto-monitoreo-posta-medica-production.up.railway.app")
DASHBOARD_URL = "https://proyecto-monitoreo-posta-medica.vercel.app"
TELEGRAM_URL  = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

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


# ── Responder al callback ──────────────────────────────────────
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


# ── Enviar comando al backend ──────────────────────────────────
async def ejecutar_comando(cmd: str):
    try:
        async with aiohttp.ClientSession() as session:
            res = await session.post(
                f"{BACKEND_URL}/comandos",
                json={"cmd": cmd, "origen": "telegram"},
                headers={"Content-Type": "application/json"},
            )
            data = await res.json()
            print(f"📤 Comando {cmd} enviado → {data}")
            return True
    except Exception as e:
        print(f"❌ Error enviando comando: {e}")
        return False


# ── Polling ────────────────────────────────────────────────────
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


# ── Construir mensaje ──────────────────────────────────────────
def construir_mensaje(payload: dict, alertas: list, paciente: dict | None = None) -> tuple[str | None, set]:
    if not alertas:
        return None, set()

    fc    = payload.get("fc",    0)
    spo2  = payload.get("spo2",  0)
    peso  = payload.get("peso",  999)
    bomba = payload.get("bomba", False)

    tipos_presentes = {a.get("tipo", "") for a in alertas}

    es_critico = any(t in tipos_presentes for t in {"SUERO_CRITICO", "SPO2_BAJA"})

    nombre_paciente = f"{paciente['nombre']} {paciente['apellido']}" if paciente else "Paciente"
    codigo_paciente = paciente.get("codigo") or f"PCT-{paciente.get('id','?')}" if paciente else "—"

    encabezado = "🚨 <b>ALERTA CRÍTICA</b>" if es_critico else "⚠️ <b>ALERTA</b>"

    lineas = [
        encabezado,
        f"👤 <b>{nombre_paciente}</b> · <code>{codigo_paciente}</code>",
        "",
    ]

    if "SPO2_BAJA" in tipos_presentes:
        nivel = "GRAVE" if spo2 < 90 else "BAJO"
        lineas += [
            f"🫁 <b>Saturación O₂ {nivel}</b>",
            f"   SpO2 actual: <b>{spo2}%</b> (normal ≥95%)",
            f"   Se recomienda intervención inmediata.",
            "",
        ]

    if "FC_ALTA" in tipos_presentes:
        lineas += [
            "❤️ <b>Taquicardia detectada</b>",
            f"   FC actual: <b>{fc} lpm</b> (normal 60–100)",
            f"   Monitorear evolución.",
            "",
        ]

    if "FC_BAJA" in tipos_presentes:
        lineas += [
            "❤️ <b>Bradicardia detectada</b>",
            f"   FC actual: <b>{fc} lpm</b> (normal 60–100)",
            f"   Evaluar estado de consciencia.",
            "",
        ]

    if "SUERO_CRITICO" in tipos_presentes:
        lineas += [
            "💉 <b>Suero IV en nivel CRÍTICO</b>",
            f"   Nivel actual: <b>{peso:.0f} ml</b> — Bomba activada automáticamente.",
            f"   Verificar bolsa de respaldo y conexión del catéter.",
            "",
        ]
    elif "SUERO_BAJO" in tipos_presentes:
        lineas += [
            "💧 <b>Nivel de suero bajo</b>",
            f"   Nivel actual: <b>{peso:.0f} ml</b>",
            f"   Preparar bolsa de reemplazo.",
            "",
        ]

    if "BOMBA_ON" in tipos_presentes:
        lineas += [
            "🔄 <b>Bomba peristáltica activa</b>",
            f"   Recargando suero desde bolsa de respaldo.",
            "",
        ]

    # Estado resumen al final
    lineas += [
        "📋 <b>Estado del paciente:</b>",
        f"   FC:    <b>{fc if fc > 0 else '--'} lpm</b>",
        f"   SpO2:  <b>{spo2 if spo2 > 0 else '--'}%</b>",
        f"   Suero: <b>{peso:.0f} ml</b>",
        f"   Bomba: {'🟡 Activa' if bomba else '🟢 Standby'}",
    ]

    return "\n".join(lineas), tipos_presentes