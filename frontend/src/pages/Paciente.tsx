import { useState } from "react";
import {
  User, Users, Pencil, Save, X, Play, Square,
  Droplets, Mail, Heart, Activity, AlertTriangle,
  ChevronRight, Stethoscope, ClipboardList, Phone,
  MapPin, Calendar, Syringe, Wifi, Send,
} from "lucide-react";
import InsigniaAlerta from "../components/InsigniaAlerta";
import BarraFluido from "../components/BarraFluido";
import EscenaPaciente from "../components/EscenaPaciente";
import SelectorPaciente from "../components/SelectorPaciente";
import { EstadoLive, Alerta, PacienteDB, UsuarioLogin } from "../tipos";
import { enviarComando, enviarEmail } from "../services/api";



interface Props {
  live:            EstadoLive;
  alertas?:         Alerta[];
  onPacienteSeleccionado?: () => void;
  usuarioActual?:  UsuarioLogin | null;
}

const Campo = ({ label, valor, icon }: { label: string; valor?: string; icon?: React.ReactNode }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
    <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
      {icon && <span style={{ opacity: 0.6 }}>{icon}</span>}
      {label}
    </span>
    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{valor || "—"}</span>
  </div>
);

const SeccionLabel = ({ color, children }: { color: string; children: string }) => (
  <div style={{ fontSize: 9, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.13em", marginBottom: 12 }}>{children}</div>
);

const TopBar = ({ color }: { color: string }) => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }}/>
);

const Paciente = ({ live, alertas = [], onPacienteSeleccionado, usuarioActual }: Props) => {
  if (!live) return null;

  const [pacienteActual, setPacienteActual] = useState<PacienteDB | null>(null);
  const [enviando,  setEnviando]  = useState(false);
  const [bombaLocal, setBombaLocal] = useState<boolean | null>(null); // null = usa live.bomba
  const [error,     setError]     = useState<string | null>(null);
  const [modalEmail, setModalEmail]       = useState(false);
  const [emailDest,  setEmailDest]        = useState("");
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [emailOk,    setEmailOk]          = useState<string | null>(null);

  const fluidoStatus = live.peso <= 100 ? "critical" : live.peso <= 150 ? "warn" : "ok";
  const bombaOn      = bombaLocal !== null ? bombaLocal : live.bomba;
  const estadoBomba  = bombaOn ? "AUTO — Bomba activa por ESP32" : "STANDBY — Bomba en espera";
  const codigoPaciente = pacienteActual
    ? (pacienteActual.codigo || `PCT-${pacienteActual.id}`)
    : "—";

  const handleComando = async (cmd: "bomba_on" | "bomba_off") => {
    setEnviando(true); setError(null);
    // Estado optimista — actualiza UI inmediatamente sin esperar ESP32
    setBombaLocal(cmd === "bomba_on");
    try {
      await enviarComando(cmd);
    } catch {
      setError("Error al enviar comando. Verifica la conexión.");
      setBombaLocal(null); // revierte si hay error
    } finally {
      setEnviando(false);
      // Después de 3s devuelve control al estado real del WebSocket
      setTimeout(() => setBombaLocal(null), 3000);
    }
  };

  const handleEnviarEmail = async () => {
    if (!emailDest) return;
    setEnviandoEmail(true); setEmailOk(null);
    try {
      await enviarEmail(emailDest, live, alertas);
      setEmailOk("✅ Correo enviado correctamente");
      setTimeout(() => { setModalEmail(false); setEmailOk(null); setEmailDest(""); }, 2000);
    } catch { setEmailOk("❌ Error al enviar correo"); }
    finally { setEnviandoEmail(false); }
  };

  const alertasCriticas = alertas.filter(a => ["SUERO_CRITICO","FC_ALTA","FC_BAJA","SPO2_BAJA"].includes(a.tipo)).length;
  const alertasTotal    = alertas.length;

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,229,255,0.3)",
    color: "#e2e8f0", borderRadius: 6, padding: "5px 9px",
    fontSize: 11, fontFamily: "'JetBrains Mono', monospace", width: "100%", outline: "none",
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Selector de paciente */}
      <SelectorPaciente
        pacienteActual={pacienteActual}
        usuarioActual={usuarioActual}
        onPacienteSeleccionado={(p) => {
          setPacienteActual(p);
          onPacienteSeleccionado?.();
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ficha del Paciente</h2>
          <p style={{ fontSize: 11, color: "#4b5563", margin: "3px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
            {codigoPaciente} · Consultorio General
          </p>
        </div>
      </div>

      {/* Sin paciente seleccionado */}
      {!pacienteActual ? (
        <div style={{
          textAlign: "center", padding: "80px 20px",
          background: "rgba(13,17,28,0.8)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 16,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#6b7280" }}>Sin paciente activo</div>
          <div style={{ fontSize: 12, color: "#374151", marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            Selecciona un paciente usando el selector de arriba
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }}>

          {/* SVG EscenaPaciente */}
          <div style={{
            background: "rgba(3,8,15,0.97)", border: "1px solid rgba(0,180,255,0.13)",
            borderRadius: 16, overflow: "hidden", position: "sticky", top: 72,
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#00cfff,transparent)", zIndex: 1 }}/>
            <div style={{ position: "absolute", top: 11, left: 14, zIndex: 2, fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "rgba(0,200,255,0.38)", letterSpacing: "0.18em", display: "flex", alignItems: "center", gap: 6 }}>
              <Wifi size={8} color="rgba(0,200,255,0.38)"/>
              VISUALIZACIÓN EN TIEMPO REAL · ESP32
            </div>
            <EscenaPaciente lectura={live} />
          </div>

          {/* Columna derecha */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* 1. Datos personales */}
            <div style={{ background: "rgba(13,17,28,0.88)", border: "1px solid rgba(0,229,255,0.13)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
              <TopBar color="#00e5ff"/>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 13 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#1e2436,#2d3748)", border: "2px solid rgba(0,229,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <User size={18} color="#00e5ff"/>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
                    {pacienteActual.nombre} {pacienteActual.apellido}
                  </div>
                  <InsigniaAlerta label={codigoPaciente} type="ok"/>
                </div>
              </div>
              <SeccionLabel color="#00e5ff">DATOS PERSONALES</SeccionLabel>
              <Campo label="ID Paciente"     valor={codigoPaciente}                   icon={<ClipboardList size={11}/>}/>
              <Campo label="Doctor asignado" valor={pacienteActual.doctor || "—"}             icon={<Stethoscope size={11}/>}/>
              <Campo label="Grupo sanguíneo" valor={pacienteActual.grupo_sanguineo || "—"}    icon={<Droplets size={11}/>}/>
              <Campo label="Fecha nac."      valor={pacienteActual.fecha_nacimiento || "—"}   icon={<Calendar size={11}/>}/>
              <Campo label="Fecha ingreso"   valor={pacienteActual.fecha_ingreso || "—"}      icon={<Calendar size={11}/>}/>
              <Campo label="Dirección"       valor={pacienteActual.direccion || "—"}          icon={<MapPin size={11}/>}/>
            </div>

            {/* 2. Contacto familiar */}
            <div style={{ background: "rgba(13,17,28,0.88)", border: "1px solid rgba(167,139,250,0.16)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
              <TopBar color="#a78bfa"/>
              <SeccionLabel color="#a78bfa">CONTACTO FAMILIAR</SeccionLabel>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.28)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Users size={15} color="#a78bfa"/>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{pacienteActual.contacto_nombre || "—"}</div>
                  <div style={{ fontSize: 10, color: "#6b7280" }}>{pacienteActual.contacto_relacion || "—"}</div>
                </div>
              </div>
              <Campo label="Teléfono" valor={pacienteActual.contacto_telefono || "—"} icon={<Phone size={11}/>}/>
              <Campo label="Relación" valor={pacienteActual.contacto_relacion || "—"}  icon={<ChevronRight size={11}/>}/>
              <div style={{ marginTop: 14 }}>
                <button onClick={() => setModalEmail(true)} style={{
                  width: "100%", background: "rgba(16,185,129,0.07)",
                  border: "1px solid rgba(16,185,129,0.25)", color: "#10b981",
                  borderRadius: 8, padding: "9px 0", fontSize: 12,
                  cursor: "pointer", fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <Mail size={14}/> ENVIAR REPORTE
                </button>
              </div>
            </div>

            {/* 3. Fluido IV y Bomba */}
            <div style={{ background: "rgba(13,17,28,0.88)", border: `1px solid ${bombaOn ? "rgba(245,158,11,0.28)" : "rgba(16,185,129,0.16)"}`, borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
              <TopBar color={bombaOn ? "#f59e0b" : "#10b981"}/>
              <SeccionLabel color={bombaOn ? "#f59e0b" : "#10b981"}>FLUIDO IV Y BOMBA PERISTÁLTICA</SeccionLabel>
              <div style={{ marginBottom: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", display: "flex", alignItems: "center", gap: 6 }}>
                    <Droplets size={13} color="#9ca3af"/> Nivel actual
                  </span>
                  <InsigniaAlerta label={fluidoStatus === "ok" ? "Normal" : fluidoStatus === "warn" ? "Bajo" : "Crítico"} type={fluidoStatus}/>
                </div>
                <BarraFluido peso={live.peso}/>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                  <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>0 ml</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{live.peso.toFixed(1)} ml</span>
                  <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>500 ml</span>
                </div>
                <div style={{ marginTop: 7, fontSize: 10, color: "#4b5563", display: "flex", gap: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertTriangle size={10} color="#f59e0b"/> Advertencia: 150 ml
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Activity size={10} color="#ef4444"/> Bomba ON: 100 ml
                  </span>
                </div>
              </div>

              <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>CONTROL MANUAL REMOTO</div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={() => handleComando("bomba_on")} disabled={enviando || bombaOn} style={{
                  flex: 1, background: bombaOn ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.11)",
                  border: `1px solid ${bombaOn ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.4)"}`,
                  color: bombaOn ? "#4b5563" : "#f59e0b", borderRadius: 8, padding: "9px 4px",
                  fontSize: 11, cursor: (enviando || bombaOn) ? "not-allowed" : "pointer", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Play size={12}/> {enviando ? "..." : "INICIAR"}
                </button>
                <button onClick={() => handleComando("bomba_off")} disabled={enviando || !bombaOn} style={{
                  flex: 1, background: !bombaOn ? "rgba(239,68,68,0.03)" : "rgba(239,68,68,0.09)",
                  border: `1px solid ${!bombaOn ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.38)"}`,
                  color: !bombaOn ? "#4b5563" : "#ef4444", borderRadius: 8, padding: "9px 4px",
                  fontSize: 11, cursor: (enviando || !bombaOn) ? "not-allowed" : "pointer", fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Square size={12}/> {enviando ? "..." : "DETENER"}
                </button>
              </div>

              {error && (
                <div style={{ marginTop: 8, fontSize: 10, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertTriangle size={11}/> {error}
                </div>
              )}
              <div style={{
                marginTop: 10, padding: "7px 11px",
                background: bombaOn ? "rgba(245,158,11,0.07)" : "rgba(16,185,129,0.07)",
                border: `1px solid ${bombaOn ? "rgba(245,158,11,0.18)" : "rgba(16,185,129,0.18)"}`,
                borderRadius: 7, fontSize: 10,
                color: bombaOn ? "#f59e0b" : "#10b981",
                fontFamily: "'JetBrains Mono', monospace",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Syringe size={11}/> {estadoBomba}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Email */}
      {modalEmail && pacienteActual && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#0d111c", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 16, padding: 28, width: 420, position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#10b981,transparent)", borderRadius: "16px 16px 0 0" }}/>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
              <Mail size={16} color="#10b981"/> Enviar reporte por correo
            </h3>
            <p style={{ fontSize: 11, color: "#4b5563", margin: "0 0 20px", fontFamily: "'JetBrains Mono', monospace" }}>
              Se enviará el reporte del paciente con PDF adjunto
            </p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>CORREO DESTINATARIO</div>
              <input type="email" placeholder="familiar@gmail.com" value={emailDest} onChange={e => setEmailDest(e.target.value)}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,229,255,0.3)", color: "#e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)", borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ color: "#9ca3af", marginBottom: 8, fontSize: 10, letterSpacing: "0.1em" }}>CONTENIDO DEL REPORTE</div>
              <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <User size={11} color="#6b7280"/>
                <span style={{ color: "#e2e8f0" }}>{pacienteActual.nombre} {pacienteActual.apellido}</span>
                <span style={{ color: "#374151" }}>· {codigoPaciente}</span>
              </div>
              <div style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Heart size={11} color="#f43f5e"/>
                  <span style={{ color: "#f43f5e" }}>{live.fc > 0 ? live.fc + " bpm" : "--"}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Activity size={11} color="#00e5ff"/>
                  <span style={{ color: "#00e5ff" }}>{live.spo2 > 0 ? live.spo2 + "%" : "--"}</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Droplets size={11} color="#a78bfa"/>
                  <span style={{ color: "#a78bfa" }}>{live.peso.toFixed(1)} ml</span>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={11} color={alertasCriticas > 0 ? "#ef4444" : "#10b981"}/>
                Alertas: <span style={{ color: alertasCriticas > 0 ? "#ef4444" : "#10b981" }}>
                  {alertasTotal > 0 ? `${alertasTotal} total (${alertasCriticas} críticas)` : "Sin alertas"}
                </span>
              </div>
            </div>
            {emailOk && (
              <div style={{ marginBottom: 12, fontSize: 12, fontWeight: 600, color: emailOk.startsWith("✅") ? "#10b981" : "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                {emailOk}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleEnviarEmail} disabled={enviandoEmail || !emailDest} style={{
                flex: 1, background: (!emailDest || enviandoEmail) ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.15)",
                border: `1px solid ${(!emailDest || enviandoEmail) ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.4)"}`,
                color: (!emailDest || enviandoEmail) ? "#374151" : "#10b981",
                borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700,
                cursor: (!emailDest || enviandoEmail) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <Send size={13}/> {enviandoEmail ? "Enviando..." : "Enviar"}
              </button>
              <button onClick={() => { setModalEmail(false); setEmailDest(""); setEmailOk(null); }} style={{
                flex: 1, background: "rgba(107,114,128,0.07)", border: "1px solid rgba(107,114,128,0.22)",
                color: "#6b7280", borderRadius: 8, padding: "10px 0", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
                <X size={13}/> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Paciente;