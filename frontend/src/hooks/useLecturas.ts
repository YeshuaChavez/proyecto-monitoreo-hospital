import { useEffect, useRef, useState, useCallback } from "react";
import { Alerta, DatosSuero, DatosVitales, EstadoLive } from "../tipos";
import { API, getSuero, getVitales, getAlertas } from "../services/api";

export function useLecturas() {
  const [live, setLive] = useState<EstadoLive>({
    peso: 500, bomba: false, estado_suero: "NORMAL",
    fc: 0, spo2: 0, estado_vitales: "MIDIENDO",
    timestamp: "",
  });

  const [historialSuero,   setHistorialSuero]   = useState<DatosSuero[]>([]);
  const [historialVitales, setHistorialVitales] = useState<DatosVitales[]>([]);
  const [alertas,          setAlertas]          = useState<Alerta[]>([]);
  const [conectado,        setConectado]        = useState(false);

  const wsRef  = useRef<WebSocket | null>(null);
  const ultimosVitalesRef = useRef<DatosVitales | null>(null);

  // ── Pedir permiso notificaciones al iniciar ───────────────
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── Disparar notificación push ────────────────────────────
  const notificarPush = useCallback((alertasNuevas: Alerta[]) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    for (const alerta of alertasNuevas) {
      const emoji: Record<string, string> = {
        BOMBA_ON:      "💉",
        SUERO_CRITICO: "🚨",
        SUERO_BAJO:    "⚠️",
        FC_ALTA:       "❤️",
        FC_BAJA:       "❤️",
        SPO2_BAJA:     "🫁",
      };

      new Notification(`${emoji[alerta.tipo] ?? "⚠️"} Posta Médica — Alerta`, {
        body:              alerta.mensaje,
        icon:              "/favicon.ico",
        tag:               alerta.tipo,   // evita duplicados del mismo tipo
        requireInteraction: alerta.tipo === "SUERO_CRITICO" || alerta.tipo === "BOMBA_ON",
      });
    }
  }, []);

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

          // ── Suero (cada 1s) ───────────────────────────────
          if (msg.type === "lectura" && msg.data) {
            const s = msg.data as DatosSuero;
            setHistorialSuero(h => [...h.slice(-59), s]);
            setLive(prev => ({
              ...prev,
              peso:           s.peso,
              bomba:          s.bomba,
              estado_suero:   s.estado_suero,
              timestamp:      s.timestamp,
              fc:             ultimosVitalesRef.current?.fc             ?? prev.fc,
              spo2:           ultimosVitalesRef.current?.spo2           ?? prev.spo2,
              estado_vitales: ultimosVitalesRef.current?.estado_vitales ?? prev.estado_vitales,
            }));
          }

          // ── Vitales (cada 10s) ────────────────────────────
          if (msg.type === "vitales" && msg.data) {
            const v = msg.data as DatosVitales;
            if (v.fc > 0) {
              ultimosVitalesRef.current = v;
              setHistorialVitales(h => [...h.slice(-59), v]);
              setLive(prev => ({
                ...prev,
                fc:             v.fc,
                spo2:           v.spo2,
                estado_vitales: v.estado_vitales,
              }));
            }
          }

          // ── Alertas → push notification ───────────────────
          if (msg.type === "alertas" && msg.data?.length > 0) {
            setAlertas(a => [...msg.data, ...a].slice(0, 50));
            notificarPush(msg.data);  // ← dispara notificación del sistema
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
    historialSuero,
    historialVitales,
    alertas,
    setAlertas,
    conectado,
  };
}