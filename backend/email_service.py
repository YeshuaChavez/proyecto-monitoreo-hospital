"""
email_service.py
- Envía correo con HTML bonito (signos vitales + alertas)
- Adjunta PDF con reporte completo
- Usa Resend API (HTTP) — funciona en Railway gratuito
  Plan gratuito Resend: 3,000 emails/mes, 100/día
"""

import os
import asyncio
from datetime import datetime
from io import BytesIO

import resend

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles    import ParagraphStyle
    from reportlab.lib.units     import inch
    from reportlab.lib           import colors
    from reportlab.platypus      import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    REPORTLAB_OK = True
except ImportError:
    REPORTLAB_OK = False
    print("⚠️ reportlab no instalado — PDF desactivado")

RESEND_API_KEY  = os.environ.get("RESEND_API_KEY",  "")
EMAIL_REMITENTE = os.environ.get("EMAIL_REMITENTE", "onboarding@resend.dev")

# ══════════════════════════════════════════════════════════════
#  HTML
# ══════════════════════════════════════════════════════════════
def _construir_html(payload: dict, alertas: list, hora: str) -> str:
    fc    = payload.get("fc",    0)
    spo2  = payload.get("spo2",  0)
    peso  = payload.get("peso",  0)
    bomba = payload.get("bomba", False)

    color_fc   = "#ef4444" if (fc > 100 or (fc < 60 and fc > 0)) else "#10b981" if fc > 0 else "#6b7280"
    color_spo2 = "#ef4444" if (spo2 > 0 and spo2 < 95)           else "#10b981" if spo2 > 0 else "#6b7280"
    color_peso = "#ef4444" if peso < 100 else "#f59e0b" if peso < 150 else "#10b981"

    estado_fc   = "ALERTA" if (fc > 100 or (fc < 60 and fc > 0)) else "Normal" if fc > 0 else "Sin sensor"
    estado_spo2 = "ALERTA" if (spo2 > 0 and spo2 < 95)           else "Normal" if spo2 > 0 else "Sin sensor"
    estado_peso = "CRÍTICO" if peso < 100 else "BAJO" if peso < 150 else "Normal"

    bg_fc   = "rgba(239,68,68,0.15)"   if "ALERTA" in estado_fc   else "rgba(16,185,129,0.12)"
    bg_spo2 = "rgba(239,68,68,0.15)"   if "ALERTA" in estado_spo2 else "rgba(16,185,129,0.12)"
    bg_peso = "rgba(239,68,68,0.15)"   if estado_peso == "CRÍTICO" else "rgba(245,158,11,0.15)" if estado_peso == "BAJO" else "rgba(16,185,129,0.12)"
    txt_peso = "#ef4444" if estado_peso == "CRÍTICO" else "#f59e0b" if estado_peso == "BAJO" else "#10b981"

    bloque_alertas = ""
    if alertas:
        filas = ""
        for a in alertas:
            tipo    = a.get("tipo", "")
            mensaje = a.get("mensaje", "")
            em      = {"BOMBA_ON":"💉","SUERO_CRITICO":"🚨","SUERO_BAJO":"⚠️","FC_ALTA":"❤️","FC_BAJA":"❤️","SPO2_BAJA":"🫁"}.get(tipo, "⚠️")
            es_crit = tipo in ("SUERO_CRITICO","FC_ALTA","FC_BAJA","SPO2_BAJA")
            color_a = "#ef4444" if es_crit else "#f59e0b"
            filas += f"""
            <tr>
              <td style="padding:12px 14px;border-bottom:1px solid #1a2235;font-size:18px;width:40px;vertical-align:middle">{em}</td>
              <td style="padding:12px 14px;border-bottom:1px solid #1a2235;vertical-align:middle">
                <span style="color:{color_a};font-size:12px;font-weight:700;font-family:monospace">{tipo.replace('_',' ')}</span><br>
                <span style="color:#cbd5e1;font-size:12px">{mensaje}</span>
              </td>
            </tr>"""
        bloque_alertas = f"""
        <div style="margin-bottom:28px">
          <p style="color:#94a3b8;font-size:10px;font-family:monospace;letter-spacing:0.14em;margin:0 0 10px;text-transform:uppercase">⚡ Alertas Detectadas</p>
          <div style="background:#0a1020;border:1px solid rgba(239,68,68,0.3);border-left:3px solid #ef4444;border-radius:12px;overflow:hidden">
            <table width="100%" cellpadding="0" cellspacing="0">{filas}</table>
          </div>
        </div>"""

    bomba_badge = f"""<span style="background:rgba(245,158,11,0.15);color:#f59e0b;
        padding:3px 10px;border-radius:99px;font-size:9px;font-weight:700;font-family:monospace">
        ⚙️ BOMBA ACTIVA</span>""" if bomba else f"""<span style="background:rgba(16,185,129,0.12);color:#10b981;
        padding:3px 10px;border-radius:99px;font-size:9px;font-weight:700;font-family:monospace">
        ✅ BOMBA EN STANDBY</span>"""

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reporte Monitor IoT — Posta Médica</title>
</head>
<body style="margin:0;padding:0;background:#060a12;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0">
<div style="max-width:640px;margin:0 auto;padding:32px 16px">

  <!-- HEADER -->
  <div style="background:linear-gradient(135deg,#0d1628 0%,#111827 50%,#0d1628 100%);
              border:1px solid rgba(0,229,255,0.2);border-radius:20px;
              padding:32px 28px;margin-bottom:20px;text-align:center;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:2px;
                background:linear-gradient(90deg,transparent,#00e5ff,#a78bfa,transparent)"></div>
    <div style="font-size:48px;margin-bottom:12px">🏥</div>
    <h1 style="color:#f1f5f9;font-size:24px;margin:0 0 6px;font-weight:800;letter-spacing:-0.3px">
      Monitor IoT — Posta Médica
    </h1>
    <p style="color:#00e5ff;font-size:11px;margin:0 0 4px;font-family:monospace;letter-spacing:0.1em">
      UNMSM · FISI · CONSULTORIO GENERAL
    </p>
    <p style="color:#374151;font-size:11px;margin:8px 0 0;font-family:monospace">{hora}</p>
  </div>

  <!-- DATOS PACIENTE -->
  <div style="background:#0d1628;border:1px solid rgba(0,229,255,0.15);border-radius:14px;
              padding:18px 22px;margin-bottom:20px;border-top:2px solid #00e5ff">
    <p style="color:#00e5ff;font-size:9px;font-family:monospace;letter-spacing:0.16em;margin:0 0 12px">
      👤 DATOS DEL PACIENTE
    </p>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
      <div>
        <div style="font-size:17px;font-weight:800;color:#f1f5f9">Juan Carlos Rodriguez Gomez</div>
        <div style="font-size:11px;color:#6b7280;margin-top:4px;font-family:monospace">
          ID: PCT-2026-0042 &nbsp;·&nbsp; Consultorio General
        </div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;font-family:monospace">
          Dr. Paredes Villanueva &nbsp;·&nbsp; Posta Médica
        </div>
      </div>
      <div style="text-align:right">
        {bomba_badge}
      </div>
    </div>
  </div>

  <!-- SIGNOS VITALES -->
  <p style="color:#94a3b8;font-size:10px;font-family:monospace;letter-spacing:0.14em;margin:0 0 12px;text-transform:uppercase">
    📊 Signos Vitales
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-collapse:separate;border-spacing:8px">
    <tr>
      <!-- FC -->
      <td width="33%" style="vertical-align:top">
        <div style="background:#0d1628;border:1px solid rgba(244,63,94,0.25);border-top:2px solid #f43f5e;
                    border-radius:14px;padding:18px 12px;text-align:center">
          <div style="color:#6b7280;font-size:8px;font-family:monospace;letter-spacing:0.1em;margin-bottom:8px">FREC. CARDÍACA</div>
          <div style="color:{color_fc};font-size:34px;font-weight:800;font-family:monospace;line-height:1">
            {fc if fc > 0 else "—"}
          </div>
          <div style="color:#4b5563;font-size:10px;margin:4px 0 10px">bpm</div>
          <div style="padding:3px 10px;border-radius:99px;font-size:9px;font-weight:700;font-family:monospace;
                      display:inline-block;background:{bg_fc};color:{'#ef4444' if 'ALERTA' in estado_fc else '#10b981'}">
            {estado_fc}
          </div>
          <div style="margin-top:8px;color:#374151;font-size:9px;font-family:monospace">Normal: 60–100</div>
        </div>
      </td>
      <!-- SPO2 -->
      <td width="33%" style="vertical-align:top">
        <div style="background:#0d1628;border:1px solid rgba(0,229,255,0.25);border-top:2px solid #00e5ff;
                    border-radius:14px;padding:18px 12px;text-align:center">
          <div style="color:#6b7280;font-size:8px;font-family:monospace;letter-spacing:0.1em;margin-bottom:8px">SATURACIÓN O₂</div>
          <div style="color:{color_spo2};font-size:34px;font-weight:800;font-family:monospace;line-height:1">
            {spo2 if spo2 > 0 else "—"}
          </div>
          <div style="color:#4b5563;font-size:10px;margin:4px 0 10px">%</div>
          <div style="padding:3px 10px;border-radius:99px;font-size:9px;font-weight:700;font-family:monospace;
                      display:inline-block;background:{bg_spo2};color:{'#ef4444' if 'ALERTA' in estado_spo2 else '#10b981'}">
            {estado_spo2}
          </div>
          <div style="margin-top:8px;color:#374151;font-size:9px;font-family:monospace">Normal: ≥ 95%</div>
        </div>
      </td>
      <!-- FLUIDO -->
      <td width="33%" style="vertical-align:top">
        <div style="background:#0d1628;border:1px solid rgba(167,139,250,0.25);border-top:2px solid #a78bfa;
                    border-radius:14px;padding:18px 12px;text-align:center">
          <div style="color:#6b7280;font-size:8px;font-family:monospace;letter-spacing:0.1em;margin-bottom:8px">FLUIDO IV</div>
          <div style="color:{color_peso};font-size:34px;font-weight:800;font-family:monospace;line-height:1">
            {peso:.0f}
          </div>
          <div style="color:#4b5563;font-size:10px;margin:4px 0 10px">gramos</div>
          <div style="padding:3px 10px;border-radius:99px;font-size:9px;font-weight:700;font-family:monospace;
                      display:inline-block;background:{bg_peso};color:{txt_peso}">
            {estado_peso}
          </div>
          <div style="margin-top:8px;color:#374151;font-size:9px;font-family:monospace">Crítico: &lt; 100g</div>
        </div>
      </td>
    </tr>
  </table>

  {bloque_alertas}

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:28px">
    <a href="https://proyecto-monitoreo-posta-medica.vercel.app"
       style="background:linear-gradient(135deg,#00e5ff,#0284c7);color:#000;font-weight:800;
              font-size:13px;padding:14px 40px;border-radius:12px;text-decoration:none;
              display:inline-block;letter-spacing:0.04em">
      🖥️ Ver Dashboard en Tiempo Real
    </a>
  </div>

  <!-- NOTA INFORMATIVA -->
  <div style="background:#0a1020;border:1px solid rgba(255,255,255,0.06);border-radius:12px;
              padding:16px 20px;margin-bottom:24px">
    <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;font-weight:600">Estimado familiar,</p>
    <p style="color:#6b7280;font-size:11px;margin:0;line-height:1.6">
      Este reporte fue generado automáticamente por el sistema de monitoreo IoT de la Posta Médica — UNMSM.
      Ante cualquier duda o emergencia, comuníquese con el personal médico de guardia.
    </p>
  </div>

  <!-- FOOTER -->
  <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.05);padding-top:20px">
    <p style="color:#1f2937;font-size:10px;font-family:monospace;margin:0">
      UNMSM · FISI · Internet de las Cosas · 2026
    </p>
    <p style="color:#1a2235;font-size:9px;font-family:monospace;margin:4px 0 0">
      Sistema de Monitoreo IoT — Posta Médica · Consultorio General
    </p>
  </div>

</div>
</body>
</html>"""


# ══════════════════════════════════════════════════════════════
#  PDF
# ══════════════════════════════════════════════════════════════
def _generar_pdf(payload: dict, alertas: list) -> bytes | None:
    if not REPORTLAB_OK:
        return None

    buffer = BytesIO()
    doc    = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.7*inch, bottomMargin=0.7*inch,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
    )

    # Colores
    azul_osc  = colors.HexColor("#0284c7")
    azul_cian = colors.HexColor("#00b4d8")
    morado    = colors.HexColor("#7c3aed")
    verde     = colors.HexColor("#059669")
    rojo      = colors.HexColor("#dc2626")
    amarillo  = colors.HexColor("#d97706")
    gris_osc  = colors.HexColor("#475569")
    gris_clar = colors.HexColor("#f1f5f9")
    bg_header = colors.HexColor("#0f172a")
    bg_alt    = colors.HexColor("#f8fafc")

    # Estilos
    titulo_s  = ParagraphStyle("titulo",  fontSize=20, textColor=azul_osc,  fontName="Helvetica-Bold",  spaceAfter=4,  alignment=1)
    sub_s     = ParagraphStyle("sub",     fontSize=10, textColor=gris_osc,  fontName="Helvetica",       spaceAfter=2,  alignment=1)
    seccion_s = ParagraphStyle("seccion", fontSize=11, textColor=azul_cian, fontName="Helvetica-Bold",  spaceAfter=6,  spaceBefore=10)
    body_s    = ParagraphStyle("body",    fontSize=10, textColor=colors.HexColor("#1e293b"), fontName="Helvetica", spaceAfter=4, leading=14)
    alerta_s  = ParagraphStyle("alerta",  fontSize=10, textColor=rojo,      fontName="Helvetica-Bold",  spaceAfter=4)
    footer_s  = ParagraphStyle("footer",  fontSize=8,  textColor=gris_osc,  fontName="Helvetica",       alignment=1)

    fc    = payload.get("fc",    0)
    spo2  = payload.get("spo2",  0)
    peso  = payload.get("peso",  0)
    bomba = payload.get("bomba", False)
    hora  = datetime.now().strftime("%d/%m/%Y %H:%M:%S")

    estado_fc   = "Normal" if 60 <= fc   <= 100 else "ALERTA"  if fc   > 0   else "Sin sensor"
    estado_spo2 = "Normal" if spo2 >= 95          else "ALERTA"  if spo2 > 0   else "Sin sensor"
    estado_peso = "Normal" if peso >= 150          else "CRÍTICO" if peso < 100 else "BAJO"

    elementos = []

    # ── Encabezado ──
    elementos += [
        Paragraph("Monitor IoT — Posta Médica", titulo_s),
        Paragraph("UNMSM · Facultad de Ingeniería de Sistemas e Informática", sub_s),
        Paragraph("Consultorio General · Internet de las Cosas 2026", sub_s),
        Paragraph(f"Reporte generado: {hora}", sub_s),
        Spacer(1, 0.1*inch),
        HRFlowable(width="100%", thickness=1.5, color=azul_cian, spaceAfter=12),
    ]

    # ── Datos paciente ──
    elementos.append(Paragraph("▸ Datos del Paciente", seccion_s))
    t_paciente = Table([
        ["Campo",              "Información"],
        ["Nombre completo",    "Juan Carlos Rodriguez Gomez"],
        ["ID Paciente",        "PCT-2026-0042"],
        ["Ubicación",          "Consultorio General — Posta Médica"],
        ["Doctor asignado",    "Dr. Paredes Villanueva"],
        ["Grupo sanguíneo",    "O+"],
        ["Fecha de ingreso",   "20/02/2026"],
        ["Estado bomba IV",    "ACTIVA — Recargando" if bomba else "STANDBY — Nivel suficiente"],
    ], colWidths=[2.3*inch, 4.2*inch])

    t_paciente.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, 0), bg_header),
        ("TEXTCOLOR",      (0, 0), (-1, 0), colors.white),
        ("FONTNAME",       (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",       (0, 0), (-1, 0), 10),
        ("ALIGN",          (0, 0), (-1, 0), "CENTER"),
        ("FONTNAME",       (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",       (0, 1), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1,-1), [bg_alt, colors.white]),
        ("GRID",           (0, 0), (-1,-1), 0.4, colors.HexColor("#cbd5e1")),
        ("PADDING",        (0, 0), (-1,-1), 7),
        ("TEXTCOLOR",      (1, -1),(-1,-1), verde if not bomba else amarillo),
    ]))
    elementos += [t_paciente, Spacer(1, 0.2*inch)]

    # ── Signos vitales ──
    elementos.append(Paragraph("▸ Signos Vitales", seccion_s))

    def color_estado(est):
        if est == "ALERTA" or est == "CRÍTICO": return rojo
        if est == "BAJO":    return amarillo
        if est == "Normal":  return verde
        return gris_osc

    t_vitales = Table([
        ["Signo Vital",      "Valor",                          "Unidad", "Estado",      "Rango Normal"],
        ["Frec. Cardíaca",   str(fc)   if fc   > 0 else "—",  "bpm",    estado_fc,     "60 – 100 bpm"],
        ["Saturación O₂",   str(spo2) if spo2 > 0 else "—",  "%",      estado_spo2,   "≥ 95%"],
        ["Fluido IV",        f"{peso:.1f}",                   "g",      estado_peso,   "≥ 150g OK"],
    ], colWidths=[1.8*inch, 1.2*inch, 0.8*inch, 1.2*inch, 1.5*inch])

    t_vitales.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), azul_osc),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0), 9),
        ("ALIGN",       (0, 0), (-1,-1), "CENTER"),
        ("FONTNAME",    (0, 1), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 1), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1),(-1,-1), [colors.HexColor("#e0f2fe"), colors.white]),
        ("GRID",        (0, 0), (-1,-1), 0.4, colors.HexColor("#bae6fd")),
        ("PADDING",     (0, 0), (-1,-1), 7),
        ("TEXTCOLOR",   (3, 1), (3, 1), color_estado(estado_fc)),
        ("TEXTCOLOR",   (3, 2), (3, 2), color_estado(estado_spo2)),
        ("TEXTCOLOR",   (3, 3), (3, 3), color_estado(estado_peso)),
        ("FONTNAME",    (3, 1), (3,-1), "Helvetica-Bold"),
    ]))
    elementos += [t_vitales, Spacer(1, 0.2*inch)]

    # ── Alertas ──
    if alertas:
        elementos.append(Paragraph("▸ Alertas Detectadas", seccion_s))
        t_alertas = [["Tipo", "Descripción"]]
        for a in alertas:
            t_alertas.append([a.get("tipo","").replace("_"," "), a.get("mensaje","")])

        ta = Table(t_alertas, colWidths=[1.8*inch, 4.7*inch])
        ta.setStyle(TableStyle([
            ("BACKGROUND",  (0,0),(-1, 0), colors.HexColor("#7f1d1d")),
            ("TEXTCOLOR",   (0,0),(-1, 0), colors.white),
            ("FONTNAME",    (0,0),(-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",    (0,0),(-1,-1), 9),
            ("ALIGN",       (0,0),(-1,-1), "LEFT"),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.HexColor("#fff1f2"), colors.white]),
            ("GRID",        (0,0),(-1,-1), 0.4, colors.HexColor("#fecaca")),
            ("PADDING",     (0,0),(-1,-1), 7),
            ("TEXTCOLOR",   (0,1),(0, -1), rojo),
            ("FONTNAME",    (0,1),(0, -1), "Helvetica-Bold"),
        ]))
        elementos += [ta, Spacer(1, 0.2*inch)]

    # ── Nota y footer ──
    elementos += [
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceAfter=10),
        Paragraph("Estimado familiar:", body_s),
        Paragraph(
            "Este reporte fue generado automáticamente por el sistema de monitoreo IoT de la Posta Médica — UNMSM FISI. "
            "Los valores mostrados corresponden a promedios de 10 segundos medidos por el sensor MAX30102. "
            "Ante cualquier duda o emergencia, comuníquese con el personal médico de guardia.",
            body_s,
        ),
        Spacer(1, 0.25*inch),
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceAfter=8),
        Paragraph("UNMSM · FISI · Internet de las Cosas · 2026 — Sistema de Monitoreo IoT · Posta Médica", footer_s),
    ]

    doc.build(elementos)
    return buffer.getvalue()


# ══════════════════════════════════════════════════════════════
#  FUNCIÓN PRINCIPAL
# ══════════════════════════════════════════════════════════════
async def enviar_email_familiar(payload: dict, alertas: list, destinatario: str = ""):
    if not destinatario:
        print("⚠️ Sin destinatario")
        return
    if not RESEND_API_KEY:
        print("❌ RESEND_API_KEY no configurada en Railway")
        return

    resend.api_key = RESEND_API_KEY
    hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    html = _construir_html(payload, alertas, hora)

    attachments = []
    pdf_bytes   = _generar_pdf(payload, alertas)
    if pdf_bytes:
        nombre_pdf = f"reporte_posta_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"
        attachments.append({
            "filename": nombre_pdf,
            "content":  list(pdf_bytes),
        })
        print(f"📎 PDF adjunto: {nombre_pdf}")

    try:
        params = {
            "from":    f"Monitor IoT Posta Médica <{EMAIL_REMITENTE}>",
            "to":      [destinatario],
            "subject": f"Reporte de salud — Juan Carlos Rodriguez Gomez · {hora[:16]}",
            "html":    html,
        }
        reply_to = os.environ.get("EMAIL_REPLY_TO", "")
        if reply_to:
            params["reply_to"] = reply_to
        if attachments:
            params["attachments"] = attachments

        loop     = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: resend.Emails.send(params))
        print(f"📧 Email enviado a {destinatario} — id: {response.get('id','?')}")

    except Exception as e:
        print(f"❌ Error Resend: {e}")
        raise