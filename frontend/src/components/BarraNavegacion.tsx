import { Alerta } from "../tipos";

interface Props {
    tab: string;
    setTab: (tab: string) => void;
    alertas: Alerta[];
    conectado: boolean;
}

const BarraNavegacion = ({ tab, setTab, alertas, conectado }: Props) => {
    return (
        <header style={{
            position: "sticky", top: 0, zIndex: 100,
            background: "rgba(7,11,20,0.92)", backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(0,229,255,0.1)",
            padding: "0 32px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            height: 64,
        }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, #ef4444, #f43f5e)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 0 20px #ef444460",
                }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                        <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.518 3.318 1 6.5 1c1.863 0 3.404 1.109 4.5 2.695C12.096 2.109 13.637 1 15.5 1 18.682 1 21 3.518 21 7.191c0 4.105-5.37 8.863-11 14.402z" />
                    </svg>
                </div>
                <div>
                    <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px", color: "#f1f5f9" }}>
                        Sistema de Monitoreo de Entorno Hospitalario
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <nav style={{ display: "flex", gap: 4 }}>
                {[
                    { key: "paciente", label: "Paciente" },
                    { key: "overview", label: "Monitor" },
                    { key: "analytics", label: "Analytics" },
                    { key: "alertas", label: "Alertas" },
                ].map(({ key, label }) => (
                    <button key={key} onClick={() => setTab(key)} style={{
                        background: tab === key ? "rgba(0,229,255,0.12)" : "transparent",
                        border: tab === key ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
                        color: tab === key ? "#00e5ff" : "#6b7280",
                        borderRadius: 8, padding: "6px 16px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer",
                        letterSpacing: "0.03em", transition: "all 0.2s",
                    }}>
                        {label}
                        {key === "alertas" && alertas.length > 0 && (
                            <span style={{
                                marginLeft: 6, background: "#ef4444", color: "white",
                                borderRadius: 99, padding: "1px 6px", fontSize: 10,
                            }}>{alertas.length}</span>
                        )}
                    </button>
                ))}
            </nav>

            {/* Estado conexión */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: conectado ? "#10b981" : "#ef4444",
                        boxShadow: conectado ? "0 0 8px #10b981" : "0 0 8px #ef4444",
                        animation: conectado ? "pulse 2s infinite" : "none",
                    }} />
                    <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
                        {conectado ? "EN VIVO" : "DESCONECTADO"}
                    </span>
                </div>
                <div style={{ fontSize: 11, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date().toLocaleString("es-PE")}
                </div>
            </div>
        </header>
    );
};

export default BarraNavegacion;