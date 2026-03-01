import { useEffect, useRef, useState, useCallback } from "react";
import { Alerta } from "../tipos";
import { API, getSuero, getVitales, getAlertas } from "../services/api";

const SIMULAR = false;

// ── Tipos locales alineados con las tablas separadas ──────────
export interface DatosSuero {
  id:           number;
  timestamp:    string;
  time:         string;
  peso:         number;
  bomba:        boolean;
  estado_suero: string;
}

export interface DatosVitales {
  id:             number;
  timestamp:      string;
  time:           string;
  fc:             number;
  spo2:           number;
  estado_vitales: string;
}

// Estado combinado que usa el dashboard para mostrar todo junto
export interface EstadoLive {
  // suero
  peso:          number;
  bomba:         boolean;
  estado_suero:  string;
  // vitales
  fc:            number;
  spo2:          number;
  estado_vitales: string;
  // meta
  timestamp:     string;
}

function generarSimulado(prev: EstadoLive): EstadoLive {
  return {
    peso:           Math.max(0, (prev.peso || 500) - Math.random() * 2),
    bomba:          (prev.peso || 500) < 100,
    estado_suero:   "NORMAL",
    fc:             Math.max(50, Math.min(130, (prev.fc || 75) + (Math.random() - 0.5) * 6)),
    spo2:           Math.max(85, Math.min(100, (prev.spo2 || 98) + (Math.random() - 0.5) * 2)),
    estado_vitales: "NORMAL",
    timestamp:      new Date().toISOString(),
  };
}

export function useLecturas() {
  const [live, setLive] = useState<EstadoLive>({
    peso: 500, bomba: false, estado_suero: "NORMAL",
    fc: 0, spo2: 0, estado_vitales: "MIDIENDO",
    timestamp: "",
  });

  // Historial separado por tabla
  const [historialSuero,   setHistorialSuero]   = useState<DatosSuero[]>([]);
  const [historialVitales, setHistorialVitales] = useState<DatosVitales[]>([]);
  const [alertas,          setAlertas]          = useState<Alerta[]>([]);
  const [conectado,        setConectado]        = useState(false);

  const wsRef  = useRef<WebSocket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Últimos vitales conocidos — persiste entre actualizaciones de suero
  const ultimosVitalesRef = useRef<DatosVitales | null>(null);

  const cargarHistorial = useCallback(async () => {
    try {
      const [suero, vitales, alts] = await Promise.all([
        getSuero(60),
        getVitales(60),
        getAlertas(20),
      ]);

      if (suero?.length)   setHistorialSuero(suero);
      if (vitales?.length) {
        setHistorialVitales(vitales);
        ultimosVitalesRef.current = vitales[vitales.length - 1];
      }
      if (alts?.length) setAlertas(alts);

      // Estado inicial combinado
      const ultimoSuero   = suero?.[suero.length - 1];
      const ultimoVitales = vitales?.[vitales.length - 1];

      setLive(prev => ({
        ...prev,
        ...(ultimoSuero   ? { peso: ultimoSuero.peso, bomba: ultimoSuero.bomba, estado_suero: ultimoSuero.estado_suero, timestamp: ultimoSuero.timestamp } : {}),
        ...(ultimoVitales ? { fc: ultimoVitales.fc, spo2: ultimoVitales.spo2, estado_vitales: ultimoVitales.estado_vitales } : {}),
      }));

    } catch (e) {
      console.warn("Error cargando historial:", e);
    }
  }, []);

  useEffect(() => {
    if (SIMULAR) {
      simRef.current = setInterval(() => {
        setLive(prev => {
          const nueva = generarSimulado(prev);
          setHistorialSuero(h => [...h.slice(-59), {
            id: Date.now(), timestamp: nueva.timestamp, time: "",
            peso: nueva.peso, bomba: nueva.bomba, estado_suero: nueva.estado_suero,
          }]);
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
        console.log("✅ WebSocket conectado");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // ── Suero (cada 1s) → tabla suero ──────────────────
          if (msg.type === "lectura" && msg.data) {
            const s: DatosSuero = msg.data;

            // Actualizar historial de suero
            setHistorialSuero(h => [...h.slice(-59), s]);

            // Actualizar live: peso/bomba del mensaje + fc/spo2 del ref
            setLive(prev => ({
              ...prev,
              peso:          s.peso,
              bomba:         s.bomba,
              estado_suero:  s.estado_suero,
              timestamp:     s.timestamp,
              // vitales: conservar último promedio conocido
              fc:   ultimosVitalesRef.current?.fc   ?? prev.fc,
              spo2: ultimosVitalesRef.current?.spo2 ?? prev.spo2,
              estado_vitales: ultimosVitalesRef.current?.estado_vitales ?? prev.estado_vitales,
            }));
          }

          // ── Vitales (cada 10s) → tabla vitales ─────────────
          if (msg.type === "vitales" && msg.data) {
            const v: DatosVitales = msg.data;

            if (v.fc > 0) {
              // Actualizar ref y historial de vitales
              ultimosVitalesRef.current = v;
              setHistorialVitales(h => [...h.slice(-59), v]);

              // Actualizar live: fc/spo2 del promedio + peso/bomba actuales
              setLive(prev => ({
                ...prev,
                fc:             v.fc,
                spo2:           v.spo2,
                estado_vitales: v.estado_vitales,
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

  return {
    live,
    historialSuero,    // para gráfica de peso
    historialVitales,  // para gráfica de FC/SpO2
    alertas,
    setAlertas,
    conectado,
  };
}