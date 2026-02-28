import { useState } from "react";
import InsigniaAlerta from "../components/InsigniaAlerta";
import BarraFluido from "../components/BarraFluido";
import EscenaPaciente from "../components/EscenaPaciente";
import { PacienteInfo, Lectura } from "../tipos";
import { enviarComando, enviarEmail } from "../services/api";

interface Props { lectura: Lectura; }

const datosIniciales: PacienteInfo = {
  nombre: "Juan Carlos", apellido: "Rodriguez Gomez",
  id: "PCT-2026-0042", cama: "04", doctor: "Dr. Paredes Villanueva",
  grupoSanguineo: "O+", fechaNacimiento: "15-03-1975",
  fechaIngreso: "20-02-2026", direccion: "Av. Universitaria 1801, Lima",
  contactoNombre: "María Vilchez", contactoTelefono: "987 654 321",
  contactoRelacion: "Esposa", temperatura: "36.8", presionArterial: "120/80",
};

const Campo = ({ label, valor }: { label: string; valor: string }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
    <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{valor}</span>
  </div>
);

const SeccionLabel = ({ color, children }: { color: string; children: string }) => (
  <div style={{ fontSize: 9, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.13em", marginBottom: 12 }}>{children}</div>
);

const TopBar = ({ color }: { color: string }) => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)` }}/>
);

const Paciente = ({ lectura }: Props) => {
  if (!lectura) return null;

  const [paciente, setPaciente] = useState<PacienteInfo>(datosIniciales);
  const [editando, setEditando]   = useState(false);
  const [temp, setTemp]           = useState<PacienteInfo>(datosIniciales);
  const [enviando, setEnviando]   = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Estados modal email
  const [modalEmail, setModalEmail]           = useState(false);
  const [emailDest, setEmailDest]             = useState("");
  const [enviandoEmail, setEnviandoEmail]     = useState(false);
  const [emailOk, setEmailOk]                 = useState<string | null>(null);

  const guardar  = () => { setPaciente(temp); setEditando(false); };
  const cancelar = () => { setTemp(paciente);  setEditando(false); };

  const fluidoStatus = lectura.peso < 50 ? "critical" : lectura.peso < 100 ? "warn" : "ok";
  const bombaOn = lectura.bomba;
  const estadoBomba = bombaOn ? "AUTO — Bomba activa por ESP32" : "STANDBY — Bomba en espera";

  const handleComando = async (cmd: "bomba_on" | "bomba_off") => {
    setEnviando(true);
    setError(null);
    try {
      await enviarComando(cmd);
    } catch {
      setError("Error al enviar comando. Verifica la conexión.");
    } finally {
      setEnviando(false);
    }
  };

  const handleEnviarEmail = async () => {
    if (!emailDest) return;
    setEnviandoEmail(true);
    setEmailOk(null);
    try {
      await enviarEmail(emailDest, lectura, []);
      setEmailOk("✅ Correo enviado correctamente");
      setTimeout(() => { setModalEmail(false); setEmailOk(null); setEmailDest(""); }, 2000);
    } catch {
      setEmailOk("❌ Error al enviar correo");
    } finally {
      setEnviandoEmail(false);
    }
  };

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,229,255,0.3)",
    color: "#e2e8f0", borderRadius: 6, padding: "5px 9px",
    fontSize: 11, fontFamily: "'JetBrains Mono', monospace", width: "100%", outline: "none",
  };

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ficha del Paciente</h2>
          <p style={{ fontSize: 11, color: "#4b5563", margin: "3px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
            {paciente.id} · Cama {paciente.cama} · UCI
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {editando ? (
            <>
              <button onClick={guardar}  style={{ background: "rgba(16,185,129,0.15)",  border: "1px solid rgba(16,185,129,0.4)",  color: "#10b981", borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Guardar</button>
              <button onClick={cancelar} style={{ background: "rgba(107,114,128,0.1)",  border: "1px solid rgba(107,114,128,0.3)", color: "#6b7280", borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditando(true)} style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff", borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏️ Editar datos</button>
              {/* Botón enviar email */}
              <button
                onClick={() => setModalEmail(true)}
                style={{
                  background: "rgba(16,185,129,0.07)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  color: "#10b981", borderRadius: 8,
                  padding: "7px 16px", fontSize: 12,
                  cursor: "pointer", fontWeight: 600,
                }}>
                📧 Enviar reporte
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }}>

        {/* SVG */}
        <div style={{
          background: "rgba(3,8,15,0.97)", border: "1px solid rgba(0,180,255,0.13)",
          borderRadius: 16, overflow: "hidden", position: "sticky", top: 72,
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#00cfff,transparent)", zIndex: 1 }}/>
          <div style={{ position: "absolute", top: 11, left: 14, zIndex: 2, fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "rgba(0,200,255,0.38)", letterSpacing: "0.18em" }}>
            VISUALIZACIÓN EN TIEMPO REAL · ESP32
          </div>
          <EscenaPaciente lectura={lectura} />
        </div>

        {/* Columna derecha */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* 1. Datos personales */}
          <div style={{ background: "rgba(13,17,28,0.88)", border: "1px solid rgba(0,229,255,0.13)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <TopBar color="#00e5ff"/>
            <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 13 }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#1e2436,#2d3748)", border: "2px solid rgba(0,229,255,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>👤</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>{paciente.nombre} {paciente.apellido}</div>
                <InsigniaAlerta label={`Cama ${paciente.cama}`} type="ok"/>
              </div>
            </div>
            <SeccionLabel color="#00e5ff">DATOS PERSONALES</SeccionLabel>
            {editando ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {([["Nombre","nombre"],["Apellido","apellido"],["ID","id"],["Cama","cama"],["Doctor","doctor"],["Grupo Sanguíneo","grupoSanguineo"],["Fecha Nac.","fechaNacimiento"],["Fecha Ingreso","fechaIngreso"],["Dirección","direccion"]] as [string, keyof PacienteInfo][]).map(([l,k]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>{l}</div>
                    <input style={inp} value={temp[k]} onChange={e => setTemp(p => ({ ...p, [k]: e.target.value }))}/>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <Campo label="ID Paciente"     valor={paciente.id}/>
                <Campo label="Doctor asignado" valor={paciente.doctor}/>
                <Campo label="Grupo sanguíneo" valor={paciente.grupoSanguineo}/>
                <Campo label="Fecha nac."      valor={paciente.fechaNacimiento}/>
                <Campo label="Fecha ingreso"   valor={paciente.fechaIngreso}/>
                <Campo label="Dirección"       valor={paciente.direccion}/>
              </>
            )}
          </div>

          {/* 2. Contacto familiar */}
          <div style={{ background: "rgba(13,17,28,0.88)", border: "1px solid rgba(167,139,250,0.16)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <TopBar color="#a78bfa"/>
            <SeccionLabel color="#a78bfa">CONTACTO FAMILIAR</SeccionLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.28)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>👥</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{paciente.contactoNombre}</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>{paciente.contactoRelacion}</div>
              </div>
            </div>
            {editando ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {([["Nombre","contactoNombre"],["Teléfono","contactoTelefono"],["Relación","contactoRelacion"]] as [string, keyof PacienteInfo][]).map(([l,k]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>{l}</div>
                    <input style={inp} value={temp[k]} onChange={e => setTemp(p => ({ ...p, [k]: e.target.value }))}/>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <Campo label="Teléfono" valor={paciente.contactoTelefono}/>
                <Campo label="Relación" valor={paciente.contactoRelacion}/>
              </>
            )}
          </div>

          {/* 3. Fluido IV y Bomba */}
          <div style={{ background: "rgba(13,17,28,0.88)", border: `1px solid ${bombaOn ? "rgba(245,158,11,0.28)" : "rgba(16,185,129,0.16)"}`, borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <TopBar color={bombaOn ? "#f59e0b" : "#10b981"}/>
            <SeccionLabel color={bombaOn ? "#f59e0b" : "#10b981"}>FLUIDO IV Y BOMBA PERISTÁLTICA</SeccionLabel>

            <div style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Nivel actual</span>
                <InsigniaAlerta label={fluidoStatus === "ok" ? "Normal" : fluidoStatus === "warn" ? "Bajo" : "Crítico"} type={fluidoStatus}/>
              </div>
              <BarraFluido peso={lectura.peso}/>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>0g</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{lectura.peso.toFixed(1)} g</span>
                <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>500g</span>
              </div>
              <div style={{ marginTop: 7, fontSize: 10, color: "#4b5563", display: "flex", gap: 12 }}>
                <span><span style={{ color: "#f59e0b" }}>▸</span> Auto: 100g</span>
                <span><span style={{ color: "#ef4444" }}>▸</span> Crítico: 50g</span>
              </div>
            </div>

            {/* Botones control */}
            <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>CONTROL MANUAL REMOTO</div>
            <div style={{ display: "flex", gap: 7 }}>
              <button
                onClick={() => handleComando("bomba_on")}
                disabled={enviando || bombaOn}
                style={{
                  flex: 1,
                  background: bombaOn ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.11)",
                  border: `1px solid ${bombaOn ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.4)"}`,
                  color: bombaOn ? "#4b5563" : "#f59e0b",
                  borderRadius: 8, padding: "9px 4px", fontSize: 11,
                  cursor: (enviando || bombaOn) ? "not-allowed" : "pointer", fontWeight: 700,
                }}>
                {enviando ? "..." : "▶ INICIAR"}
              </button>
              <button
                onClick={() => handleComando("bomba_off")}
                disabled={enviando || !bombaOn}
                style={{
                  flex: 1,
                  background: !bombaOn ? "rgba(239,68,68,0.03)" : "rgba(239,68,68,0.09)",
                  border: `1px solid ${!bombaOn ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.38)"}`,
                  color: !bombaOn ? "#4b5563" : "#ef4444",
                  borderRadius: 8, padding: "9px 4px",
                  fontSize: 11, cursor: (enviando || !bombaOn) ? "not-allowed" : "pointer", fontWeight: 700,
                }}>
                {enviando ? "..." : "■ DETENER"}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{ marginTop: 8, fontSize: 10, color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
                ⚠ {error}
              </div>
            )}

            {/* Estado */}
            <div style={{
              marginTop: 10, padding: "7px 11px",
              background: bombaOn ? "rgba(245,158,11,0.07)" : "rgba(16,185,129,0.07)",
              border: `1px solid ${bombaOn ? "rgba(245,158,11,0.18)" : "rgba(16,185,129,0.18)"}`,
              borderRadius: 7, fontSize: 10,
              color: bombaOn ? "#f59e0b" : "#10b981",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {estadoBomba}
            </div>
          </div>

        </div>
      </div>

      {/* ── Modal Email ── */}
      {modalEmail && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            background: "#0d111c",
            border: "1px solid rgba(0,229,255,0.2)",
            borderRadius: 16, padding: 28,
            width: 400, position: "relative",
          }}>
            {/* Top bar verde */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg,transparent,#10b981,transparent)",
              borderRadius: "16px 16px 0 0",
            }}/>

            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "#f1f5f9" }}>
              📧 Enviar reporte por correo
            </h3>
            <p style={{ fontSize: 11, color: "#4b5563", margin: "0 0 20px", fontFamily: "'JetBrains Mono', monospace" }}>
              Se enviará el reporte del paciente con PDF adjunto
            </p>

            {/* Input email */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                CORREO DESTINATARIO
              </div>
              <input
                type="email"
                placeholder="familiar@gmail.com"
                value={emailDest}
                onChange={e => setEmailDest(e.target.value)}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(0,229,255,0.3)",
                  color: "#e2e8f0", borderRadius: 8,
                  padding: "10px 14px", fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Info del paciente */}
            <div style={{
              background: "rgba(0,229,255,0.04)",
              border: "1px solid rgba(0,229,255,0.1)",
              borderRadius: 8, padding: "10px 14px", marginBottom: 16,
              fontSize: 11, color: "#6b7280",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <div>Paciente: <span style={{ color: "#e2e8f0" }}>{paciente.nombre} {paciente.apellido}</span></div>
              <div>
                FC: <span style={{ color: "#f43f5e" }}>{lectura.fc > 0 ? lectura.fc + " bpm" : "--"}</span>
                {"  "}SpO2: <span style={{ color: "#00e5ff" }}>{lectura.spo2 > 0 ? lectura.spo2 + "%" : "--"}</span>
                {"  "}IV: <span style={{ color: "#a78bfa" }}>{lectura.peso.toFixed(1)}g</span>
              </div>
            </div>

            {/* Resultado */}
            {emailOk && (
              <div style={{
                marginBottom: 12, fontSize: 12, fontWeight: 600,
                color: emailOk.startsWith("✅") ? "#10b981" : "#ef4444",
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {emailOk}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleEnviarEmail}
                disabled={enviandoEmail || !emailDest}
                style={{
                  flex: 1,
                  background: (!emailDest || enviandoEmail) ? "rgba(16,185,129,0.04)" : "rgba(16,185,129,0.15)",
                  border: `1px solid ${(!emailDest || enviandoEmail) ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.4)"}`,
                  color: (!emailDest || enviandoEmail) ? "#374151" : "#10b981",
                  borderRadius: 8, padding: "10px 0",
                  fontSize: 13, fontWeight: 700,
                  cursor: (!emailDest || enviandoEmail) ? "not-allowed" : "pointer",
                }}>
                {enviandoEmail ? "Enviando..." : "📧 Enviar"}
              </button>
              <button
                onClick={() => { setModalEmail(false); setEmailDest(""); setEmailOk(null); }}
                style={{
                  flex: 1, background: "rgba(107,114,128,0.07)",
                  border: "1px solid rgba(107,114,128,0.22)",
                  color: "#6b7280", borderRadius: 8,
                  padding: "10px 0", fontSize: 13,
                  cursor: "pointer",
                }}>
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Paciente;