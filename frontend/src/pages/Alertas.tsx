import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle, AlertOctagon, Syringe,
  Heart, Wind, CheckCircle, Trash2, Bell,
} from "lucide-react";
import InsigniaAlerta from "../components/InsigniaAlerta";
import { Alerta } from "../tipos";

interface Props {
  alertas:        Alerta[];
  limpiarAlertas: () => void;
}

type Filtro = "todas" | "vitales" | "suero";

function severidad(tipo: string): "critical" | "warn" {
  return ["SUERO_CRITICO", "FC_ALTA", "FC_BAJA", "SPO2_BAJA"].includes(tipo)
    ? "critical" : "warn";
}

function IconoAlerta({ tipo, size = 18 }: { tipo: string; size?: number }) {
  const props = { size, strokeWidth: 2 };
  switch (tipo) {
    case "SUERO_CRITICO": return <AlertOctagon  {...props} color="#ef4444" />;
    case "SUERO_BAJO":    return <AlertTriangle {...props} color="#f59e0b" />;
    case "BOMBA_ON":      return <Syringe       {...props} color="#a78bfa" />;
    case "FC_ALTA":       return <Heart         {...props} color="#ef4444" />;
    case "FC_BAJA":       return <Heart         {...props} color="#f59e0b" />;
    case "SPO2_BAJA":     return <Wind          {...props} color="#ef4444" />;
    default:              return <AlertTriangle {...props} color="#f59e0b" />;
  }
}

function esTipoVital(tipo: string) { return ["FC_ALTA","FC_BAJA","SPO2_BAJA"].includes(tipo); }
function esTipoSuero(tipo: string) { return ["SUERO_CRITICO","SUERO_BAJO","BOMBA_ON"].includes(tipo); }

function agrupar(alertas: Alerta[]) {
  const grupos: { alerta: Alerta; count: number; key: string }[] = [];
  for (const a of alertas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.alerta.tipo === a.tipo) {
      ultimo.count++;
    } else {
      grupos.push({ alerta: a, count: 1, key: `${a.id}-${a.tipo}` });
    }
  }
  return grupos;
}

const Alertas = ({ alertas, limpiarAlertas }: Props) => {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [nuevas, setNuevas] = useState<Set<number>>(new Set());
  const prevLengthRef       = useRef(alertas.length);

  useEffect(() => {
    if (alertas.length > prevLengthRef.current) {
      const diff = alertas.length - prevLengthRef.current;
      const ids  = new Set(alertas.slice(alertas.length - diff).map(a => a.id));
      setNuevas(ids);
      const t = setTimeout(() => setNuevas(new Set()), 1200);
      prevLengthRef.current = alertas.length;
      return () => clearTimeout(t);
    }
    prevLengthRef.current = alertas.length;
  }, [alertas]);

  const criticos     = alertas.filter(a => severidad(a.tipo) === "critical").length;
  const advertencias = alertas.filter(a => severidad(a.tipo) === "warn").length;

  const filtradas = alertas.filter(a => {
    if (filtro === "vitales") return esTipoVital(a.tipo);
    if (filtro === "suero")   return esTipoSuero(a.tipo);
    return true;
  });

  const agrupadas = agrupar(filtradas);

  const btnFiltro = (f: Filtro, label: string, count: number, color: string) => {
    const activo = filtro === f;
    return (
      <button
        onClick={() => setFiltro(f)}
        style={{
          background: activo ? `${color}18` : "rgba(255,255,255,0.03)",
          border: `1px solid ${activo ? color : "rgba(255,255,255,0.08)"}`,
          color: activo ? color : "#6b7280",
          borderRadius: 8, padding: "6px 14px",
          fontSize: 11, cursor: "pointer", fontWeight: activo ? 700 : 400,
          fontFamily: "'JetBrains Mono', monospace",
          transition: "all 0.15s",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        {label}
        {count > 0 && (
          <span style={{
            background: activo ? color : "rgba(255,255,255,0.08)",
            color: activo ? "#000" : "#6b7280",
            borderRadius: 99, padding: "1px 6px",
            fontSize: 9, fontWeight: 700,
          }}>
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={20} color="#e2e8f0" /> Registro de Alertas
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            {criticos > 0 && (
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: "#ef4444", background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 6, padding: "2px 8px",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <AlertOctagon size={11}/> {criticos} crítico{criticos !== 1 ? "s" : ""}
              </span>
            )}
            {advertencias > 0 && (
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: "#f59e0b", background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 6, padding: "2px 8px",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <AlertTriangle size={11}/> {advertencias} advertencia{advertencias !== 1 ? "s" : ""}
              </span>
            )}
            {alertas.length === 0 && (
              <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>
                Sin eventos registrados
              </span>
            )}
          </div>
        </div>

        <button onClick={limpiarAlertas} style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          color: "#ef4444", borderRadius: 8, padding: "8px 16px",
          fontSize: 12, cursor: "pointer", fontWeight: 600,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Trash2 size={13}/> Limpiar
        </button>
      </div>

      {/* Filtros */}
      {alertas.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {btnFiltro("todas",   "Todas",   alertas.length,                                  "#e2e8f0")}
          {btnFiltro("vitales", "Vitales", alertas.filter(a => esTipoVital(a.tipo)).length, "#f43f5e")}
          {btnFiltro("suero",   "Suero",   alertas.filter(a => esTipoSuero(a.tipo)).length, "#a78bfa")}
        </div>
      )}

      {/* Lista */}
      {agrupadas.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: "rgba(13,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <CheckCircle size={48} color="#10b981" strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981" }}>
            {filtro === "todas" ? "Sin alertas activas" : `Sin alertas de ${filtro}`}
          </div>
          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 6 }}>
            {filtro === "todas"
              ? "Todos los signos vitales dentro de parámetros normales"
              : "Prueba cambiando el filtro"}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agrupadas.map(({ alerta, count, key }) => {
            const sev     = severidad(alerta.tipo);
            const esNueva = nuevas.has(alerta.id);
            return (
              <div
                key={key}
                style={{
                  background: esNueva
                    ? sev === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)"
                    : "rgba(13,17,28,0.8)",
                  border:     `1px solid ${sev === "critical" ? "#ef444430" : "#f59e0b30"}`,
                  borderLeft: `3px solid ${sev === "critical" ? "#ef4444"   : "#f59e0b"}`,
                  borderRadius: 10, padding: "14px 18px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  transition: "background 0.4s ease",
                  animation: esNueva ? "pulseAlert 0.6s ease" : "fadeIn 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <IconoAlerta tipo={alerta.tipo} size={20} />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: sev === "critical" ? "#ef4444" : "#f59e0b" }}>
                        {alerta.mensaje}
                      </span>
                      {count > 1 && (
                        <span style={{
                          fontSize: 9, fontWeight: 800,
                          background: sev === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                          color: sev === "critical" ? "#ef4444" : "#f59e0b",
                          borderRadius: 99, padding: "2px 7px",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          ×{count}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {alerta.time} · {sev === "critical" ? "CRÍTICO — Requiere atención inmediata" : "ADVERTENCIA — Revisar paciente"}
                    </div>
                  </div>
                </div>
                <InsigniaAlerta label={sev === "critical" ? "CRÍTICO" : "ALERTA"} type={sev} />
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes pulseAlert {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.012); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Alertas;