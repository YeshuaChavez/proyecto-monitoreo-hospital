import { useState, useEffect } from "react";
import { getConfig, guardarConfig, loginUsuario } from "../services/api";
import { UsuarioLogin } from "../tipos";

interface Props {
  usuarioActual: UsuarioLogin;
}

const Config = ({ usuarioActual }: Props) => {
  const [pesoAlerta,   setPesoAlerta]   = useState(150);
  const [pesoCritico,  setPesoCritico]  = useState(100);
  const [guardando,    setGuardando]    = useState(false);
  const [resultado,    setResultado]    = useState<string | null>(null);
  const [cargando,     setCargando]     = useState(true);

  // Modal confirmación
  const [modalAbierto,  setModalAbierto]  = useState(false);
  const [passConfirm,   setPassConfirm]   = useState("");
  const [errorConfirm,  setErrorConfirm]  = useState("");
  const [verificando,   setVerificando]   = useState(false);
  const [focusPass,     setFocusPass]     = useState(false);
  const [mostrarPass,   setMostrarPass]   = useState(false);

  useEffect(() => {
    getConfig().then(cfg => {
      setPesoAlerta(cfg.peso_alerta   ?? 150);
      setPesoCritico(cfg.peso_critico ?? 100);
      setCargando(false);
    });
  }, []);

  // Abre el modal antes de guardar
  const handleClickGuardar = () => {
    if (pesoCritico >= pesoAlerta) {
      setResultado("❌ El umbral crítico debe ser menor que el de alerta");
      return;
    }
    setPassConfirm("");
    setErrorConfirm("");
    setMostrarPass(false);
    setModalAbierto(true);
  };

  // Confirma con contraseña y guarda
  const handleConfirmar = async () => {
    if (!passConfirm) {
      setErrorConfirm("Ingresa tu contraseña");
      return;
    }
    setVerificando(true);
    setErrorConfirm("");
    try {
      // Verifica contraseña contra la BD
      await loginUsuario(usuarioActual.usuario, passConfirm);
      // Si no lanzó error, contraseña correcta → guardar
      setModalAbierto(false);
      setGuardando(true);
      setResultado(null);
      await guardarConfig(pesoAlerta, pesoCritico);
      setResultado("✅ Configuración guardada y enviada al ESP32");
      setTimeout(() => setResultado(null), 3000);
    } catch {
      setErrorConfirm("Contraseña incorrecta");
    } finally {
      setVerificando(false);
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
            <div style={{
              position: "absolute", left: 0,
              width: `${(pesoCritico / 500) * 100}%`,
              height: "100%", background: "rgba(239,68,68,0.4)",
            }}/>
            <div style={{
              position: "absolute",
              left: `${(pesoCritico / 500) * 100}%`,
              width: `${((pesoAlerta - pesoCritico) / 500) * 100}%`,
              height: "100%", background: "rgba(245,158,11,0.4)",
            }}/>
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
          onClick={handleClickGuardar}
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
          {guardando ? "Enviando al ESP32..." : "💾 GUARDAR"}
        </button>
      </div>

      {/* ── MODAL CONFIRMACIÓN ── */}
      {modalAbierto && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#0d111c",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: 16, padding: "32px 28px",
            width: "100%", maxWidth: 380,
            position: "relative",
            boxShadow: "0 0 60px rgba(245,158,11,0.08)",
          }}>
            {/* Top accent */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 2,
              background: "linear-gradient(90deg,transparent,#f59e0b,transparent)",
              borderRadius: "16px 16px 0 0",
            }}/>

            {/* Icono */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="#f59e0b" strokeWidth="1.8"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"/>
                  <circle cx="12" cy="16" r="1.5" fill="#f59e0b"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px", color: "#f1f5f9" }}>
                Confirmar cambios
              </h3>
              <p style={{ fontSize: 11, color: "#6b7280", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                Ingresa tu contraseña para aplicar
              </p>
            </div>

            {/* Resumen cambios */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: 8, padding: "10px 14px", marginBottom: 18,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            }}>
              <div style={{ color: "#6b7280", marginBottom: 6 }}>CAMBIOS A APLICAR</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#f59e0b" }}>⚠️ Umbral alerta</span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{pesoAlerta} g</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#ef4444" }}>🚨 Umbral crítico</span>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{pesoCritico} g</span>
              </div>
            </div>

            {/* Usuario */}
            <div style={{
              fontSize: 10, color: "#4b5563",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 10,
            }}>
              USUARIO: <span style={{ color: "#00e5ff" }}>{usuarioActual.usuario}</span>
              {" · "}{usuarioActual.rol}
            </div>

            {/* Input contraseña */}
            <div style={{ marginBottom: 16 }}>
              <label style={{
                fontSize: 10, color: "#6b7280",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.1em", display: "block", marginBottom: 7,
              }}>
                CONTRASEÑA
              </label>
              <div style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)",
                  color: focusPass ? "#f59e0b" : "#374151",
                  transition: "color 0.2s", pointerEvents: "none",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <input
                  type={mostrarPass ? "text" : "password"}
                  value={passConfirm}
                  onChange={e => { setPassConfirm(e.target.value); setErrorConfirm(""); }}
                  onFocus={() => setFocusPass(true)}
                  onBlur={() => setFocusPass(false)}
                  onKeyDown={e => e.key === "Enter" && handleConfirmar()}
                  placeholder="Tu contraseña"
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${errorConfirm ? "rgba(239,68,68,0.5)" : focusPass ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: focusPass && !errorConfirm ? "0 0 0 3px rgba(245,158,11,0.07)" : "none",
                    color: "#e2e8f0", borderRadius: 8,
                    padding: "11px 40px 11px 38px",
                    fontSize: 13, outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                />
                <button
                  onClick={() => setMostrarPass(v => !v)}
                  style={{
                    position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none",
                    color: mostrarPass ? "#f59e0b" : "#4b5563",
                    cursor: "pointer", padding: 4, transition: "color 0.2s",
                  }}
                >
                  {mostrarPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                </button>
              </div>

              {/* Error contraseña */}
              {errorConfirm && (
                <div style={{
                  marginTop: 8, fontSize: 11, color: "#ef4444",
                  fontFamily: "'JetBrains Mono', monospace",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {errorConfirm}
                </div>
              )}
            </div>

            {/* Botones */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleConfirmar}
                disabled={verificando}
                style={{
                  flex: 1,
                  background: verificando ? "rgba(245,158,11,0.04)" : "rgba(245,158,11,0.12)",
                  border: `1px solid ${verificando ? "rgba(245,158,11,0.1)" : "rgba(245,158,11,0.4)"}`,
                  color: verificando ? "#4b5563" : "#f59e0b",
                  borderRadius: 8, padding: "11px 0",
                  fontSize: 12, fontWeight: 700,
                  cursor: verificando ? "not-allowed" : "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s",
                }}>
                {verificando ? (
                  <>
                    <div style={{
                      width: 12, height: 12,
                      border: "2px solid rgba(245,158,11,0.3)",
                      borderTopColor: "#f59e0b",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}/>
                    VERIFICANDO...
                  </>
                ) : "✓ CONFIRMAR"}
              </button>

              <button
                onClick={() => { setModalAbierto(false); setPassConfirm(""); setErrorConfirm(""); }}
                disabled={verificando}
                style={{
                  flex: 1,
                  background: "rgba(107,114,128,0.07)",
                  border: "1px solid rgba(107,114,128,0.2)",
                  color: "#6b7280",
                  borderRadius: 8, padding: "11px 0",
                  fontSize: 12, cursor: verificando ? "not-allowed" : "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: "all 0.2s",
                }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Config;