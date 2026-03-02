import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Save, X, UserCheck, Search, Stethoscope } from "lucide-react";
import { UsuarioLogin } from "../tipos";

interface Paciente {
  id?:               number;
  nombre:            string;
  apellido:          string;
  codigo:            string;
  doctor:            string;
  doctor_id:         number | null;
  grupo_sanguineo:   string;
  fecha_nacimiento:  string;
  fecha_ingreso:     string;
  direccion:         string;
  contacto_nombre:   string;
  contacto_telefono: string;
  contacto_relacion: string;
  activo?:           boolean;
}

interface Medico {
  id:     number;
  nombre: string;
  rol:    string;
}

const VACIO: Paciente = {
  nombre:"", apellido:"", codigo:"", doctor:"", doctor_id: null,
  grupo_sanguineo:"", fecha_nacimiento:"", fecha_ingreso:"",
  direccion:"", contacto_nombre:"", contacto_telefono:"", contacto_relacion:"",
};

const BASE = (import.meta as any).env?.VITE_API_URL || "https://proyecto-monitoreo-posta-medica-production.up.railway.app";

interface Props { usuarioActual: UsuarioLogin; }

const Administracion = ({ usuarioActual }: Props) => {
  const [pacientes,  setPacientes]  = useState<Paciente[]>([]);
  const [medicos,    setMedicos]    = useState<Medico[]>([]);
  const [cargando,   setCargando]   = useState(true);
  const [busqueda,   setBusqueda]   = useState("");
  const [modal,      setModal]      = useState<"crear"|"editar"|null>(null);
  const [form,       setForm]       = useState<Paciente>(VACIO);
  const [guardando,  setGuardando]  = useState(false);
  const [error,      setError]      = useState<string|null>(null);
  const [confirmDel, setConfirmDel] = useState<number|null>(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const [resPac, resMed] = await Promise.all([
        fetch(`${BASE}/pacientes?solo_activos=false`),
        fetch(`${BASE}/usuarios/medicos`),
      ]);
      setPacientes(await resPac.json());
      setMedicos(await resMed.json());
    } catch { setError("Error al cargar datos"); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    const siguiente = pacientes.length + 1;
    setForm({
      ...VACIO,
      codigo: `PCT-${new Date().getFullYear()}-${String(siguiente).padStart(4, "0")}`,
    });
    setError(null);
    setModal("crear");
  };

  const abrirEditar = (p: Paciente) => {
    setForm({ ...p });
    setError(null);
    setModal("editar");
  };

  const guardar = async () => {
    if (!form.nombre || !form.apellido) {
      setError("Nombre y apellido son obligatorios");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const url    = modal === "editar" ? `${BASE}/pacientes/${form.id}` : `${BASE}/pacientes`;
      const method = modal === "editar" ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre:            form.nombre,
          apellido:          form.apellido,
          codigo:            form.codigo   || null,
          doctor_id:         form.doctor_id,
          grupo_sanguineo:   form.grupo_sanguineo,
          fecha_nacimiento:  form.fecha_nacimiento,
          fecha_ingreso:     form.fecha_ingreso,
          direccion:         form.direccion,
          contacto_nombre:   form.contacto_nombre,
          contacto_telefono: form.contacto_telefono,
          contacto_relacion: form.contacto_relacion,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Error al guardar");
      }
      setModal(null);
      cargar();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id: number) => {
    try {
      await fetch(`${BASE}/pacientes/${id}`, { method: "DELETE" });
      setConfirmDel(null);
      cargar();
    } catch { setError("Error al desactivar"); }
  };

  const filtrados = pacientes.filter(p =>
    `${p.nombre} ${p.apellido} ${p.codigo || `PCT-${p.id}`}`
      .toLowerCase().includes(busqueda.toLowerCase())
  );

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(0,229,255,0.2)",
    color: "#e2e8f0", borderRadius: 7, padding: "7px 10px",
    fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
    width: "100%", outline: "none", boxSizing: "border-box",
  };

  const camposTexto: [string, keyof Paciente][] = [
    ["Nombre *",            "nombre"],
    ["Apellido *",          "apellido"],
    ["Código (ID)",         "codigo"],
    ["Grupo sanguíneo",     "grupo_sanguineo"],
    ["Fecha nacimiento",    "fecha_nacimiento"],
    ["Dirección",           "direccion"],
    ["Contacto — Nombre",   "contacto_nombre"],
    ["Contacto — Teléfono", "contacto_telefono"],
    ["Contacto — Relación", "contacto_relacion"],
  ];

  const spanCompleto = new Set(["direccion","contacto_nombre","contacto_telefono","contacto_relacion"]);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, margin:0 }}>Administración de Pacientes</h2>
          <p style={{ fontSize:11, color:"#4b5563", margin:"4px 0 0", fontFamily:"'JetBrains Mono', monospace" }}>
            {filtrados.filter(p => p.activo).length} activo(s)
            · sesión: <span style={{ color:"#00e5ff" }}>{usuarioActual.usuario}</span>
          </p>
        </div>
        <button onClick={abrirCrear} style={{
          background:"rgba(0,229,255,0.1)", border:"1px solid rgba(0,229,255,0.3)",
          color:"#00e5ff", borderRadius:9, padding:"9px 18px", fontSize:12,
          cursor:"pointer", fontWeight:700, display:"flex", alignItems:"center", gap:7,
        }}>
          <Plus size={14}/> Nuevo paciente
        </button>
      </div>

      {/* Buscador */}
      <div style={{ position:"relative", marginBottom:20 }}>
        <Search size={14} color="#4b5563" style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
        <input
          placeholder="Buscar por nombre, apellido o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...inp, paddingLeft:34, fontSize:13 }}
        />
      </div>

      {/* Tabla */}
      {cargando ? (
        <div style={{ textAlign:"center", padding:60, color:"#4b5563", fontFamily:"'JetBrains Mono', monospace" }}>
          Cargando pacientes...
        </div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, background:"rgba(13,17,28,0.8)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16 }}>
          <div style={{ fontSize:36, marginBottom:10 }}>🏥</div>
          <div style={{ color:"#6b7280", fontSize:13 }}>
            {busqueda ? "Sin resultados para esa búsqueda" : "No hay pacientes registrados"}
          </div>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1.2fr 1fr 1fr 90px",
            gap:12, padding:"8px 16px",
            fontSize:9, color:"#4b5563", fontFamily:"'JetBrains Mono', monospace", letterSpacing:"0.1em",
          }}>
            <span>PACIENTE</span><span>CÓDIGO / DOCTOR</span><span>CONTACTO</span><span>ESTADO</span><span>ACCIONES</span>
          </div>

          {filtrados.map(p => (
            <div key={p.id} style={{
              display:"grid", gridTemplateColumns:"1fr 1.2fr 1fr 1fr 90px",
              gap:12, padding:"14px 16px",
              background:"rgba(13,17,28,0.8)",
              border:`1px solid ${p.activo ? "rgba(255,255,255,0.06)" : "rgba(239,68,68,0.1)"}`,
              borderRadius:12, alignItems:"center",
              opacity: p.activo ? 1 : 0.5,
            }}>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{p.nombre} {p.apellido}</div>
                <div style={{ fontSize:10, color:"#6b7280", fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>
                  {p.grupo_sanguineo || "—"} · {p.fecha_nacimiento || "—"}
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#00e5ff", fontFamily:"'JetBrains Mono', monospace" }}>
                  {p.codigo || `PCT-${p.id}`}
                </div>
                <div style={{ fontSize:11, color:"#6b7280", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                  <Stethoscope size={10} color="#6b7280"/>
                  {p.doctor || "Sin asignar"}
                </div>
              </div>
              <div>
                <div style={{ fontSize:11, color:"#e2e8f0" }}>{p.contacto_nombre || "—"}</div>
                <div style={{ fontSize:10, color:"#6b7280", fontFamily:"'JetBrains Mono', monospace", marginTop:2 }}>
                  {p.contacto_telefono || "—"}
                </div>
              </div>
              <div>
                <span style={{
                  fontSize:9, fontWeight:700, fontFamily:"'JetBrains Mono', monospace",
                  padding:"3px 8px", borderRadius:99,
                  background: p.activo ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                  color:       p.activo ? "#10b981"               : "#ef4444",
                }}>
                  {p.activo ? "ACTIVO" : "INACTIVO"}
                </span>
                <div style={{ fontSize:9, color:"#374151", fontFamily:"'JetBrains Mono', monospace", marginTop:4 }}>
                  {p.fecha_ingreso || "Sin ingreso"}
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => abrirEditar(p)} style={{
                  background:"rgba(0,229,255,0.08)", border:"1px solid rgba(0,229,255,0.2)",
                  color:"#00e5ff", borderRadius:7, padding:"6px 8px", cursor:"pointer",
                }}>
                  <Pencil size={13}/>
                </button>
                <button onClick={() => setConfirmDel(p.id!)} style={{
                  background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
                  color:"#ef4444", borderRadius:7, padding:"6px 8px", cursor:"pointer",
                }}>
                  <Trash2 size={13}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modal && (
        <div style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{
            background:"#0d111c", border:"1px solid rgba(0,229,255,0.2)",
            borderRadius:18, padding:28, width:"100%", maxWidth:560,
            maxHeight:"90vh", overflowY:"auto", position:"relative",
          }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#00e5ff,transparent)", borderRadius:"18px 18px 0 0" }}/>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, margin:0, color:"#f1f5f9", display:"flex", alignItems:"center", gap:8 }}>
                <UserCheck size={16} color="#00e5ff"/>
                {modal === "crear" ? "Nuevo paciente" : "Editar paciente"}
              </h3>
              <button onClick={() => setModal(null)} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer" }}>
                <X size={18}/>
              </button>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

              {camposTexto.map(([label, key]) => (
                <div key={key} style={{ gridColumn: spanCompleto.has(key as string) ? "1/-1" : "auto" }}>
                  <div style={{ fontSize:9, color:"#6b7280", fontFamily:"'JetBrains Mono', monospace", marginBottom:4, letterSpacing:"0.08em" }}>
                    {label.toUpperCase()}
                  </div>
                  <input
                    style={inp}
                    value={(form[key] as string) || ""}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}

              {/* ── Dropdown doctor — fondo oscuro forzado ── */}
              <div style={{ gridColumn: "1/-1" }}>
                <div style={{
                  fontSize: 9, color: "#6b7280",
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 4, letterSpacing: "0.08em",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                  <Stethoscope size={10} color="#6b7280" /> DOCTOR / ENFERMERO ASIGNADO
                </div>
                <div style={{ position: "relative" }}>
                  <select
                    value={form.doctor_id ?? ""}
                    onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value ? Number(e.target.value) : null }))}
                    style={{
                      width: "100%",
                      background: "#0d111c",
                      border: "1px solid rgba(0,229,255,0.2)",
                      borderRadius: 8,
                      color: form.doctor_id ? "#e2e8f0" : "#6b7280",
                      padding: "10px 36px 10px 12px",
                      fontSize: 12,
                      fontFamily: "'JetBrains Mono', monospace",
                      cursor: "pointer",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      boxSizing: "border-box",
                      colorScheme: "dark",
                    } as React.CSSProperties}
                  >
                    <option value="" style={{ background: "#0d111c", color: "#6b7280" }}>— Sin asignar —</option>
                    {medicos.map(m => (
                      <option key={m.id} value={m.id} style={{ background: "#0d111c", color: "#e2e8f0" }}>
                        {m.nombre} ({m.rol})
                      </option>
                    ))}
                  </select>
                  <div style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                  }}>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

            </div>

            {error && (
              <div style={{ marginTop:12, fontSize:11, color:"#ef4444", fontFamily:"'JetBrains Mono', monospace", padding:"8px 12px", background:"rgba(239,68,68,0.08)", borderRadius:7 }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display:"flex", gap:8, marginTop:20 }}>
              <button onClick={guardar} disabled={guardando} style={{
                flex:1, background:"rgba(0,229,255,0.1)", border:"1px solid rgba(0,229,255,0.35)",
                color:"#00e5ff", borderRadius:9, padding:"10px 0", fontSize:13, fontWeight:700,
                cursor:guardando?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              }}>
                <Save size={14}/> {guardando ? "Guardando..." : "Guardar"}
              </button>
              <button onClick={() => setModal(null)} style={{
                flex:1, background:"rgba(107,114,128,0.07)", border:"1px solid rgba(107,114,128,0.2)",
                color:"#6b7280", borderRadius:9, padding:"10px 0", fontSize:13, cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              }}>
                <X size={14}/> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmDel !== null && (
        <div style={{ position:"fixed", inset:0, zIndex:1001, background:"rgba(0,0,0,0.8)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{
            background:"#0d111c", border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:16, padding:28, width:360, textAlign:"center",
          }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>¿Desactivar paciente?</div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:24 }}>
              El paciente quedará inactivo y no aparecerá en el selector de monitoreo.
              Sus datos históricos se conservan.
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => eliminar(confirmDel)} style={{
                flex:1, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.35)",
                color:"#ef4444", borderRadius:9, padding:"10px 0", fontSize:13, fontWeight:700, cursor:"pointer",
              }}>Desactivar</button>
              <button onClick={() => setConfirmDel(null)} style={{
                flex:1, background:"rgba(107,114,128,0.07)", border:"1px solid rgba(107,114,128,0.2)",
                color:"#6b7280", borderRadius:9, padding:"10px 0", fontSize:13, cursor:"pointer",
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Administracion;