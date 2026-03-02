import { useEffect, useRef, useState, useCallback } from "react";
import { Alerta, EstadoLive, DatosSuero, DatosVitales } from "../tipos";
import { API, getSueroPorMinuto, getVitalesPorMinuto, getAlertas } from "../services/api";

const SIMULAR = false;

export function useLecturas(onPacienteActivo?: () => void) {
  const [live, setLive] = useState<EstadoLive>({
    fc: 0, spo2: 0, peso: 500,
    bomba: false, estado_suero: "NORMAL", estado_vitales: "MIDIENDO",
  });
  const [historialSuero,   setHistorialSuero]   = useState<DatosSuero[]>([]);
  const [historialVitales, setHistorialVitales] = useState<DatosVitales[]>([]);
  const [alertas,    setAlertas]    = useState<Alerta[]>([]);
  const [conectado,  setConectado]  = useState(false);

  const wsRef             = useRef<WebSocket | null>(null);
  const ultimosVitalesRef = useRef<{ fc: number; spo2: number; estado_vitales: string }>({
    fc: 0, spo2: 0, estado_vitales: "MIDIENDO",
  });
  const onPacienteActivoRef = useRef(onPacienteActivo);
  useEffect(() => { onPacienteActivoRef.current = onPacienteActivo; }, [onPacienteActivo]);

  const resetEstado = useCallback(() => {
    setLive({ fc:0, spo2:0, peso:500, bomba:false, estado_suero:"NORMAL", estado_vitales:"MIDIENDO" });
    setHistorialSuero([]);
    setHistorialVitales([]);
    setAlertas([]);
    ultimosVitalesRef.current = { fc:0, spo2:0, estado_vitales:"MIDIENDO" };
  }, []);

  const cargarHistorial = useCallback(async () => {
    try {
      const [suero, vitales, alts] = await Promise.all([
        getSueroPorMinuto(60),
        getVitalesPorMinuto(60),
        getAlertas(50),
      ]);
      if (suero?.length) {
        setHistorialSuero(suero);
        setLive(l => ({ ...l, ...suero[suero.length - 1] }));
      }
      if (vitales?.length) {
        setHistorialVitales(vitales);
        const ultimo = vitales[vitales.length - 1];
        ultimosVitalesRef.current = { fc: ultimo.fc, spo2: ultimo.spo2, estado_vitales: ultimo.estado_vitales };
        setLive(l => ({ ...l, fc: ultimo.fc, spo2: ultimo.spo2, estado_vitales: ultimo.estado_vitales }));
      }
      if (alts?.length) setAlertas(alts);
    } catch (e) { console.warn("Error cargando historial:", e); }
  }, []);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      try {
        const [suero, alts] = await Promise.all([
          getSueroPorMinuto(60),
          getAlertas(50),
        ]);
        if (suero?.length) {
          setHistorialSuero(suero);
          setLive(l => ({ ...l, ...suero[suero.length - 1] }));
        }
        if (alts?.length) setAlertas(alts);
      } catch (e) { console.warn("Error recargando:", e); }
    }, 60_000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (SIMULAR) return;
    cargarHistorial();

    function conectar() {
      const ws = new WebSocket(API.ws);
      wsRef.current = ws;

      ws.onopen = () => { setConectado(true); console.log("✅ WebSocket conectado"); };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "paciente_activo") {
            resetEstado();
            // Pequeño delay para que el backend termine de setear el nuevo paciente_activo_id
            setTimeout(() => {
              cargarHistorial();
              onPacienteActivoRef.current?.();
            }, 500);  // 500ms es suficiente
            return;
          }

          if (msg.type === "lectura" && msg.data) {
            const suero: DatosSuero = msg.data;
            setHistorialSuero(prev => {
              const nuevo = [...prev, suero];
              return nuevo.slice(-300); // mantener últimas 300 lecturas (~5min)
            });
            const vRef = ultimosVitalesRef.current;
            const fc   = (msg.estado?.fc   && msg.estado.fc   > 0) ? msg.estado.fc   : vRef.fc;
            const spo2 = (msg.estado?.spo2 && msg.estado.spo2 > 0) ? msg.estado.spo2 : vRef.spo2;
            const ev   = msg.estado?.estado_vitales || vRef.estado_vitales;
            setLive({
              fc, spo2,
              peso:           suero.peso,
              bomba:          suero.bomba,
              estado_suero:   suero.estado_suero,
              estado_vitales: ev,
            });
          }

          if (msg.type === "vitales" && msg.data) {
            const vitales: DatosVitales = msg.data;
            if (vitales.fc > 0 && vitales.spo2 > 0) {
              ultimosVitalesRef.current = {
                fc:             vitales.fc,
                spo2:           vitales.spo2,
                estado_vitales: vitales.estado_vitales,
              };
              setLive(l => ({ ...l, fc: vitales.fc, spo2: vitales.spo2, estado_vitales: vitales.estado_vitales }));

              // ← NUEVO
              setHistorialVitales(prev => {
                const now = new Date();
                const punto: DatosVitales = {
                  id:             vitales.id ?? Date.now(),
                  timestamp:      vitales.timestamp ?? now.toISOString(),
                  time:           vitales.time ?? now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  paciente_id:    vitales.paciente_id,
                  fc:             vitales.fc,
                  spo2:           vitales.spo2,
                  estado_vitales: vitales.estado_vitales,
                };
                return [...prev, punto].slice(-60); // 60 puntos × 10s = últimos 10 min
              });
            }
          }

          if (msg.type === "alertas" && msg.data) {
            setAlertas(a => [...msg.data, ...a].slice(0, 50));
          }
        } catch (e) { console.warn("Error WS:", e); }
      };

      ws.onclose = () => {
        setConectado(false);
        console.warn("WS cerrado, reconectando en 3s...");
        setTimeout(conectar, 3000);
      };
      ws.onerror = () => ws.close();
    }

    conectar();
    return () => { wsRef.current?.close(); };
  }, [cargarHistorial, resetEstado]);

  return { live, historialSuero, historialVitales, alertas, setAlertas, conectado, resetEstado };
}