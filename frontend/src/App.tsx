import { useState } from "react";
import BarraNavegacion from "./components/BarraNavegacion";
import Monitor from "./pages/Monitor";
import Analytics from "./pages/Analytics";
import Alertas from "./pages/Alertas";
import Paciente from "./pages/Paciente";
import { useLecturas } from "./hooks/useLecturas";
import "./index.css";

function App() {
  const [tab, setTab] = useState("paciente");
  const {
    live,
    historialSuero,
    historialVitales,
    conectado,
    alertas,
    setAlertas,
  } = useLecturas();

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

      <BarraNavegacion tab={tab} setTab={setTab} alertas={alertas} conectado={conectado} />

      <main style={{ position: "relative", zIndex: 1, padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "overview"   && <Monitor   live={live} historialSuero={historialSuero} historialVitales={historialVitales} />}
        {tab === "analytics"  && <Analytics live={live} historialVitales={historialVitales} />}
        {tab === "paciente"   && <Paciente  live={live} />}
        {tab === "alertas"    && <Alertas   alertas={alertas} limpiarAlertas={() => setAlertas([])} />}
      </main>

      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "#1f2937", fontFamily: "'JetBrains Mono', monospace" }}>
          Monitoreo en Tiempo Real de Pacientes
        </span>
        <span style={{ fontSize: 10, color: "#1f2937", fontFamily: "'JetBrains Mono', monospace" }}>
          Internet de las Cosas - Proyecto Final
        </span>
      </footer>
    </div>
  );
}

export default App;