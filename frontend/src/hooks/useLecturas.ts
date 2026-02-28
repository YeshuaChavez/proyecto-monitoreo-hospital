import { useEffect, useRef, useState, useCallback } from "react";
import { Lectura, Alerta } from "../tipos";
import { API, getLecturas, getAlertas } from "../services/api";

const SIMULAR = false;

function generarLecturaSimulada(prev: Lectura): Lectura {
  return {
    id:            Date.now(),
    timestamp:     new Date().toISOString(),
    fc:            Math.max(50, Math.min(130, (prev.fc || 75) + (Math.random() - 0.5) * 6)),
    spo2:          Math.max(85, Math.min(100, (prev.spo2 || 98) + (Math.random() - 0.5) * 2)),
    peso:          Math.max(0, (prev.peso || 500) - Math.random() * 2),
    bomba:         (prev.peso || 500) < 100,
    estado_suero:  "NORMAL",
    estado_vitales: null,
  };
}

export function useLecturas() {
  const [live, setLive] = useState<Lectura>({
    id: 0, timestamp: "", fc: 0, spo2: 0,
    peso: 500, bomba: false, estado_suero: "NORMAL", estado_vitales: null
  });
  const [historial, setHistorial] = useState<Lectura[]>([]);
  const [alertas, setAlertas]     = useState<Alerta[]>([]);
  const [conectado, setConectado] = useState(false);
  const wsRef  = useRef<WebSocket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarHistorial = useCallback(async () => {
    try {
      const [lects, alts] = await Promise.all([getLecturas(50), getAlertas(20)]);
      if (lects?.length) {
        setHistorial(lects);
        setLive(lects[lects.length - 1]);
      }
      if (alts?.length) setAlertas(alts);
    } catch (e) {
      console.warn("Error cargando historial:", e);
    }
  }, []);

  useEffect(() => {
    if (SIMULAR) {
      simRef.current = setInterval(() => {
        setLive(prev => {
          const nueva = generarLecturaSimulada(prev);
          setHistorial(h => [...h.slice(-49), nueva]);
          return nueva;
        });
      }, 1000);
      return () => { if (simRef.current) clearInterval(simRef.current); };
    }

    cargarHistorial();

    function conectar() {
      const ws = new WebSocket(API.ws);
      wsRef.current = ws;

      ws.onopen = () => {
        setConectado(true);
        console.log("✅ WebSocket conectado a Railway");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "lectura" && msg.data) {
            const nueva: Lectura = msg.data;
            setLive(nueva);
            setHistorial(h => [...h.slice(-49), nueva]);
          }

          if (msg.type === "alertas" && msg.data) {
            setAlertas(a => [...msg.data, ...a].slice(0, 50));
          }
        } catch (e) {
          console.warn("Error parseando WS:", e);
        }
      };

      ws.onclose = () => {
        setConectado(false);
        console.warn("WebSocket cerrado, reconectando en 3s...");
        setTimeout(conectar, 3000);
      };

      ws.onerror = (e) => {
        console.error("WebSocket error:", e);
        ws.close();
      };
    }

    conectar();

    return () => { wsRef.current?.close(); };
  }, [cargarHistorial]);

  return { live, historial, alertas, setAlertas, conectado };
}