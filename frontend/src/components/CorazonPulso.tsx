import { useState, useEffect } from "react";

interface Props {
    bpm: number;
    color: string;
}

const CorazonPulso = ({ bpm, color }: Props) => {
    const [latido, setLatido] = useState(false);

    useEffect(() => {
        const intervalo = bpm > 0 ? 60000 / bpm : 1000;
        const t = setInterval(() => setLatido(b => !b), intervalo);
        return () => clearInterval(t);
    }, [bpm]);

    return (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            style={{ transform: latido ? "scale(1.25)" : "scale(1)", transition: "transform 0.12s ease" }}>
            <path
                d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.518 3.318 1 6.5 1c1.863 0 3.404 1.109 4.5 2.695C12.096 2.109 13.637 1 15.5 1 18.682 1 21 3.518 21 7.191c0 4.105-5.37 8.863-11 14.402z"
                fill={color}
            />
        </svg>
    );
};

export default CorazonPulso;