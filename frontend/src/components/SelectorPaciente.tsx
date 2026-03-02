import { useState, useEffect, useRef } from "react";
import { PacienteDB, UsuarioLogin } from "../tipos";
import { UserCheck, RefreshCw, ChevronDown, AlertTriangle, CheckCircle, Loader } from "lucide-react";

const BASE = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) || "https://proyecto-monitoreo-posta-medica-production.up.railway.app";

type Paso = "seleccion" | "confirmacion" | "esperando_tare" | "listo";

interface Props {
  onPacienteSeleccionado: (p: PacienteDB) => void;
  pacienteActual:         PacienteDB | null;
  usuarioActual?:         UsuarioLogin | null;  // ← nuevo
}

const SelectorPaciente = ({ onPacienteSeleccionado, pacienteActual, usuarioActual }: Props) => {
  const [pacientes,    setPacientes]    = useState<PacienteDB[]>([]);
  const [abierto,      setAbierto]      = useState(false);
  const [seleccionado, setSeleccionado] = useState<number | null>(pacienteActual?.id ?? null);
  const [paso,         setPaso]         = useState<Paso>("seleccion");
  const [temp,         setTemp]         = useState<PacienteDB | null>(null);
  const [cargando,     setCargando]     = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const esAdmin = usuarioActual?.rol === "Administrador" || usuarioActual?.usuario === "admin";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node))
        setAbierto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    // Admin ve todos, doctor/enfermero solo sus pacientes
    const url = esAdmin || !usuarioActual
      ? `${BASE}/pacientes`
      : `${BASE}/pacientes?doctor_id=${usuarioActual.id}`;

    fetch(url)
      .then(r => r.json())
      .then(setPacientes)
      .catch(() => {});
  }, [usuarioActual]);

  useEffect(() => {
    fetch(`${BASE}/paciente-activo`)
      .then(r => r.json())
      .then(data => {
        if (data.paciente) {
          setSeleccionado(data.paciente.id);
          onPacienteSeleccionado(data.paciente);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelect = (p: PacienteDB) => {
    setAbierto(false);
    if (p.id === seleccionado) return;
    setTemp(p);
    setError(null);
    setPaso("confirmacion");
  };

  const confirmarCambio = async () => {
    if (!temp) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/paciente-activo`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ paciente_id: temp.id }),
      });
      if (!res.ok) throw new Error("Error al cambiar paciente");
      setPaso("esperando_tare");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const confirmarTare = async () => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/comandos`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ cmd: "tare", origen: "dashboard" }),
      });
      if (!res.ok) throw new Error("Error al calibrar báscula");
      setSeleccionado(temp!.id);
      onPacienteSeleccionado(temp!);
      setPaso("listo");
      setTimeout(() => {
        setPaso("seleccion");
        setTemp(null);
      }, 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const cancelar = () => {
    setPaso("seleccion");
    setTemp(null);
    setError(null);
  };

  const actual = pacientes.find(p => p.id === seleccionado) ?? pacienteActual;

  return (
    <>
      <div ref={dropRef} style={{ position: "relative", marginBottom: 20 }}>
        <div style={{
          background: "rgba(0,229,255,0.04)",
          border: "1px solid rgba(0,229,255,0.18)",
          borderRadius: 12, padding: "12px 18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <UserCheck size={16} color="#00e5ff" />
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 2 }}>
                PACIENTE EN MONITOREO
              </div>
              {actual ? (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>
                  {actual.nombre} {actual.apellido}
                  <span style={{ fontSize: 10, color: "#00e5ff", fontFamily: "'JetBrains Mono', monospace", marginLeft: 8 }}>
                    {actual.codigo}
                  </span>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#6b7280", fontStyle: "italic" }}>
                  {pacientes.length === 0
                    ? "No tienes pacientes asignados"
                    : "Ningún paciente seleccionado"}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setAbierto(a => !a)}
            disabled={pacientes.length === 0}
            style={{
              background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)",
              color: pacientes.length === 0 ? "#374151" : "#00e5ff",
              borderRadius: 8, padding: "7px 14px", fontSize: 12,
              cursor: pacientes.length === 0 ? "not-allowed" : "pointer", fontWeight: 600,
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <RefreshCw size={13} />
            Cambiar paciente
            <ChevronDown size={13} style={{ transform: abierto ? "rotate(180deg)" : "none", transition: "0.2s" }} />
          </button>
        </div>

        {abierto && (
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 200,
            background: "#0d111c", border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 12, minWidth: 360, maxHeight: 280, overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}>
            {pacientes.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#6b7280", fontSize: 12 }}>
                No tienes pacientes asignados
              </div>
            ) : pacientes.map(p => (
              <div
                key={p.id}
                onClick={() => handleSelect(p)}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  background: p.id === seleccionado ? "rgba(0,229,255,0.06)" : "transparent",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,229,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = p.id === seleccionado ? "rgba(0,229,255,0.06)" : "transparent")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{p.nombre} {p.apellido}</div>
                    <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {p.codigo || `PCT-${p.id}`} · {p.doctor || "Sin doctor"}
                    </div>
                  </div>
                  {p.id === seleccionado && (
                    <span style={{
                      fontSize: 9, color: "#00e5ff", fontFamily: "'JetBrains Mono', monospace",
                      background: "rgba(0,229,255,0.1)", borderRadius: 99, padding: "2px 8px",
                    }}>
                      ACTIVO
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL MULTI-PASO */}
      {paso !== "seleccion" && temp && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.82)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#0d111c",
            border: `1px solid ${paso === "listo" ? "rgba(16,185,129,0.4)" : paso === "esperando_tare" ? "rgba(0,229,255,0.3)" : "rgba(245,158,11,0.3)"}`,
            borderRadius: 18, padding: 32, width: 440,
            textAlign: "center", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: `linear-gradient(90deg, transparent, ${
                paso === "listo" ? "#10b981" : paso === "esperando_tare" ? "#00e5ff" : "#f59e0b"
              }, transparent)`,
              borderRadius: "18px 18px 0 0",
            }} />

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 20 }}>
              {[
                { n: 1, label: "Confirmar",     activo: paso === "confirmacion" },
                { n: 2, label: "Retirar bolsa", activo: paso === "esperando_tare" },
                { n: 3, label: "Listo",         activo: paso === "listo" },
              ].map((s, i) => (
                <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: s.activo ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${s.activo ? "#00e5ff" : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    color: s.activo ? "#00e5ff" : "#374151",
                  }}>
                    {s.n}
                  </div>
                  <span style={{ fontSize: 10, color: s.activo ? "#9ca3af" : "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
                    {s.label}
                  </span>
                  {i < 2 && <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.08)" }} />}
                </div>
              ))}
            </div>

            {paso === "confirmacion" && (
              <>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔄</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, color: "#f1f5f9" }}>Cambiar paciente activo</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>Se iniciará monitoreo para:</div>
                <div style={{
                  background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)",
                  borderRadius: 10, padding: "12px 16px", marginBottom: 16,
                }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#00e5ff" }}>{temp.nombre} {temp.apellido}</div>
                  <div style={{ fontSize: 11, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>
                    {temp.codigo || `PCT-${temp.id}`} · {temp.doctor || "Sin doctor"}
                  </div>
                </div>
                <div style={{
                  background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 20,
                  display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
                }}>
                  <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 11, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                    El sistema se reiniciará. En el siguiente paso se te pedirá retirar la bolsa antes de calibrar.
                  </div>
                </div>
                {error && <div style={{ marginBottom: 12, fontSize: 11, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>⚠ {error}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={confirmarCambio} disabled={cargando} style={{
                    flex: 1, background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.35)",
                    color: "#00e5ff", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 700,
                    cursor: cargando ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  }}>
                    {cargando ? <><Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> Enviando...</> : "✓ Confirmar"}
                  </button>
                  <button onClick={cancelar} style={{
                    flex: 1, background: "rgba(107,114,128,0.07)", border: "1px solid rgba(107,114,128,0.2)",
                    color: "#6b7280", borderRadius: 10, padding: "11px 0", fontSize: 13, cursor: "pointer",
                  }}>Cancelar</button>
                </div>
              </>
            )}

            {paso === "esperando_tare" && (
              <>
                <div style={{ fontSize: 44, marginBottom: 12 }}>🧴</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "#f1f5f9" }}>Retire la bolsa de suero</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20, lineHeight: 1.6 }}>
                  Desconecte y retire la bolsa del paciente anterior de la báscula.<br/>
                  <span style={{ color: "#00e5ff", fontWeight: 600 }}>Cuando la báscula esté vacía, presione el botón.</span>
                </div>
                <div style={{
                  background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)",
                  borderRadius: 10, padding: "12px 16px", marginBottom: 20,
                  fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace",
                  textAlign: "left", lineHeight: 1.8,
                }}>
                  <div>① Cierra la pinza del catéter</div>
                  <div>② Retira la bolsa del soporte</div>
                  <div>③ Asegúrate de que la báscula esté libre</div>
                  <div>④ Presiona <span style={{ color: "#00e5ff" }}>"Báscula vacía"</span></div>
                </div>
                {error && <div style={{ marginBottom: 12, fontSize: 11, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>⚠ {error}</div>}
                <button onClick={confirmarTare} disabled={cargando} style={{
                  width: "100%",
                  background: cargando ? "rgba(0,229,255,0.04)" : "rgba(0,229,255,0.12)",
                  border: `1px solid ${cargando ? "rgba(0,229,255,0.1)" : "rgba(0,229,255,0.4)"}`,
                  color: cargando ? "#374151" : "#00e5ff",
                  borderRadius: 10, padding: "12px 0", fontSize: 13, fontWeight: 700,
                  cursor: cargando ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}>
                  {cargando
                    ? <><Loader size={13} style={{ animation: "spin 1s linear infinite" }} /> Calibrando...</>
                    : <><CheckCircle size={14} /> Báscula vacía — calibrar</>
                  }
                </button>
                <div style={{ marginTop: 10, fontSize: 10, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
                  El ESP32 emitirá 2 pitidos cuando esté listo
                </div>
              </>
            )}

            {paso === "listo" && (
              <>
                <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: "#10b981" }}>Sistema listo</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Báscula calibrada correctamente.</div>
                <div style={{
                  background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                  borderRadius: 10, padding: "10px 16px",
                  fontSize: 12, color: "#10b981", fontFamily: "'JetBrains Mono', monospace",
                }}>
                  Coloca la nueva bolsa de suero para iniciar monitoreo de{" "}
                  <span style={{ fontWeight: 700 }}>{temp.nombre} {temp.apellido}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export default SelectorPaciente;