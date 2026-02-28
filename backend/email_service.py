"""
email_service.py
- Envía correo con cuerpo HTML bonito (signos vitales + alertas)
- Adjunta PDF con reporte completo del paciente
"""

import os
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text      import MIMEText
from email.mime.base      import MIMEBase
from email                import encoders
from datetime             import datetime
from io                   import BytesIO

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles    import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units     import inch
    from reportlab.lib           import colors
    from reportlab.platypus      import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False
    print("⚠️ reportlab no instalado — PDF desactivado")

EMAIL_REMITENTE = os.environ.get("EMAIL_REMITENTE", "")
EMAIL_PASSWORD  = os.environ.get("EMAIL_PASSWORD",  "")

# ── Enviar correo SMTP ─────────────────────────────────────────
def _enviar_smtp(destinatario: str, msg: MIMEMultipart):
    if not EMAIL_REMITENTE or not EMAIL_PASSWORD:
        print("⚠️ Email no configurado — faltan EMAIL_REMITENTE o EMAIL_PASSWORD")
        return False
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_REMITENTE, EMAIL_PASSWORD)
            server.sendmail(EMAIL_REMITENTE, destinatario, msg.as_string())
        print(f"📧 Email enviado a {destinatario}")
        return True
    except Exception as e:
        print(f"❌ Error email: {e}")
        return False

# ── Construir HTML del cuerpo del correo ──────────────────────
def _construir_html(payload: dict, alertas: list, hora: str) -> str:
    fc    = payload.get("fc",    0)
    spo2  = payload.get("spo2",  0)
    peso  = payload.get("peso",  0)
    bomba = payload.get("bomba", False)

    color_fc    = "#ef4444" if (fc > 100 or (fc < 60 and fc > 0)) else "#10b981" if fc > 0 else "#6b7280"
    color_spo2  = "#ef4444" if (spo2 > 0 and spo2 < 95) else "#10b981" if spo2 > 0 else "#6b7280"
    color_peso  = "#ef4444" if peso < 100 else "#f59e0b" if peso < 150 else "#10b981"
    color_bomba = "#f59e0b" if bomba else "#10b981"

    estado_fc   = "ALERTA" if (fc > 100 or (fc < 60 and fc > 0)) else "Normal" if fc > 0 else "Sin sensor"
    estado_spo2 = "ALERTA" if (spo2 > 0 and spo2 < 95) else "Normal" if spo2 > 0 else "Sin sensor"
    estado_peso = "CRÍTICO" if peso < 100 else "BAJO" if peso < 150 else "Normal"

    # Filas de alertas (solo si hay)
    bloque_alertas = ""
    if alertas:
        filas = ""
        for a in alertas:
            tipo = a.get("tipo", "")
            mensaje = a.get("mensaje", "")
            emoji = {
                "BOMBA_ON":      "💉",
                "SUERO_CRITICO": "🚨",
                "SUERO_BAJO":    "⚠️",
                "FC_ALTA":       "❤️",
                "FC_BAJA":       "❤️",
                "SPO2_BAJA":     "🫁",
            }.get(tipo, "⚠️")
            filas += f"""
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #1e2d3d;font-size:16px;width:36px">{emoji}</td>
              <td style="padding:10px 12px;border-bottom:1px solid #1e2d3d;color:#e2e8f0;font-size:13px;line-height:1.5">{mensaje}</td>
            </tr>"""

        bloque_alertas = f"""
        <div style="margin-bottom:24px">
          <p style="color:#6b7280;font-size:10px;font-family:monospace;letter-spacing:0.12em;margin:0 0 10px">ALERTAS DETECTADAS</p>
          <div style="background:#0a0f1a;border:1px solid rgba(239,68,68,0.25);border-radius:10px;overflow:hidden">
            <table width="100%" cellpadding="0" cellspacing="0">
              {filas}
            </table>
          </div>
        </div>"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reporte de salud — Monitor IoT UNMSM</title>
</head>
<body style="margin:0;padding:0;background:#070b14;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">

<div style="max-width:620px;margin:0 auto;padding:28px 16px">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,rgba(0,229,255,0.08),rgba(167,139,250,0.08));
              border:1px solid rgba(0,229,255,0.18);border-radius:18px;
              padding:28px;margin-bottom:22px;text-align:center">
    <div style="font-size:40px;margin-bottom:10px">🏥</div>
    <h1 style="color:#00e5ff;font-size:22px;margin:0;font-weight:800;letter-spacing:0.02em">
      Monitor IoT Hospitalario
    </h1>
    <p style="color:#4b5563;font-size:11px;margin:8px 0 0;font-family:monospace;letter-spacing:0.08em">
      UNMSM · FISI · INTERNET DE LAS COSAS · UCI — CAMA 04
    </p>
    <p style="color:#374151;font-size:11px;margin:4px 0 0;font-family:monospace">
      {hora}
    </p>
  </div>

  <!-- PACIENTE -->
  <div style="background:rgba(13,17,28,0.95);border:1px solid rgba(0,229,255,0.12);
              border-radius:14px;padding:18px 20px;margin-bottom:18px;
              border-top:2px solid #00e5ff">
    <p style="color:#00e5ff;font-size:9px;font-family:monospace;letter-spacing:0.14em;margin:0 0 12px">
      DATOS DEL PACIENTE
    </p>
    <div style="display:flex;align-items:center;gap:14px">
      <div style="font-size:34px">👤</div>
      <div>
        <div style="font-size:16px;font-weight:700;color:#f1f5f9">Juan Carlos Rodriguez Gomez</div>
        <div style="font-size:11px;color:#6b7280;margin-top:3px;font-family:monospace">
          ID: PCT-2026-0042 &nbsp;·&nbsp; Cama 04 — UCI &nbsp;·&nbsp; Dr. Paredes Villanueva
        </div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;font-family:monospace">
          Grupo: O+ &nbsp;·&nbsp; Ingreso: 20/02/2026
        </div>
      </div>
    </div>
  </div>

  <!-- SIGNOS VITALES -->
  <div style="margin-bottom:22px">
    <p style="color:#6b7280;font-size:10px;font-family:monospace;letter-spacing:0.12em;margin:0 0 10px">
      SIGNOS VITALES EN TIEMPO REAL
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- FC -->
        <td width="25%" style="padding:4px">
          <div style="background:rgba(13,17,28,0.95);border:1px solid rgba(244,63,94,0.25);
                      border-top:2px solid #f43f5e;border-radius:12px;
                      padding:16px 10px;text-align:center">
            <div style="color:#6b7280;font-size:8px;font-family:monospace;letter-spacing:0.1em;margin-bottom:6px">
              FREC. CARDÍACA
            </div>
            <div style="color:{color_fc};font-size:30px;font-weight:800;font-family:monospace;line-height:1">
              {fc if fc > 0 else "--"}
            </div>
            <div style="color:#4b5563;font-size:9px;margin-top:4px">bpm</div>
            <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:99px;
                        font-size:9px;font-weight:700;font-family:monospace;
                        background:{"rgba(239,68,68,0.15)" if "ALERTA" in estado_fc else "rgba(16,185,129,0.12)"};
                        color:{"#ef4444" if "ALERTA" in estado_fc else "#10b981" if estado_fc == "Normal" else "#6b7280"}">
              {estado_fc}
            </div>
          </div>
        </td>

        <!-- SpO2 -->
        <td width="25%" style="padding:4px">
          <div style="background:rgba(13,17,28,0.95);border:1px solid rgba(0,229,255,0.25);
                      border-top:2px solid #00e5ff;border-radius:12px;
                      padding:16px 10px;text-align:center">
            <div style="color:#6b7280;font-size:8px;font-family:monospace;letter-spacing:0.1em;margin-bottom:6px">
              SATURACIÓN O₂
            </div>
            <div style="color:{color_spo2};font-size:30px;font-weight:800;font-family:monospace;line-height:1">
              {spo2 if spo2 > 0 else "--"}
            </div>
            <div style="color:#4b5563;font-size:9px;margin-top:4px">%</div>
            <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:99px;
                        font-size:9px;font-weight:700;font-family:monospace;
                        background:{"rgba(239,68,68,0.15)" if "ALERTA" in estado_spo2 else "rgba(16,185,129,0.12)"};
                        color:{"#ef4444" if "ALERTA" in estado_spo2 else "#10b981" if estado_spo2 == "Normal" else "#6b7280"}">
              {estado_spo2}
            </div>
          </div>
        </td>

        <!-- Fluido IV -->
        <td width="25%" style="padding:4px">
          <div style="background:rgba(13,17,28,0.95);border:1px solid rgba(167,139,250,0.25);
                      border-top:2px solid #a78bfa;border-radius:12px;
                      padding:16px 10px;text-align:center">
            <div style="color:#6b7280;font-size:8px;font-family:monospace;letter-spacing:0.1em;margin-bottom:6px">
              FLUIDO IV
            </div>
            <div style="color:{color_peso};font-size:30px;font-weight:800;font-family:monospace;line-height:1">
              {peso:.0f}
            </div>
            <div style="color:#4b5563;font-size:9px;margin-top:4px">gramos</div>
            <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:99px;
                        font-size:9px;font-weight:700;font-family:monospace;
                        background:{"rgba(239,68,68,0.15)" if estado_peso == "CRÍTICO" else "rgba(245,158,11,0.15)" if estado_peso == "BAJO" else "rgba(16,185,129,0.12)"};
                        color:{"#ef4444" if estado_peso == "CRÍTICO" else "#f59e0b" if estado_peso == "BAJO" else "#10b981"}">
              {estado_peso}
            </div>
          </div>
        </td>

        <!-- Bomba -->
        <td width="25%" style="padding:4px">
          <div style="background:rgba(13,17,28,0.95);
                      border:1px solid {"rgba(245,158,11,0.25)" if bomba else "rgba(16,185,129,0.2)"};
                      border-top:2px solid {"#f59e0b" if bomba else "#10b981"};
                      border-radius:12px;padding:16px 10px;text-align:center">
            <div style="color:#6b7280;font-size:8px;font-family:monospace;letter-spacing:0.1em;margin-bottom:6px">
              BOMBA IV
            </div>
            <div style="font-size:24px;margin:4px 0">{"⚙️" if bomba else "✅"}</div>
            <div style="color:{color_bomba};font-size:14px;font-weight:800;font-family:monospace">
              {"ON" if bomba else "OFF"}
            </div>
            <div style="margin-top:6px;display:inline-block;padding:2px 8px;border-radius:99px;
                        font-size:9px;font-weight:700;font-family:monospace;
                        background:{"rgba(245,158,11,0.15)" if bomba else "rgba(16,185,129,0.12)"};
                        color:{"#f59e0b" if bomba else "#10b981"}">
              {"Activa" if bomba else "Standby"}
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ALERTAS (si hay) -->
  {bloque_alertas}

  <!-- MENSAJE AL FAMILIAR -->
  <div style="background:rgba(13,17,28,0.95);border:1px solid rgba(167,139,250,0.15);
              border-radius:14px;padding:18px 20px;margin-bottom:22px;
              border-top:2px solid #a78bfa">
    <p style="color:#a78bfa;font-size:9px;font-family:monospace;letter-spacing:0.14em;margin:0 0 12px">
      MENSAJE PARA EL FAMILIAR
    </p>
    <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 10px">
      Estimado familiar,
    </p>
    <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0 0 10px">
      Le informamos sobre el estado de salud del paciente <strong style="color:#e2e8f0">Juan Carlos Rodriguez Gomez</strong>
      (Cama 04 — UCI). Este reporte ha sido generado automáticamente por el
      sistema de monitoreo IoT del Hospital — UNMSM.
    </p>
    <p style="color:#9ca3af;font-size:13px;line-height:1.7;margin:0">
      Si tiene dudas, comuníquese con el personal médico de guardia.
      El reporte detallado en PDF se encuentra adjunto en este correo.
    </p>
  </div>

  <!-- BOTÓN DASHBOARD -->
  <div style="text-align:center;margin-bottom:24px">
    <a href="https://proyecto-monitoreo-hospital-production.up.railway.app"
       style="background:linear-gradient(135deg,#00e5ff,#0284c7);
              color:#000;font-weight:800;font-size:13px;
              padding:13px 36px;border-radius:10px;
              text-decoration:none;display:inline-block;letter-spacing:0.04em">
      🖥️ Ver Dashboard en Tiempo Real
    </a>
  </div>

  <!-- FOOTER -->
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.05);padding-top:18px">
    <p style="color:#1f2937;font-size:10px;font-family:monospace;margin:0;letter-spacing:0.06em">
      UNMSM · FISI · INTERNET DE LAS COSAS · 2026
    </p>
    <p style="color:#1f2937;font-size:10px;font-family:monospace;margin:4px 0 0">
      ESP32 + MAX30102 + HX711 + BOMBA PERISTÁLTICA
    </p>
  </div>

</div>
</body>
</html>"""


# ── Generar PDF adjunto ────────────────────────────────────────
def _generar_pdf(payload: dict, alertas: list) -> bytes | None:
    if not REPORTLAB_OK:
        return None

    buffer = BytesIO()
    doc    = SimpleDocTemplate(buffer, pagesize=letter,
                               topMargin=0.75*inch, bottomMargin=0.75*inch,
                               leftMargin=0.75*inch, rightMargin=0.75*inch)

    azul   = colors.HexColor("#0284c7")
    rojo   = colors.HexColor("#ef4444")
    gris   = colors.HexColor("#6b7280")
    oscuro = colors.HexColor("#0f172a")
    blanco = colors.white

    titulo_style = ParagraphStyle("titulo",
        fontSize=18, textColor=azul, fontName="Helvetica-Bold",
        spaceAfter=4, alignment=1)
    sub_style = ParagraphStyle("sub",
        fontSize=10, textColor=gris, fontName="Helvetica",
        spaceAfter=2, alignment=1)
    body_style = ParagraphStyle("body",
        fontSize=11, textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica", spaceAfter=4)
    alerta_style = ParagraphStyle("alerta",
        fontSize=10, textColor=rojo,
        fontName="Helvetica-Bold", spaceAfter=4)

    fc    = payload.get("fc",    0)
    spo2  = payload.get("spo2",  0)
    peso  = payload.get("peso",  0)
    bomba = payload.get("bomba", False)
    hora  = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    elementos = []

    elementos.append(Paragraph("Monitor IoT Hospitalario", titulo_style))
    elementos.append(Paragraph("UNMSM · Facultad de Ingeniería de Sistemas · UCI", sub_style))
    elementos.append(Paragraph(f"Reporte generado: {hora}", sub_style))
    elementos.append(Spacer(1, 0.3*inch))

    datos_paciente = [
        ["DATOS DEL PACIENTE", ""],
        ["Nombre completo",  "Juan Carlos Rodriguez Gomez"],
        ["ID Paciente",      "PCT-2026-0042"],
        ["Cama",             "04 — UCI"],
        ["Doctor asignado",  "Dr. Paredes Villanueva"],
        ["Grupo sanguíneo",  "O+"],
        ["Fecha de ingreso", "20/02/2026"],
        ["Contacto familiar","María Vilchez (Esposa) · 987 654 321"],
    ]
    tabla_paciente = Table(datos_paciente, colWidths=[2.5*inch, 4*inch])
    tabla_paciente.setStyle(TableStyle([
        ("BACKGROUND",     (0,0), (-1,0), oscuro),
        ("TEXTCOLOR",      (0,0), (-1,0), blanco),
        ("FONTNAME",       (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",       (0,0), (-1,0), 10),
        ("SPAN",           (0,0), (-1,0)),
        ("ALIGN",          (0,0), (-1,0), "CENTER"),
        ("FONTNAME",       (0,1), (0,-1), "Helvetica-Bold"),
        ("FONTSIZE",       (0,1), (-1,-1), 10),
        ("TEXTCOLOR",      (0,1), (0,-1), colors.HexColor("#334155")),
        ("TEXTCOLOR",      (1,1), (1,-1), colors.HexColor("#1e293b")),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f8fafc"), colors.white]),
        ("GRID",           (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING",        (0,0), (-1,-1), 8),
    ]))
    elementos.append(tabla_paciente)
    elementos.append(Spacer(1, 0.25*inch))

    datos_vitales = [
        ["SIGNO VITAL",    "VALOR",                         "UNIDAD", "ESTADO"],
        ["Frec. Cardíaca", str(fc)   if fc   > 0 else "--", "bpm",    "Normal" if 60 <= fc <= 100 else "ALERTA"],
        ["Saturación O2",  str(spo2) if spo2 > 0 else "--", "%",      "Normal" if spo2 >= 95 else "ALERTA"],
        ["Fluido IV",      f"{peso:.1f}",                   "g",      "Normal" if peso >= 150 else "CRITICO" if peso < 100 else "BAJO"],
        ["Bomba IV",       "ACTIVA" if bomba else "STANDBY","--",     "En operacion" if bomba else "En espera"],
    ]
    tabla_vitales = Table(datos_vitales, colWidths=[2*inch, 1.5*inch, 1*inch, 2*inch])
    tabla_vitales.setStyle(TableStyle([
        ("BACKGROUND",     (0,0), (-1,0), azul),
        ("TEXTCOLOR",      (0,0), (-1,0), blanco),
        ("FONTNAME",       (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",       (0,0), (-1,0), 10),
        ("ALIGN",          (0,0), (-1,-1), "CENTER"),
        ("FONTNAME",       (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE",       (0,1), (-1,-1), 10),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#f0f9ff"), colors.white]),
        ("GRID",           (0,0), (-1,-1), 0.5, colors.HexColor("#bae6fd")),
        ("PADDING",        (0,0), (-1,-1), 8),
    ]))
    elementos.append(tabla_vitales)
    elementos.append(Spacer(1, 0.25*inch))

    if alertas:
        elementos.append(Paragraph("ALERTAS DETECTADAS", ParagraphStyle(
            "alerta_titulo", fontSize=12, textColor=rojo,
            fontName="Helvetica-Bold", spaceAfter=8)))
        for a in alertas:
            elementos.append(Paragraph(f"• {a.get('mensaje', '')}", alerta_style))
        elementos.append(Spacer(1, 0.2*inch))

    elementos.append(Paragraph("Estimado familiar:", body_style))
    elementos.append(Paragraph(
        "El presente reporte ha sido generado automaticamente por el sistema de monitoreo "
        "IoT del Hospital — UNMSM. Si tiene dudas sobre el estado del paciente, "
        "comuniquese con el personal medico de guardia.",
        body_style))
    elementos.append(Spacer(1, 0.15*inch))
    elementos.append(Paragraph(
        "Para ver el estado en tiempo real acceda al dashboard del sistema: "
        "https://proyecto-monitoreo-hospital-production.up.railway.app",
        body_style))
    elementos.append(Spacer(1, 0.3*inch))
    elementos.append(Paragraph(
        "UNMSM · FISI · Internet de las Cosas · 2026 · ESP32 + MAX30102 + HX711",
        ParagraphStyle("footer", fontSize=8, textColor=gris,
                       fontName="Helvetica", alignment=1)))

    doc.build(elementos)
    return buffer.getvalue()


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN PRINCIPAL — llamada desde dashboard y mqtt_client
# ══════════════════════════════════════════════════════════════
async def enviar_email_familiar(payload: dict, alertas: list, destinatario: str = ""):
    email_destino = destinatario
    if not email_destino:
        print("⚠️ Sin destinatario de email")
        return

    hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    msg = MIMEMultipart("mixed")
    msg["Subject"] = f"Reporte de salud — Juan Carlos Rodriguez Gomez · {hora[:16]}"
    msg["From"]    = f"Monitor Hospital UNMSM <{EMAIL_REMITENTE}>"
    msg["To"]      = email_destino

    # 1. Cuerpo HTML
    html = _construir_html(payload, alertas, hora)
    msg.attach(MIMEText(html, "html", "utf-8"))

    # 2. PDF adjunto
    pdf_bytes = _generar_pdf(payload, alertas)
    if pdf_bytes:
        adjunto = MIMEBase("application", "octet-stream")
        adjunto.set_payload(pdf_bytes)
        encoders.encode_base64(adjunto)
        nombre_pdf = f"reporte_paciente_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        adjunto.add_header("Content-Disposition", f"attachment; filename={nombre_pdf}")
        msg.attach(adjunto)
        print(f"📎 PDF adjunto: {nombre_pdf}")
    else:
        print("⚠️ PDF no generado — reportlab no disponible")

    # 3. Enviar
    await asyncio.get_event_loop().run_in_executor(
        None, _enviar_smtp, email_destino, msg
    )