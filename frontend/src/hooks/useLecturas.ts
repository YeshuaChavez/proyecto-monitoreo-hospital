import { useEffect, useRef, useState, useCallback } from "react";
import { Lectura, Alerta } from "../tipos";
import { API, getLecturas, getAlertas } from "../services/api";

const SIMULAR = false;

function generarLecturaSimulada(prev: Lectura): Lectura {
  return {
    id:             Date.now(),
    timestamp:      new Date().toISOString(),
    fc:             Math.max(50, Math.min(130, (prev.fc || 75) + (Math.random() - 0.5) * 6)),
    spo2:           Math.max(85, Math.min(100, (prev.spo2 || 98) + (Math.random() - 0.5) * 2)),
    peso:           Math.max(0, (prev.peso || 500) - Math.random() * 2),
    bomba:          (prev.peso || 500) < 100,
    estado_suero:   "NORMAL",
    estado_vitales: null,
  };
}

export function useLecturas() {
  const [live, setLive] = useState<Lectura>({
    id: 0, timestamp: "", fc: 0, spo2: 0,
    peso: 500, bomba: false, estado_suero: "NORMAL", estado_vitales: null,
  });
  const [historial, setHistorial] = useState<Lectura[]>([]);
  const [alertas, setAlertas]     = useState<Alerta[]>([]);
  const [conectado, setConectado] = useState(false);

  const wsRef  = useRef<WebSocket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mantiene los últimos vitales conocidos para no perderlos
  // cuando llega una actualización de solo suero
  const ultimosVitalesRef = useRef({ fc: 0, spo2: 0, estado_vitales: null as string | null });

  const cargarHistorial = useCallback(async () => {
    try {
      const [lects, alts] = await Promise.all([getLecturas(50), getAlertas(20)]);
      if (lects?.length) {
        setHistorial(lects);
        // Buscar la última lectura con vitales válidos para inicializar
        const ultimaConVitales = [...lects].reverse().find(l => l.fc && l.fc > 0);
        const ultimaConPeso    = [...lects].reverse().find(l => l.peso !== null);
        if (ultimaConVitales) {
          ultimosVitalesRef.current = {
            fc:             ultimaConVitales.fc,
            spo2:           ultimaConVitales.spo2,
            estado_vitales: ultimaConVitales.estado_vitales,
          };
        }
        // Estado inicial combinando última lectura con últimos vitales
        setLive(prev => ({
          ...prev,
          ...(ultimaConPeso    ? { peso: ultimaConPeso.peso, bomba: ultimaConPeso.bomba, estado_suero: ultimaConPeso.estado_suero } : {}),
          ...(ultimaConVitales ? { fc: ultimaConVitales.fc, spo2: ultimaConVitales.spo2, estado_vitales: ultimaConVitales.estado_vitales } : {}),
        }));
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

          // ── Topic lecturas (cada 1s): peso + bomba ──────────
          // Usa msg.estado.fc/spo2 que el backend mantiene
          // actualizados con los últimos vitales conocidos
          if (msg.type === "lectura" && msg.data) {
            const estado = msg.estado ?? {};

            setLive(prev => {
              // FC y SpO2: usar los del estado combinado si están disponibles,
              // sino conservar los últimos conocidos del ref
              const fc   = estado.fc   && estado.fc   > 0 ? estado.fc   : ultimosVitalesRef.current.fc;
              const spo2 = estado.spo2 && estado.spo2 > 0 ? estado.spo2 : ultimosVitalesRef.current.spo2;

              return {
                ...prev,
                id:            msg.data.id        ?? prev.id,
                timestamp:     msg.data.timestamp ?? prev.timestamp,
                peso:          msg.data.peso       ?? prev.peso,
                bomba:         msg.data.bomba      ?? prev.bomba,
                estado_suero:  msg.data.estado_suero ?? prev.estado_suero,
                fc,
                spo2,
                estado_vitales: ultimosVitalesRef.current.estado_vitales,
              };
            });

            // Agregar al historial solo si tiene peso (lectura de suero)
            if (msg.data.peso !== null && msg.data.peso !== undefined) {
              setHistorial(h => [...h.slice(-49), msg.data]);
            }
          }

          // ── Topic vitales (cada 10s): fc + spo2 promediados ─
          if (msg.type === "vitales" && msg.data) {
            const { fc, spo2, estado_vitales } = msg.data;

            if (fc && fc > 0) {
              // Actualizar ref de últimos vitales conocidos
              ultimosVitalesRef.current = { fc, spo2, estado_vitales };

              // Hacer merge en live: conservar peso/bomba actuales
              setLive(prev => ({
                ...prev,
                fc,
                spo2,
                estado_vitales,
              }));
            }
          }

          // ── Alertas ─────────────────────────────────────────
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