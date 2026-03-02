import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  BarChart2, Download, Heart, Wind, Droplets,
  CheckCircle, XCircle, Activity, TrendingDown,
  TrendingUp, Minus, AlertTriangle,
} from "lucide-react";
import { EstadoLive, DatosVitales, DatosSuero } from "../tipos";

interface Props {
  live:              EstadoLive;
  historialVitales?: DatosVitales[];
  historialSuero?:   DatosSuero[];
  config?:           { peso_alerta: number; peso_critico: number };
}

// ── Calcula el estado del flujo IV según tendencia ──────────
function analizarFlujo(historial: DatosSuero[], pesoActual: number, config: { peso_alerta: number; peso_critico: number }) {
  if (!historial.length) return null;

  // Usar los últimos 10 puntos para calcular tendencia
  const ultimos = historial.slice(-10);
  if (ultimos.length < 3) return null;

  const primero = ultimos[0].peso;
  const ultimo  = ultimos[ultimos.length - 1].peso;
  const delta   = ultimo - primero;           // positivo = sube, negativo = baja
  const deltaAbs = Math.abs(delta);
  const pctCambio = (deltaAbs / (primero || 1)) * 100;

  // Detectar si está recargando (bomba activa)
  const bombaActiva = ultimos.some(p => p.bomba);

  if (bombaActiva || delta > 6) {
    return {
      estado:    "RECARGANDO",
      desc:      "Bomba activa — nivel en aumento",
      detalle:   `+${deltaAbs.toFixed(1)} ml en últimas lecturas`,
      color:     "#10b981",
      bg:        "rgba(16,185,129,0.07)",
      border:    "rgba(16,185,129,0.25)",
      icon:      "up",
    };
  }

  if (deltaAbs < 2.5) {
    return {
      estado:    "ESTABLE",
      desc:      "Flujo detenido o muy lento",
      detalle:   `Variación < 2.5 ml — posible oclusión o pinza cerrada`,
      color:     "#6b7280",
      bg:        "rgba(107,114,128,0.07)",
      border:    "rgba(107,114,128,0.2)",
      icon:      "flat",
    };
  }

  if (delta < 0) {
    if (pctCambio > 10) {
      return {
        estado:    "DESCENSO RÁPIDO",
        desc:      "Suero cayendo a velocidad alta",
        detalle:   `-${deltaAbs.toFixed(1)} ml (${pctCambio.toFixed(0)}%) — revisar caudal`,
        color:     "#ef4444",
        bg:        "rgba(239,68,68,0.07)",
        border:    "rgba(239,68,68,0.25)",
        icon:      "down-fast",
      };
    }
    return {
      estado:    "DESCENDIENDO",
      desc:      "Suero reduciéndose normalmente",
      detalle:   `-${deltaAbs.toFixed(1)} ml en últimas lecturas`,
      color:     "#a78bfa",
      bg:        "rgba(167,139,250,0.07)",
      border:    "rgba(167,139,250,0.2)",
      icon:      "down",
    };
  }

  return null;
}

const Analytics = ({ live, historialVitales = [], historialSuero = [], config = { peso_alerta: 150, peso_critico: 100 } }: Props) => {

  // ── FIX REDIBUJADO: estabilizar datos con useMemo ──────────
  // Los vitales vienen cada 10s → OK para gráfica
  // El suero viene cada 1s → solo pasamos el historial por minuto
  const datosVitales = useMemo(() =>
    historialVitales.filter(h => h.fc > 0 && h.spo2 > 0),
    [historialVitales]
  );

  // Suero: submuestrear — tomar 1 de cada 10 lecturas para la tarjeta
  const datosSueroEstable = useMemo(() =>
    historialSuero.filter((_, i) => i % 10 === 0 || i === historialSuero.length - 1),
    // Solo recalcular cuando cambia el largo, no cada segundo
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [Math.floor(historialSuero.length / 10)]
  );

  const flujoInfo = useMemo(() =>
    analizarFlujo(datosSueroEstable, live.peso, config),
    [datosSueroEstable, live.peso, config]
  );

  const total = datosVitales.length || 1;
  const promedioFC   = (datosVitales.reduce((a, b) => a + b.fc,   0) / total).toFixed(0);
  const promedioSpO2 = (datosVitales.reduce((a, b) => a + b.spo2, 0) / total).toFixed(1);
  const minFC   = datosVitales.length ? Math.min(...datosVitales.map(h => h.fc))   : 0;
  const maxFC   = datosVitales.length ? Math.max(...datosVitales.map(h => h.fc))   : 0;
  const minSpO2 = datosVitales.length ? Math.min(...datosVitales.map(h => h.spo2)) : 0;

  const estadisticas = [
    { label: "FC Promedio",   valor: datosVitales.length ? promedioFC   : "--", unidad: "bpm", color: "#f43f5e", icon: <Heart size={14}/>    },
    { label: "FC Mínima",     valor: datosVitales.length ? minFC        : "--", unidad: "bpm", color: "#f59e0b", icon: <Heart size={14}/>    },
    { label: "FC Máxima",     valor: datosVitales.length ? maxFC        : "--", unidad: "bpm", color: "#ef4444", icon: <Heart size={14}/>    },
    { label: "SpO2 Promedio", valor: datosVitales.length ? promedioSpO2 : "--", unidad: "%",   color: "#00e5ff", icon: <Wind size={14}/>     },
    { label: "SpO2 Mínima",   valor: datosVitales.length ? minSpO2      : "--", unidad: "%",   color: "#f59e0b", icon: <Wind size={14}/>     },
    { label: "Fluido actual", valor: live.peso.toFixed(1),                      unidad: "ml",  color: "#a78bfa", icon: <Droplets size={14}/> },
  ];

  const paneles = [
    {
      titulo: "Interpretación FC", color: "#f43f5e", icon: <Heart size={14}/>,
      items: [
        { label: "Rango normal",    valor: "60–100 bpm",           ok: true },
        { label: "Promedio actual", valor: `${promedioFC} bpm`,    ok: +promedioFC >= 60 && +promedioFC <= 100 },
        { label: "Variabilidad",    valor: `${maxFC - minFC} bpm`, ok: maxFC - minFC < 30 },
      ],
    },
    {
      titulo: "Interpretación SpO2", color: "#00e5ff", icon: <Wind size={14}/>,
      items: [
        { label: "Rango normal",      valor: "≥ 95%",            ok: true },
        { label: "Promedio actual",   valor: `${promedioSpO2}%`, ok: +promedioSpO2 >= 95 },
        { label: "Mínimo registrado", valor: `${minSpO2}%`,      ok: +minSpO2 >= 90 },
      ],
    },
  ];

  const Card = ({ children, style = {} }: any) => (
    <div style={{
      background: "rgba(13,17,28,0.8)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 16, padding: 20, ...style,
    }}>
      {children}
    </div>
  );

  const SectionLabel = ({ text, color, icon }: { text: string; color: string; icon?: React.ReactNode }) => (
    <div style={{
      fontSize: 11, color, fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.12em", marginBottom: 12, marginTop: 28,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      {icon} {text}
    </div>
  );

  const MetaLabel = ({ text }: { text: string }) => (
    <div style={{
      fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" as const,
    }}>
      {text}
    </div>
  );

  const exportarCSV = (tipo: "suero" | "vitales") => {
    if (tipo === "suero") {
      if (!historialSuero.length) return;
      const headers = ["ID", "Timestamp", "Hora", "Volumen (ml)", "Bomba", "Estado Suero"];
      const filas = historialSuero.map(r => [r.id, r.timestamp, r.time, r.peso, r.bomba ? "SI" : "NO", r.estado_suero]);
      descargarCSV([headers, ...filas], `suero_${fecha()}.csv`);
    } else {
      if (!historialVitales.length) return;
      const headers = ["ID", "Timestamp", "Hora", "FC (bpm)", "SpO2 (%)", "Estado Vitales"];
      const filas = historialVitales.map(r => [r.id, r.timestamp, r.time, r.fc, r.spo2, r.estado_vitales]);
      descargarCSV([headers, ...filas], `vitales_${fecha()}.csv`);
    }
  };

  const descargarCSV = (filas: any[][], nombre: string) => {
    const contenido = filas.map(fila => fila.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + contenido], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = nombre; a.click();
    URL.revokeObjectURL(url);
  };

  const fecha = () => new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "-");

  // Icono según tendencia
  const iconoFlujo = (tipo: string) => {
    if (tipo === "up")        return <TrendingUp  size={28} color="#10b981"/>;
    if (tipo === "down")      return <TrendingDown size={28} color="#a78bfa"/>;
    if (tipo === "down-fast") return <TrendingDown size={28} color="#ef4444"/>;
    if (tipo === "flat")      return <Minus        size={28} color="#6b7280"/>;
    return <Activity size={28} color="#6b7280"/>;
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart2 size={20} color="#00e5ff" /> Analytics del Paciente
          </h2>
          <p style={{ fontSize: 12, color: "#4b5563", margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
            {datosVitales.length > 0
              ? `Estadísticas de ${datosVitales.length} promedios válidos`
              : "Sin promedios aún — coloca el dedo en el sensor MAX30102"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => exportarCSV("vitales")} disabled={!historialVitales.length} style={{
            background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.25)",
            color: historialVitales.length ? "#00e5ff" : "#374151",
            borderRadius: 8, padding: "7px 14px", fontSize: 11,
            cursor: historialVitales.length ? "pointer" : "not-allowed",
            fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Download size={13} /> CSV Vitales
          </button>
          <button onClick={() => exportarCSV("suero")} disabled={!historialSuero.length} style={{
            background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.25)",
            color: historialSuero.length ? "#a78bfa" : "#374151",
            borderRadius: 8, padding: "7px 14px", fontSize: 11,
            cursor: historialSuero.length ? "pointer" : "not-allowed",
            fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Download size={13} /> CSV Suero
          </button>
        </div>
      </div>

      {/* SECCIÓN 1: Estadísticas */}
      <SectionLabel text="SIGNOS VITALES — ESTADÍSTICAS" color="#00e5ff" icon={<Activity size={12}/>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
        {estadisticas.map((s, i) => (
          <Card key={i} style={{ borderTop: `2px solid ${s.color}`, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: s.color, opacity: 0.7 }}>
              {s.icon}
            </div>
            <MetaLabel text={s.label} />
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.valor}</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{s.unidad}</div>
          </Card>
        ))}
      </div>

      {/* SECCIÓN 2: Gráfica FC y SpO2 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart2 size={14} color="#6b7280"/> FC y SpO2 — Vista Comparativa
        </div>
        {datosVitales.length === 0 ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            Sin datos válidos — coloca el dedo en el sensor MAX30102
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={datosVitales} margin={{ top: 5, right: 20, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={4} />
              <YAxis yAxisId="fc"   domain={[40, 140]} tick={{ fontSize: 9, fill: "#f43f5e" }} />
              <YAxis yAxisId="spo2" orientation="right" domain={[85, 100]} tick={{ fontSize: 9, fill: "#00e5ff" }} />
              <Tooltip
                contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid #1e2436", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
                labelStyle={{ color: "#6b7280" }}
              />
              <ReferenceLine yAxisId="fc"   y={100} stroke="#ef4444" strokeDasharray="3 2" />
              <ReferenceLine yAxisId="fc"   y={60}  stroke="#f59e0b" strokeDasharray="3 2" />
              <ReferenceLine yAxisId="spo2" y={95}  stroke="#f59e0b" strokeDasharray="3 2" />
              <Line yAxisId="fc"   type="monotone" dataKey="fc"   stroke="#f43f5e" strokeWidth={2} dot={false} name="FC (bpm)" isAnimationActive={false} />
              <Line yAxisId="spo2" type="monotone" dataKey="spo2" stroke="#00e5ff" strokeWidth={2} dot={false} name="SpO2 (%)" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* SECCIÓN 3: Estado del Flujo IV */}
      <SectionLabel text="ESTADO DEL FLUIDO IV" color="#a78bfa" icon={<Droplets size={12}/>} />
      <Card style={{ marginBottom: 16 }}>
        {!flujoInfo ? (
          <div style={{ padding: "24px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            <Activity size={16}/> Acumulando datos para analizar tendencia...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center" }}>

            {/* Icono tendencia */}
            <div style={{
              width: 72, height: 72, borderRadius: 16,
              background: flujoInfo.bg, border: `1px solid ${flujoInfo.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {iconoFlujo(flujoInfo.icon)}
            </div>

            {/* Texto */}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: flujoInfo.color, marginBottom: 4 }}>
                {flujoInfo.estado}
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 6 }}>{flujoInfo.desc}</div>
              <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>{flujoInfo.detalle}</div>
            </div>

            {/* Nivel actual + umbrales */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 4 }}>NIVEL ACTUAL</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                {live.peso.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: "#6b7280" }}>ml</div>
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-end" }}>
                <span style={{ fontSize: 10, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace" }}>
                  ⚠ Alerta: {config.peso_alerta} ml
                </span>
                <span style={{ fontSize: 10, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                  🔴 Crítico: {config.peso_critico} ml
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Barra visual de nivel */}
        {flujoInfo && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>0 ml</span>
              <span style={{ fontSize: 9, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>500 ml</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.05)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
              {/* Zonas */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(config.peso_critico / 500) * 100}%`, background: "rgba(239,68,68,0.15)" }}/>
              <div style={{ position: "absolute", left: `${(config.peso_critico / 500) * 100}%`, top: 0, bottom: 0, width: `${((config.peso_alerta - config.peso_critico) / 500) * 100}%`, background: "rgba(245,158,11,0.15)" }}/>
              {/* Nivel actual */}
              <div style={{
                height: "100%",
                width: `${Math.min((live.peso / 500) * 100, 100)}%`,
                background: live.peso <= config.peso_critico ? "#ef4444" : live.peso <= config.peso_alerta ? "#f59e0b" : "#a78bfa",
                borderRadius: 99, transition: "width 1s ease",
              }}/>
            </div>
            {/* Marcadores */}
            <div style={{ position: "relative", height: 14 }}>
              <span style={{ position: "absolute", left: `${(config.peso_alerta / 500) * 100}%`, fontSize: 8, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", transform: "translateX(-50%)" }}>
                ▲{config.peso_alerta}
              </span>
              <span style={{ position: "absolute", left: `${(config.peso_critico / 500) * 100}%`, fontSize: 8, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", transform: "translateX(-50%)" }}>
                ▲{config.peso_critico}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* SECCIÓN 4: Interpretación clínica */}
      <SectionLabel text="INTERPRETACIÓN CLÍNICA" color="#10b981" icon={<Activity size={12}/>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {paneles.map((panel, i) => (
          <Card key={i} style={{ border: `1px solid ${panel.color}20` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: panel.color, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              {panel.icon} {panel.titulo}
            </div>
            {panel.items.map((item, j) => (
              <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{item.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: item.ok ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 5 }}>
                  {item.ok ? <CheckCircle size={12} color="#10b981"/> : <XCircle size={12} color="#ef4444"/>}
                  {item.valor}
                </span>
              </div>
            ))}
          </Card>
        ))}
      </div>

    </div>
  );
};

export default Analytics;