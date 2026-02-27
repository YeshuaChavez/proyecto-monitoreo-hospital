import { Lectura, Alerta } from "../tipos";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const obtenerUltimaLectura = async (): Promise<Lectura> => {
    const res = await fetch(`${BASE_URL}/lecturas/latest`);
    if (!res.ok) throw new Error("Error al obtener lectura");
    return res.json();
};

export const obtenerLecturas = async (limite = 30): Promise<Lectura[]> => {
    const res = await fetch(`${BASE_URL}/lecturas?limit=${limite}`);
    if (!res.ok) throw new Error("Error al obtener historial");
    return res.json();
};

export const obtenerAlertas = async (): Promise<Alerta[]> => {
    const res = await fetch(`${BASE_URL}/alertas`);
    if (!res.ok) throw new Error("Error al obtener alertas");
    return res.json();
};

export const limpiarAlertas = async (): Promise<void> => {
    const res = await fetch(`${BASE_URL}/alertas`, { method: "DELETE" });
    if (!res.ok) throw new Error("Error al limpiar alertas");
};