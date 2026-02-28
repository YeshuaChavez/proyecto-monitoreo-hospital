import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Lectura } from "../tipos";

interface Props {
    lectura: Lectura;
    historial: Lectura[];
}

const Analytics = ({ lectura, historial }: Props) => {
    // Solo lecturas válidas (con dedo puesto en el sensor)
    const datos = historial.filter(h => h.fc > 0 && h.spo2 > 0);
    const total = datos.length || 1;

    const promedioFC   = (datos.reduce((a, b) => a + b.fc,   0) / total).toFixed(0);
    const promedioSpO2 = (datos.reduce((a, b) => a + b.spo2, 0) / total).toFixed(1);
    const minFC   = datos.length ? Math.min(...datos.map(h => h.fc))   : 0;
    const maxFC   = datos.length ? Math.max(...datos.map(h => h.fc))   : 0;
    const minSpO2 = datos.length ? Math.min(...datos.map(h => h.spo2)) : 0;

    const estadisticas = [
        { label: "FC Promedio",   valor: datos.length ? promedioFC   : "--", unidad: "bpm", color: "#f43f5e" },
        { label: "FC Mínima",     valor: datos.length ? minFC        : "--", unidad: "bpm", color: "#f59e0b" },
        { label: "FC Máxima",     valor: datos.length ? maxFC        : "--", unidad: "bpm", color: "#ef4444" },
        { label: "SpO2 Promedio", valor: datos.length ? promedioSpO2 : "--", unidad: "%",   color: "#00e5ff" },
        { label: "SpO2 Mínima",   valor: datos.length ? minSpO2      : "--", unidad: "%",   color: "#f59e0b" },
        { label: "Fluido actual", valor: lectura.peso.toFixed(1),             unidad: "g",   color: "#a78bfa" },
    ];

    const paneles = [
        {
            titulo: "Interpretación FC", color: "#f43f5e",
            items: [
                { label: "Rango normal",    valor: "60–100 bpm",          ok: true },
                { label: "Promedio actual", valor: `${promedioFC} bpm`,   ok: +promedioFC >= 60 && +promedioFC <= 100 },
                { label: "Variabilidad",    valor: `${maxFC - minFC} bpm`, ok: maxFC - minFC < 30 },
            ],
        },
        {
            titulo: "Interpretación SpO2", color: "#00e5ff",
            items: [
                { label: "Rango normal",        valor: "≥ 95%",            ok: true },
                { label: "Promedio actual",      valor: `${promedioSpO2}%`, ok: +promedioSpO2 >= 95 },
                { label: "Mínimo registrado",    valor: `${minSpO2}%`,      ok: +minSpO2 >= 90 },
            ],
        },
    ];

    return (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Analytics del Paciente</h2>
                <p style={{ fontSize: 12, color: "#4b5563", margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
                    {datos.length > 0
                        ? `Estadísticas de ${datos.length} lecturas válidas (con sensor activo)`
                        : "Sin lecturas válidas aún — coloca el dedo en el sensor"}
                </p>
            </div>

            {/* Estadísticas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 24 }}>
                {estadisticas.map((s, i) => (
                    <div key={i} className="card" style={{
                        background: "rgba(13,17,28,0.8)", border: `1px solid ${s.color}25`,
                        borderRadius: 14, padding: "16px", borderTop: `2px solid ${s.color}`,
                    }}>
                        <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>{s.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{s.valor}</div>
                        <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{s.unidad}</div>
                    </div>
                ))}
            </div>

            {/* Gráfica comparativa */}
            <div className="card" style={{
                background: "rgba(13,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "24px", marginBottom: 16,
            }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "#e2e8f0" }}>FC y SpO2 — Vista Comparativa</div>
                {datos.length === 0 ? (
                    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        Sin datos válidos — coloca el dedo en el sensor MAX30102
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={datos} margin={{ top: 5, right: 20, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                            <XAxis dataKey="timestamp" tick={{ fontSize: 9, fill: "#374151" }} interval={9} />
                            <YAxis yAxisId="fc"   domain={[40, 140]} tick={{ fontSize: 9, fill: "#f43f5e" }} />
                            <YAxis yAxisId="spo2" orientation="right" domain={[85, 100]} tick={{ fontSize: 9, fill: "#00e5ff" }} />
                            <Tooltip
                                contentStyle={{ background: "rgba(10,14,26,0.95)", border: "1px solid #1e2436", borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}
                                labelStyle={{ color: "#6b7280" }}
                            />
                            <Line yAxisId="fc"   type="monotone" dataKey="fc"   stroke="#f43f5e" strokeWidth={2} dot={false} name="FC (bpm)" />
                            <Line yAxisId="spo2" type="monotone" dataKey="spo2" stroke="#00e5ff" strokeWidth={2} dot={false} name="SpO2 (%)" />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* Paneles de interpretación */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {paneles.map((panel, i) => (
                    <div key={i} className="card" style={{
                        background: "rgba(13,17,28,0.8)", border: `1px solid ${panel.color}20`,
                        borderRadius: 14, padding: "20px",
                    }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: panel.color, marginBottom: 14 }}>{panel.titulo}</div>
                        {panel.items.map((item, j) => (
                            <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                <span style={{ fontSize: 12, color: "#9ca3af" }}>{item.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: item.ok ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                                    {item.ok ? "✓" : "✗"} {item.valor}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Analytics;