interface Props {
    active?: boolean;
    payload?: { value: number }[];
    label?: string;
    unit: string;
    color: string;
}

const TooltipPersonalizado = ({ active, payload, label, unit, color }: Props) => {
    if (!active || !payload?.length) return null;

    return (
        <div style={{
            background: "rgba(10,14,26,0.95)",
            border: `1px solid ${color}40`,
            borderRadius: 8, padding: "8px 14px",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
        }}>
            <p style={{ color: "#6b7280", margin: 0 }}>{label}</p>
            <p style={{ color, margin: "2px 0 0", fontWeight: 700 }}>
                {payload[0].value} {unit}
            </p>
        </div>
    );
};

export default TooltipPersonalizado;