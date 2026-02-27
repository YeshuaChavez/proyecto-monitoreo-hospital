import { useState } from "react";
import InsigniaAlerta from "../components/InsigniaAlerta";
import BarraFluido from "../components/BarraFluido";
import EscenaPaciente from "../components/EscenaPaciente";
import { PacienteInfo, Lectura } from "../tipos";

interface Props { lectura: Lectura; }

const datosIniciales: PacienteInfo = {
  nombre: "Juan Carlos", apellido: "Quispe Mamani",
  id: "PCT-2026-0042", cama: "04", doctor: "Dr. Herrera Quispe",
  grupoSanguineo: "O+", fechaNacimiento: "15-03-1975",
  fechaIngreso: "20-02-2026", direccion: "Av. Universitaria 1801, Lima",
  contactoNombre: "María Quispe", contactoTelefono: "987 654 321",
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
  const [paciente, setPaciente] = useState<PacienteInfo>(datosIniciales);
  const [editando, setEditando] = useState(false);
  const [bombaManual, setBombaManual] = useState(false);
  const [temp, setTemp] = useState<PacienteInfo>(datosIniciales);

  const guardar  = () => { setPaciente(temp); setEditando(false); };
  const cancelar = () => { setTemp(paciente);  setEditando(false); };
  const fluidoStatus = lectura.peso < 50 ? "critical" : lectura.peso < 100 ? "warn" : "ok";
  const bombaOn = lectura.bomba || bombaManual;

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
            <button onClick={() => setEditando(true)} style={{ background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff", borderRadius: 8, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏️ Editar datos</button>
          )}
        </div>
      </div>

      {/* ══ LAYOUT PRINCIPAL ══
           izquierda: SVG sticky
           derecha:   3 tarjetas apiladas  */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14, alignItems: "start" }}>

        {/* ─── SVG — ocupa toda la altura de las 3 tarjetas ─── */}
        <div style={{
          background: "rgba(3,8,15,0.97)",
          border: "1px solid rgba(0,180,255,0.13)",
          borderRadius: 16, overflow: "hidden",
          position: "sticky", top: 72,
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#00cfff,transparent)", zIndex: 1 }}/>
          <div style={{ position: "absolute", top: 11, left: 14, zIndex: 2, fontFamily: "'Share Tech Mono', monospace", fontSize: 8, color: "rgba(0,200,255,0.38)", letterSpacing: "0.18em" }}>
            VISUALIZACIÓN EN TIEMPO REAL · ESP32
          </div>
          <EscenaPaciente lectura={lectura} />
        </div>

        {/* ─── Columna derecha: 3 tarjetas ─── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* ┌── 1. Datos personales ──┐ */}
          <div style={{ background: "rgba(13,17,28,0.88)", border: "1px solid rgba(0,229,255,0.13)", borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <TopBar color="#00e5ff"/>

            {/* Avatar + nombre */}
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

          {/* ┌── 2. Contacto familiar + Signos ──┐ */}
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

            {/* Signos complementarios dentro del mismo card */}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: 13, paddingTop: 13 }}>
              <SeccionLabel color="#f43f5e">SIGNOS COMPLEMENTARIOS</SeccionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>

                <div style={{ background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.14)", borderRadius: 10, padding: "11px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>🌡️</div>
                  <div style={{ fontSize: 8.5, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>TEMPERATURA</div>
                  {editando
                    ? <input style={{ ...inp, textAlign: "center" }} value={temp.temperatura} onChange={e => setTemp(p => ({ ...p, temperatura: e.target.value }))}/>
                    : <><div style={{ fontSize: 21, fontWeight: 800, color: "#f43f5e", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{paciente.temperatura}°</div><div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>Celsius</div></>
                  }
                </div>

                <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.14)", borderRadius: 10, padding: "11px", textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>💉</div>
                  <div style={{ fontSize: 8.5, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>PRESIÓN ART.</div>
                  {editando
                    ? <input style={{ ...inp, textAlign: "center" }} value={temp.presionArterial} onChange={e => setTemp(p => ({ ...p, presionArterial: e.target.value }))}/>
                    : <><div style={{ fontSize: 19, fontWeight: 800, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{paciente.presionArterial}</div><div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>mmHg</div></>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ┌── 3. Fluido IV y Bomba ──┐ */}
          <div style={{ background: "rgba(13,17,28,0.88)", border: `1px solid ${bombaOn ? "rgba(245,158,11,0.28)" : "rgba(16,185,129,0.16)"}`, borderRadius: 14, padding: "16px 18px", position: "relative", overflow: "hidden" }}>
            <TopBar color={bombaOn ? "#f59e0b" : "#10b981"}/>

            <SeccionLabel color={bombaOn ? "#f59e0b" : "#10b981"}>FLUIDO IV Y BOMBA PERISTÁLTICA</SeccionLabel>

            {/* Barra */}
            <div style={{ marginBottom: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>Nivel actual</span>
                <InsigniaAlerta label={fluidoStatus === "ok" ? "Normal" : fluidoStatus === "warn" ? "Bajo" : "Crítico"} type={fluidoStatus}/>
              </div>
              <BarraFluido peso={lectura.peso}/>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>0g</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{lectura.peso} g</span>
                <span style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>500g</span>
              </div>
              <div style={{ marginTop: 7, fontSize: 10, color: "#4b5563", display: "flex", gap: 12 }}>
                <span><span style={{ color: "#f59e0b" }}>▸</span> Auto: 100g</span>
                <span><span style={{ color: "#ef4444" }}>▸</span> Crítico: 50g</span>
              </div>
            </div>

            {/* Botones control */}
            <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>CONTROL MANUAL</div>
            <div style={{ display: "flex", gap: 7 }}>
              <button onClick={() => setBombaManual(true)} disabled={lectura.bomba} style={{
                flex: 1, background: lectura.bomba ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.11)",
                border: `1px solid ${lectura.bomba ? "rgba(245,158,11,0.08)" : "rgba(245,158,11,0.4)"}`,
                color: lectura.bomba ? "#4b5563" : "#f59e0b",
                borderRadius: 8, padding: "9px 4px", fontSize: 11,
                cursor: lectura.bomba ? "not-allowed" : "pointer", fontWeight: 700,
              }}>▶ INICIAR</button>

              <button onClick={() => setBombaManual(false)} style={{
                flex: 1, background: "rgba(239,68,68,0.09)", border: "1px solid rgba(239,68,68,0.38)",
                color: "#ef4444", borderRadius: 8, padding: "9px 4px",
                fontSize: 11, cursor: "pointer", fontWeight: 700,
              }}>■ DETENER</button>

              <button style={{
                flex: 1, background: "rgba(107,114,128,0.07)", border: "1px solid rgba(107,114,128,0.22)",
                color: "#6b7280", borderRadius: 8, padding: "9px 4px",
                fontSize: 11, cursor: "pointer", fontWeight: 700,
              }}>↺ RESET</button>
            </div>

            {/* Estado */}
            <div style={{
              marginTop: 10, padding: "7px 11px",
              background: bombaOn ? "rgba(245,158,11,0.07)" : "rgba(16,185,129,0.07)",
              border: `1px solid ${bombaOn ? "rgba(245,158,11,0.18)" : "rgba(16,185,129,0.18)"}`,
              borderRadius: 7, fontSize: 10,
              color: bombaOn ? "#f59e0b" : "#10b981",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {lectura.bomba ? "AUTO — Bomba activa" : bombaManual ? "MANUAL — Bomba activa" : "STANDBY — En espera"}
            </div>
          </div>

        </div>{/* fin col derecha */}
      </div>
    </div>
  );
};

export default Paciente;