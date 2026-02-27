interface Props {
    value: number;
    min: number;
    max: number;
    color: string;
    size?: number;
}

const ArcoIndicador = ({ value, min, max, color, size = 120 }: Props) => {
    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const r = size / 2 - 10;
    const cx = size / 2, cy = size / 2;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const startAngle = -220;
    const endAngle = startAngle + pct * 260;
    const largeArc = pct * 260 > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const bgX2 = cx + r * Math.cos(toRad(startAngle + 260));
    const bgY2 = cy + r * Math.sin(toRad(startAngle + 260));

    return (
        <svg width={size} height={size} style={{ overflow: "visible" }}>
            <path d={`M ${x1} ${y1} A ${r} ${r} 0 1 1 ${bgX2} ${bgY2}`}
                fill="none" stroke="#1e2436" strokeWidth={8} strokeLinecap="round" />
            {pct > 0 && (
                <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                    fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
            )}
        </svg>
    );
};

export default ArcoIndicador;