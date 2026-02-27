import { useState, useEffect } from "react";
import { Lectura, Alerta } from "../tipos";
import { obtenerUltimaLectura } from "../services/api";

const MAX_HISTORIAL = 30;

const generarLectura = (prev?: Lectura): Lectura => {
    const fc = Math.max(50, Math.min(130, (prev?.fc ?? 75) + (Math.random() - 0.5) * 6));
    const spo2 = Math.max(88, Math.min(100, (prev?.spo2 ?? 97) + (Math.random() - 0.5) * 1.5));
    const peso = Math.max(0, Math.min(500, (prev?.peso ?? 350) - Math.random() * 2));
    return {
        fc: +fc.toFixed(0),
        spo2: +spo2.toFixed(1),
        peso: +peso.toFixed(1),
        bomba: peso < 100,
        time: new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };
};

const construirHistorialInicial = (): Lectura[] => {
    const arr: Lectura[] = [];
    let r: Lectura | undefined;
    for (let i = 0; i < MAX_HISTORIAL; i++) { r = generarLectura(r); arr.push(r); }
    return arr;
};

export const useLecturas = (simulacion = true) => {
    const [historial, setHistorial] = useState<Lectura[]>(construirHistorialInicial);
    const [lectura, setLectura] = useState<Lectura>(() => historial[historial.length - 1]);
    const [conectado, setConectado] = useState(true);
    const [alertas, setAlertas] = useState<Alerta[]>([]);

    useEffect(() => {
        const verificarAlertas = (r: Lectura) => {
            const nuevas: Alerta[] = [];
            if (r.fc < 60) nuevas.push({ id: Date.now(), msg: `FC baja: ${r.fc} bpm`, type: "warn" });
            if (r.fc > 100) nuevas.push({ id: Date.now() + 1, msg: `FC alta: ${r.fc} bpm`, type: "warn" });
            if (r.spo2 < 90) nuevas.push({ id: Date.now() + 2, msg: `SpO2 crítica: ${r.spo2}%`, type: "critical" });
            else if (r.spo2 < 95) nuevas.push({ id: Date.now() + 3, msg: `SpO2 baja: ${r.spo2}%`, type: "warn" });
            if (r.bomba) nuevas.push({ id: Date.now() + 4, msg: "Bomba peristáltica activa", type: "warn" });
            if (r.peso < 50) nuevas.push({ id: Date.now() + 5, msg: "Fluido IV crítico", type: "critical" });
            if (nuevas.length > 0) setAlertas(a => [...nuevas, ...a].slice(0, 20));
        };

        const actualizar = async () => {
            if (simulacion) {
                const nueva = generarLectura(lectura);
                setLectura(nueva);
                setHistorial(h => [...h.slice(-MAX_HISTORIAL + 1), nueva]);
                setConectado(true);
                verificarAlertas(nueva);
            } else {
                try {
                    const data = await obtenerUltimaLectura();
                    const nueva = { ...data, time: new Date().toLocaleTimeString("es-PE") };
                    setLectura(nueva);
                    setHistorial(h => [...h.slice(-MAX_HISTORIAL + 1), nueva]);
                    setConectado(true);
                    verificarAlertas(nueva);
                } catch {
                    setConectado(false);
                }
            }
        };

        const intervalo = setInterval(actualizar, 1500);
        return () => clearInterval(intervalo);
    }, [lectura, simulacion]);

    const limpiarAlertas = () => setAlertas([]);

    return { lectura, historial, conectado, alertas, limpiarAlertas };
};