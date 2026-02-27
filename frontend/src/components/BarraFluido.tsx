interface Props {
    peso: number;
    max?: number;
}

const BarraFluido = ({ peso, max = 500 }: Props) => {
    const pct = Math.max(0, Math.min(100, (peso / max) * 100));
    const color = pct > 40 ? "#00e5ff" : pct > 20 ? "#f59e0b" : "#ef4444";

    return (
        <div style={{
            position: "relative", width: "100%", height: 12,
            background: "#1e2436", borderRadius: 99, overflow: "hidden",
        }}>
            <div style={{
                width: `${pct}%`, height: "100%", background: color,
                borderRadius: 99, transition: "width 1s ease, background 0.5s",
                boxShadow: `0 0 10px ${color}80`,
            }} />
        </div>
    );
};

export default BarraFluido;