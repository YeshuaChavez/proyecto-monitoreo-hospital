import { useState, useEffect } from "react";
import { getConfig, guardarConfig } from "../services/api";

const Config = () => {
  const [pesoAlerta,   setPesoAlerta]   = useState(150);
  const [pesoCritico,  setPesoCritico]  = useState(100);
  const [guardando,    setGuardando]    = useState(false);
  const [resultado,    setResultado]    = useState<string | null>(null);
  const [cargando,     setCargando]     = useState(true);

  useEffect(() => {
    getConfig().then(cfg => {
      setPesoAlerta(cfg.peso_alerta   ?? 150);
      setPesoCritico(cfg.peso_critico ?? 100);
      setCargando(false);
    });
  }, []);

  const handleGuardar = async () => {
    if (pesoCritico >= pesoAlerta) {
      setResultado("❌ El umbral crítico debe ser menor que el de alerta");
      return;
    }
    setGuardando(true);
    setResultado(null);
    try {
      await guardarConfig(pesoAlerta, pesoCritico);
      setResultado("✅ Configuración guardada y enviada al ESP32");
      setTimeout(() => setResultado(null), 3000);
    } catch {
      setResultado("❌ Error al guardar configuración");
    } finally {
      setGuardando(false);
    }
  };

  const inp: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(0,229,255,0.3)",
    color: "#e2e8f0", borderRadius: 8,
    padding: "10px 14px", fontSize: 16,
    fontFamily: "'JetBrains Mono', monospace",
    width: "100%", outline: "none",
    boxSizing: "border-box",
  };

  if (cargando) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#4b5563" }}>
      Cargando configuración...
    </div>
  );

  return (
    <div style={{ animation: "fadeIn 0.3s ease", maxWidth: 600, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>⚙️ Configuración</h2>
        <p style={{ fontSize: 12, color: "#4b5563", margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>
          Los cambios se aplican en tiempo real al ESP32 vía MQTT
        </p>
      </div>

      {/* Tarjeta umbrales */}
      <div style={{
        background: "rgba(13,17,28,0.88)",
        border: "1px solid rgba(0,229,255,0.13)",
        borderRadius: 16, padding: 24, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg,transparent,#00e5ff,transparent)" }}/>

        <div style={{ fontSize: 10, color: "#00e5ff", fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.13em", marginBottom: 20 }}>
          UMBRALES DE FLUIDO IV
        </div>

        {/* Umbral alerta */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>
              ⚠️ Umbral de Alerta
            </label>
            <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
              LED rojo + buzzer 3 pitidos
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="number" min={50} max={490} step={10}
              value={pesoAlerta}
              onChange={e => setPesoAlerta(Number(e.target.value))}
              style={inp}
            />
            <span style={{ fontSize: 14, color: "#f59e0b", fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
              g
            </span>
          </div>
          {/* Slider */}
          <input
            type="range" min={50} max={490} step={10}
            value={pesoAlerta}
            onChange={e => setPesoAlerta(Number(e.target.value))}
            style={{ width: "100%", marginTop: 8, accentColor: "#f59e0b" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
            <span>50g</span><span>490g</span>
          </div>
        </div>

        {/* Umbral crítico */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>
              🚨 Umbral Crítico
            </label>
            <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace" }}>
              Activa bomba + buzzer 5 pitidos
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="number" min={10} max={pesoAlerta - 10} step={10}
              value={pesoCritico}
              onChange={e => setPesoCritico(Number(e.target.value))}
              style={{ ...inp, border: `1px solid rgba(239,68,68,0.4)` }}
            />
            <span style={{ fontSize: 14, color: "#ef4444", fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>
              g
            </span>
          </div>
          <input
            type="range" min={10} max={pesoAlerta - 10} step={10}
            value={pesoCritico}
            onChange={e => setPesoCritico(Number(e.target.value))}
            style={{ width: "100%", marginTop: 8, accentColor: "#ef4444" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace" }}>
            <span>10g</span><span>{pesoAlerta - 10}g</span>
          </div>
        </div>

        {/* Preview visual */}
        <div style={{
          background: "rgba(0,0,0,0.3)", borderRadius: 10,
          padding: "14px 16px", marginBottom: 20,
          border: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{ fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 10 }}>PREVIEW — BARRA DE FLUIDO IV</div>
          <div style={{ position: "relative", height: 20, borderRadius: 10,
            background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
            {/* Zona crítica */}
            <div style={{
              position: "absolute", left: 0,
              width: `${(pesoCritico / 500) * 100}%`,
              height: "100%", background: "rgba(239,68,68,0.4)",
            }}/>
            {/* Zona alerta */}
            <div style={{
              position: "absolute",
              left: `${(pesoCritico / 500) * 100}%`,
              width: `${((pesoAlerta - pesoCritico) / 500) * 100}%`,
              height: "100%", background: "rgba(245,158,11,0.4)",
            }}/>
            {/* Zona normal */}
            <div style={{
              position: "absolute",
              left: `${(pesoAlerta / 500) * 100}%`,
              width: `${((500 - pesoAlerta) / 500) * 100}%`,
              height: "100%", background: "rgba(16,185,129,0.4)",
            }}/>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between",
            fontSize: 9, marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: "#ef4444" }}>🔴 Crítico 0–{pesoCritico}g</span>
            <span style={{ color: "#f59e0b" }}>🟡 Alerta {pesoCritico}–{pesoAlerta}g</span>
            <span style={{ color: "#10b981" }}>🟢 Normal {pesoAlerta}–500g</span>
          </div>
        </div>

        {/* Resultado */}
        {resultado && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 8,
            background: resultado.startsWith("✅") ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${resultado.startsWith("✅") ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
            fontSize: 12, fontWeight: 600,
            color: resultado.startsWith("✅") ? "#10b981" : "#ef4444",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {resultado}
          </div>
        )}

        {/* Botón guardar */}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          style={{
            width: "100%",
            background: guardando ? "rgba(0,229,255,0.04)" : "rgba(0,229,255,0.1)",
            border: `1px solid ${guardando ? "rgba(0,229,255,0.1)" : "rgba(0,229,255,0.4)"}`,
            color: guardando ? "#374151" : "#00e5ff",
            borderRadius: 10, padding: "12px 0",
            fontSize: 13, fontWeight: 700,
            cursor: guardando ? "not-allowed" : "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.06em",
          }}>
          {guardando ? "Enviando al ESP32..." : "💾 GUARDAR Y APLICAR"}
        </button>
      </div>

      {/* Info */}
      <div style={{
        marginTop: 16, padding: "12px 16px",
        background: "rgba(13,17,28,0.5)",
        border: "1px solid rgba(255,255,255,0.04)",
        borderRadius: 10, fontSize: 11, color: "#4b5563",
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        ℹ️ El ESP32 recibe los nuevos umbrales vía MQTT (topic: posta/consultorio/config)
        y los aplica inmediatamente sin necesidad de reiniciar.
      </div>
    </div>
  );
};

export default Config;