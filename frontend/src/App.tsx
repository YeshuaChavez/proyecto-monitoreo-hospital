import { useState, useEffect, useCallback } from "react";
import BarraNavegacion from "./components/BarraNavegacion";
import Login from "./pages/Login";
import Monitor from "./pages/Monitor";
import Analytics from "./pages/Analytics";
import Alertas from "./pages/Alertas";
import Paciente from "./pages/Paciente";
import Config from "./pages/Config";
import Administracion from "./pages/Administracion";
import { PacienteDB, UsuarioLogin } from "./tipos";
import { useLecturas } from "./hooks/useLecturas";
import { getConfig } from "./services/api";
import "./index.css";

const BASE = (import.meta as any).env?.VITE_API_URL || "https://proyecto-monitoreo-posta-medica-production.up.railway.app";

function App() {
  const [pacienteActual, setPacienteActual] = useState<PacienteDB | null>(null);
  const [config, setConfig] = useState({ peso_alerta: 150, peso_critico: 100 });
  const [usuarioActual, setUsuarioActual] = useState<UsuarioLogin | null>(null);
  const [tab, setTab] = useState("paciente");
  const cargarConfig = useCallback(async () => {
    try {
      const c = await getConfig();
      if (c?.peso_alerta) setConfig({ peso_alerta: c.peso_alerta, peso_critico: c.peso_critico });
    } catch {}
  }, []);
  useEffect(() => { cargarConfig(); }, [cargarConfig]);

  const { live, historialSuero, historialVitales, conectado, alertas, setAlertas } = useLecturas(cargarConfig);

  // ✅ return condicional AQUÍ, después de todos los hooks
  if (!usuarioActual) return <Login onLogin={setUsuarioActual} />;

  const esAdmin = usuarioActual.rol === "Administrador" || usuarioActual.usuario === "admin";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#070b14",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e2e8f0",
    }}>
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <BarraNavegacion
        tab={tab}
        setTab={setTab}
        alertas={alertas}
        conectado={conectado}
        esAdmin={esAdmin}
        usuarioActual={usuarioActual}
        onLogout={() => {
          setUsuarioActual(null);
          setPacienteActual(null);  // ← agrega esto
          setTab("paciente");
          // ← elimina el fetch /logout
        }}      
      />

      <main style={{ position: "relative", zIndex: 1, padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "overview"  && <Monitor       live={live} historialSuero={historialSuero} historialVitales={historialVitales} />}
        {tab === "analytics" && <Analytics live={live} historialVitales={historialVitales} historialSuero={historialSuero} config={config} />}
        {tab === "paciente" && (<Paciente  live={live} alertas={alertas} usuarioActual={usuarioActual} pacienteActual={pacienteActual} onPacienteSeleccionado={(p) => { setPacienteActual(p); setTab("paciente");}} />)}
        {tab === "alertas"   && <Alertas       alertas={alertas} limpiarAlertas={() => setAlertas([])} />}
        {tab === "config"    && <Config        usuarioActual={usuarioActual} />}
        {tab === "admin" && esAdmin && <Administracion usuarioActual={usuarioActual} />}
        {tab === "admin" && !esAdmin && (
          <div style={{ textAlign:"center", padding:"80px 20px" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#ef4444" }}>Acceso denegado</div>
            <div style={{ fontSize:12, color:"#4b5563", marginTop:6 }}>Solo administradores pueden acceder a esta sección.</div>
          </div>
        )}
      </main>

      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "12px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#00e5ff", boxShadow:"0 0 6px #00e5ff" }}/>
          <span style={{ fontSize:11, color:"#374151", fontFamily:"'JetBrains Mono', monospace", letterSpacing:"0.08em" }}>
            POSTA MÉDICA · CONSULTORIO GENERAL
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background: conectado?"#10b981":"#6b7280", boxShadow: conectado?"0 0 5px #10b981":"none" }}/>
          <span style={{ fontSize:10, color:"#374151", fontFamily:"'JetBrains Mono', monospace" }}>
            {conectado ? "SISTEMA ACTIVO" : "SIN CONEXIÓN"}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {["ESP32","MAX30102","HX711"].map(chip => (
            <span key={chip} style={{
              fontSize:9, color:"#1f2937", fontFamily:"'JetBrains Mono', monospace",
              background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
              borderRadius:4, padding:"2px 6px", letterSpacing:"0.05em",
            }}>{chip}</span>
          ))}
        </div>
      </footer>
    </div>
  );
}

export default App;