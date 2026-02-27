import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import CorazonPulso from "../components/CorazonPulso";
import ArcoIndicador from "../components/ArcoIndicador";
import BarraFluido from "../components/BarraFluido";
import InsigniaAlerta from "../components/InsigniaAlerta";
import TooltipPersonalizado from "../components/TooltipPersonalizado";
import { Lectura, EstadoVital } from "../tipos";

interface Props {
    lectura: Lectura;
    historial: Lectura[];
}

const Monitor = ({ lectura, historial }: Props) => {
    const estadoFC: EstadoVital = lectura.fc < 60 ? "critical" : lectura.fc > 100 ? "warn" : "ok";
    const estadoSpO2: EstadoVital = lectura.spo2 < 90 ? "critical" : lectura.spo2 < 95 ? "warn" : "ok";
    const estadoFluido: EstadoVital = lectura.peso < 50 ? "critical" : lectura.peso < 100 ? "warn" : "ok";

    const coloresEstado: Record<EstadoVital, string> = {
        ok: "#10b981", warn: "#f59e0b", critical: "#ef4444",
    };
    const colorFluido = coloresEstado[estadoFluido];

    return (
        <div style={{ animation: "fadeIn 0.3s ease" }}>

            {/* Barra paciente */}
            <div style={{
                background: "linear-gradient(135deg, rgba(0,229,255,0.06), rgba(244,63,94,0.06))",
                border: "1px solid rgba(0,229,255,0.12)",
                borderRadius: 14, padding: "14px 24px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 24,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, #1e2436, #2d3748)",
                        border: "2px solid rgba(0,229,255,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                    }}>👤</div>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>Paciente — Cama 04</div>
                        <div style={{ fontSize: 11, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>
                            ID: PCT-2026-0042 · UCI · Turno Mañana
                        </div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <InsigniaAlerta label={`FC ${lectura.fc} bpm`} type={estadoFC} />
                    <InsigniaAlerta label={`SpO2 ${lectura.spo2}%`} type={estadoSpO2} />
                    <InsigniaAlerta label={`IV ${lectura.peso}g`} type={estadoFluido} />
                    <InsigniaAlerta label={lectura.bomba ? "BOMBA ACTIVA" : "BOMBA OFF"} type={lectura.bomba ? "warn" : "ok"} />
                </div>
            </div>

            {/* Tarjetas vitales */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>

                {/* FC */}
                <div className="card" style={{
                    background: "rgba(13,17,28,0.8)", border: "1px solid rgba(244,63,94,0.2)",
                    borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
                }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #f43f5e, transparent)" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                            <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>FREC. CARDÍACA</div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                                <span style={{ fontSize: 42, fontWeight: 800, color: "#f43f5e", lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{lectura.fc}</span>
                                <span style={{ fontSize: 13, color: "#6b7280" }}>bpm</span>
                            </div>
                        </div>
                        <CorazonPulso bpm={lectura.fc} color="#f43f5e" />
                    </div>
                    <InsigniaAlerta label={estadoFC === "ok" ? "Normal" : estadoFC === "warn" ? "Atención" : "Crítico"} type={estadoFC} />
                    <div style={{ marginTop: 12 }}>
                        <ArcoIndicador value={lectura.fc} min={40} max={150} color="#f43f5e" size={60} />
                    </div>
                </div>

                {/* SpO2 */}
                <div className="card" style={{
                    background: "rgba(13,17,28,0.8)", border: "1px solid rgba(0,229,255,0.2)",
                    borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
                }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #00e5ff, transparent)" }} />
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>SATURACIÓN O₂</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 42, fontWeight: 800, color: "#00e5ff", lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{lectura.spo2}</span>
                            <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
                        </div>
                    </div>
                    <InsigniaAlerta label={estadoSpO2 === "ok" ? "Normal" : estadoSpO2 === "warn" ? "Baja" : "Crítica"} type={estadoSpO2} />
                    <div style={{ marginTop: 12 }}>
                        <ArcoIndicador value={lectura.spo2} min={85} max={100} color="#00e5ff" size={60} />
                    </div>
                </div>

                {/* Fluido IV */}
                <div className="card" style={{
                    background: "rgba(13,17,28,0.8)", border: `1px solid ${colorFluido}30`,
                    borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
                }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${colorFluido}, transparent)` }} />
                    <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>FLUIDO IV</div>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                            <span style={{ fontSize: 42, fontWeight: 800, color: colorFluido, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>{lectura.peso}</span>
                            <span style={{ fontSize: 13, color: "#6b7280" }}>g</span>
                        </div>
                    </div>
                    <BarraFluido peso={lectura.peso} />
                    <div style={{ marginTop: 10 }}>
                        <InsigniaAlerta label={estadoFluido === "ok" ? "Nivel OK" : estadoFluido === "warn" ? "Nivel bajo" : "Nivel crítico"} type={estadoFluido} />
                    </div>
                </div>

                {/* Bomba */}
                <div className="card" style={{
                    background: "rgba(13,17,28,0.8)",
                    border: `1px solid ${lectura.bomba ? "#f59e0b30" : "#10b98130"}`,
                    borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
                }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${lectura.bomba ? "#f59e0b" : "#10b981"}, transparent)` }} />
                    <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>BOMBA PERISTÁLTICA</div>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>{lectura.bomba ? "⚙️" : "✅"}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: lectura.bomba ? "#f59e0b" : "#10b981", fontFamily: "'JetBrains Mono', monospace" }}>
                        {lectura.bomba ? "ACTIVA" : "STANDBY"}
                    </div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6 }}>
                        {lectura.bomba ? "Transfiriendo fluido de respaldo" : "Nivel de fluido suficiente"}
                    </div>
                </div>
            </div>

            {/* Gráficas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

                {/* Gráfica FC */}
                <div className="card" style={{
                    background: "rgba(13,17,28,0.8)", border: "1px solid rgba(244,63,94,0.15)",
                    borderRadius: 16, padding: "20px",
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#f43f5e", marginBottom: 4 }}>Frecuencia Cardíaca</div>
                    <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>Últimas {historial.length} lecturas</div>
                    <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={historial} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="gradFC" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                            <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={9} />
                            <YAxis domain={[40, 140]} tick={{ fontSize: 9, fill: "#374151" }} />
                            <Tooltip content={<TooltipPersonalizado unit="bpm" color="#f43f5e" />} />
                            <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                            <Area type="monotone" dataKey="fc" stroke="#f43f5e" strokeWidth={2} fill="url(#gradFC)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráfica SpO2 */}
                <div className="card" style={{
                    background: "rgba(13,17,28,0.8)", border: "1px solid rgba(0,229,255,0.15)",
                    borderRadius: 16, padding: "20px",
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5ff", marginBottom: 4 }}>Saturación de Oxígeno</div>
                    <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>Últimas {historial.length} lecturas</div>
                    <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={historial} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="gradSpO2" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                            <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={9} />
                            <YAxis domain={[85, 100]} tick={{ fontSize: 9, fill: "#374151" }} />
                            <Tooltip content={<TooltipPersonalizado unit="%" color="#00e5ff" />} />
                            <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
                            <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
                            <Area type="monotone" dataKey="spo2" stroke="#00e5ff" strokeWidth={2} fill="url(#gradSpO2)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráfica Fluido IV */}
                <div className="card" style={{
                    background: "rgba(13,17,28,0.8)", border: "1px solid rgba(167,139,250,0.15)",
                    borderRadius: 16, padding: "20px", gridColumn: "1 / -1",
                }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 4 }}>Nivel de Fluido IV</div>
                    <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
                        Umbral bomba: 100g · Crítico: 50g
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={historial} margin={{ top: 5, right: 60, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="gradPeso" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                            <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={9} />
                            <YAxis domain={[0, 500]} tick={{ fontSize: 9, fill: "#374151" }} />
                            <Tooltip content={<TooltipPersonalizado unit="g" color="#a78bfa" />} />
                            <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: "Umbral bomba", fontSize: 9, fill: "#f59e0b", position: "right" }} />
                            <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: "Crítico", fontSize: 9, fill: "#ef4444", position: "right" }} />
                            <Area type="monotone" dataKey="peso" stroke="#a78bfa" strokeWidth={2} fill="url(#gradPeso)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default Monitor;