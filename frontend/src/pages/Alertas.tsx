import InsigniaAlerta from "../components/InsigniaAlerta";
import { Alerta } from "../tipos";

interface Props {
    alertas: Alerta[];
    limpiarAlertas: () => void;
}

const Alertas = ({ alertas, limpiarAlertas }: Props) => {
    return (
        <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Registro de Alertas</h2>
                    <p style={{ fontSize: 12, color: "#4b5563", margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
                        {alertas.length} eventos registrados
                    </p>
                </div>
                <button onClick={limpiarAlertas} style={{
                    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444", borderRadius: 8, padding: "8px 16px",
                    fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "all 0.2s",
                }}>
                    Limpiar alertas
                </button>
            </div>

            {alertas.length === 0 ? (
                <div style={{
                    textAlign: "center", padding: "80px 20px",
                    background: "rgba(13,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 16,
                }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>Sin alertas activas</div>
                    <div style={{ fontSize: 12, color: "#4b5563", marginTop: 6 }}>
                        Todos los signos vitales dentro de parámetros normales
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {alertas.map((alerta) => (
                        <div key={alerta.id} className="card" style={{
                            background: "rgba(13,17,28,0.8)",
                            border: `1px solid ${alerta.type === "critical" ? "#ef444430" : "#f59e0b30"}`,
                            borderLeft: `3px solid ${alerta.type === "critical" ? "#ef4444" : "#f59e0b"}`,
                            borderRadius: 10, padding: "14px 18px",
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            animation: "fadeIn 0.2s ease",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontSize: 18 }}>{alerta.type === "critical" ? "🚨" : "⚠️"}</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: alerta.type === "critical" ? "#ef4444" : "#f59e0b" }}>
                                        {alerta.msg}
                                    </div>
                                    <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                                        {alerta.type === "critical" ? "CRÍTICO — Requiere atención inmediata" : "ADVERTENCIA — Revisar paciente"}
                                    </div>
                                </div>
                            </div>
                            <InsigniaAlerta label={alerta.type === "critical" ? "CRÍTICO" : "ALERTA"} type={alerta.type} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Alertas;