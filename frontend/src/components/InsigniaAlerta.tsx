import { EstadoVital } from "../tipos";

interface Props {
    label: string;
    type: EstadoVital;
}

const InsigniaAlerta = ({ label, type }: Props) => {
    const colores: Record<EstadoVital, string> = {
        ok: "#10b981",
        warn: "#f59e0b",
        critical: "#ef4444",
    };
    const c = colores[type];

    return (
        <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: `${c}18`, border: `1px solid ${c}50`,
            color: c, borderRadius: 99, padding: "3px 10px",
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
        }}>
            <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: c, display: "inline-block", boxShadow: `0 0 6px ${c}`,
            }} />
            {label}
        </span>
    );
};

export default InsigniaAlerta;