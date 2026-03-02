import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  BarChart2, Download, Heart, Wind, Droplets,
  CheckCircle, XCircle, Activity,
} from "lucide-react";
import { EstadoLive, DatosVitales, DatosSuero } from "../tipos";

interface Props {
  live:              EstadoLive;
  historialVitales?: DatosVitales[];
  historialSuero?:   DatosSuero[];
  config?:           { peso_alerta: number; peso_critico: number };
}

const Analytics = ({ live, historialVitales = [], historialSuero = [], config = { peso_alerta: 150, peso_critico: 100 } }: Props) => {

  const datos = historialVitales.filter(h => h.fc > 0 && h.spo2 > 0);
  const total = datos.length || 1;

  const promedioFC   = (datos.reduce((a, b) => a + b.fc,   0) / total).toFixed(0);
  const promedioSpO2 = (datos.reduce((a, b) => a + b.spo2, 0) / total).toFixed(1);
  const minFC   = datos.length ? Math.min(...datos.map(h => h.fc))   : 0;
  const maxFC   = datos.length ? Math.max(...datos.map(h => h.fc))   : 0;
  const minSpO2 = datos.length ? Math.min(...datos.map(h => h.spo2)) : 0;

  const estadisticas = [
    { label: "FC Promedio",   valor: datos.length ? promedioFC   : "--", unidad: "bpm", color: "#f43f5e", icon: <Heart size={14}/>    },
    { label: "FC Mínima",     valor: datos.length ? minFC        : "--", unidad: "bpm", color: "#f59e0b", icon: <Heart size={14}/>    },
    { label: "FC Máxima",     valor: datos.length ? maxFC        : "--", unidad: "bpm", color: "#ef4444", icon: <Heart size={14}/>    },
    { label: "SpO2 Promedio", valor: datos.length ? promedioSpO2 : "--", unidad: "%",   color: "#00e5ff", icon: <Wind size={14}/>     },
    { label: "SpO2 Mínima",   valor: datos.length ? minSpO2      : "--", unidad: "%",   color: "#f59e0b", icon: <Wind size={14}/>     },
    { label: "Fluido actual", valor: live.peso.toFixed(1),               unidad: "ml",  color: "#a78bfa", icon: <Droplets size={14}/> },
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

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <BarChart2 size={20} color="#00e5ff" /> Analytics del Paciente
          </h2>
          <p style={{ fontSize: 12, color: "#4b5563", margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
            {datos.length > 0
              ? `Estadísticas de ${datos.length} promedios válidos`
              : "Sin promedios aún — coloca el dedo en el sensor MAX30102"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => exportarCSV("vitales")}
            disabled={!historialVitales.length}
            style={{
              background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.25)",
              color: historialVitales.length ? "#00e5ff" : "#374151",
              borderRadius: 8, padding: "7px 14px", fontSize: 11,
              cursor: historialVitales.length ? "pointer" : "not-allowed",
              fontWeight: 600, fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            <Download size={13} /> CSV Vitales
          </button>
          <button
            onClick={() => exportarCSV("suero")}
            disabled={!historialSuero.length}
            style={{
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
        {datos.length === 0 ? (
          <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            Sin datos válidos — coloca el dedo en el sensor MAX30102
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={datos} margin={{ top: 5, right: 20, bottom: 0, left: -20 }}>
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
              <Line yAxisId="fc"   type="monotone" dataKey="fc"   stroke="#f43f5e" strokeWidth={2} dot={false} name="FC (bpm)" />
              <Line yAxisId="spo2" type="monotone" dataKey="spo2" stroke="#00e5ff" strokeWidth={2} dot={false} name="SpO2 (%)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* SECCIÓN 3: Gráfica Suero */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
          <Droplets size={14} color="#a78bfa"/> Fluido IV — Nivel (ml)
        </div>
        {historialSuero.length === 0 ? (
          <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
            Sin datos de suero aún
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={historialSuero} margin={{ top: 5, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={9} />
              <YAxis domain={[0, 600]} tick={{ fontSize: 9, fill: "#a78bfa" }} />
              <Tooltip
                contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid #1e2436", borderRadius: 8, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                formatter={(val: any) => [`${Number(val).toFixed(1)} ml`, "Fluido IV"]}
              />
              <ReferenceLine y={config.peso_alerta}  stroke="#f59e0b" strokeDasharray="4 2" label={{ value: `Alerta ${config.peso_alerta} ml`,   position: "right", fontSize: 9, fill: "#f59e0b" }} />
              <ReferenceLine y={config.peso_critico} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `Crítico ${config.peso_critico} ml`, position: "right", fontSize: 9, fill: "#ef4444" }} />
              <Line type="monotone" dataKey="peso" stroke="#a78bfa" strokeWidth={2} dot={false} name="Fluido (ml)" />
            </LineChart>
          </ResponsiveContainer>
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