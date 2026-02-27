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
  const { lectura, historial, conectado, alertas, limpiarAlertas } = useLecturas(true);

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
        {tab === "overview" && <Monitor lectura={lectura} historial={historial} />}
        {tab === "analytics" && <Analytics lectura={lectura} historial={historial} />}
        {tab === "paciente" && <Paciente lectura={lectura} />}
        {tab === "alertas" && <Alertas alertas={alertas} limpiarAlertas={limpiarAlertas} />}
      </main>

      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "#1f2937", fontFamily: "'JetBrains Mono', monospace" }}>
          UNMSM · FISI · INTERNET DE LAS COSAS · 2026
        </span>
        <span style={{ fontSize: 10, color: "#1f2937", fontFamily: "'JetBrains Mono', monospace" }}>
          ESP32 + MAX30102 + HX711 + BOMBA PERISTÁLTICA
        </span>
      </footer>
    </div>
  );
}

export default App;