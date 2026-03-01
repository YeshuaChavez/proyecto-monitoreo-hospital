import { useState, useEffect, useRef } from "react";
import { loginUsuario } from "../services/api";
import { UsuarioLogin } from "../tipos";

export default function Login({ onLogin }: { onLogin: (user: UsuarioLogin) => void }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mostrarPass, setMostrarPass] = useState(false);
  const [shake, setShake] = useState(false);
  const [focusU, setFocusU] = useState(false);
  const [focusP, setFocusP] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  /* ── ECG canvas background ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    // ECG waveform path
    const ecgSegment = (x: number, baseY: number, scale: number): [number, number][] => {
      const pts: [number, number][] = [];
      const seg = 120;
      for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        let y = baseY;
        if (t < 0.1) y = baseY;
        else if (t < 0.15) y = baseY - 6 * scale;
        else if (t < 0.2) y = baseY + 4 * scale;
        else if (t < 0.25) y = baseY - 40 * scale;
        else if (t < 0.3) y = baseY + 20 * scale;
        else if (t < 0.35) y = baseY - 8 * scale;
        else if (t < 0.45) y = baseY - 5 * scale;
        else if (t < 0.5) y = baseY;
        else y = baseY;
        pts.push([x + t * seg, y]);
      }
      return pts;
    };

    let offset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(0,229,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // ECG lines
      const rows = [h * 0.25, h * 0.5, h * 0.75];
      rows.forEach((baseY, ri) => {
        const scale = 0.5 + ri * 0.2;
        const alpha = 0.06 + ri * 0.03;
        ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#00e5ff";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        for (let rep = -1; rep < Math.ceil(w / 120) + 2; rep++) {
          const startX = rep * 120 - (offset % 120);
          const pts = ecgSegment(startX, baseY, scale);
          pts.forEach(([px, py], i) => {
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          });
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      offset += 0.8;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!usuario || !password) {
        setError("Completa todos los campos");
        triggerShake();
        return;
    }
    setCargando(true);
    setError("");
    try {
        const user = await loginUsuario(usuario, password);
        onLogin(user);
    } catch {
        setError("Usuario o contraseña incorrectos");
        triggerShake();
    } finally {
        setCargando(false);
    }
    };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#040810",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-5px); }
          80%     { transform: translateX(5px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 20px rgba(0,229,255,0.15); }
          50%     { box-shadow: 0 0 40px rgba(0,229,255,0.35); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes blink {
          0%,100% { opacity: 1; }
          50%     { opacity: 0; }
        }

        .login-card {
          animation: fadeUp 0.6s ease forwards;
        }
        .login-card.shake {
          animation: shake 0.5s ease;
        }
        .input-field {
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input-field:focus {
          outline: none;
        }
        .btn-login {
          transition: all 0.2s;
          position: relative;
          overflow: hidden;
        }
        .btn-login::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transition: left 0.4s;
        }
        .btn-login:hover::after {
          left: 100%;
        }
        .btn-login:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 32px rgba(0,229,255,0.3);
        }
        .btn-login:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* Animated ECG canvas */}
      <canvas ref={canvasRef} style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Scanline effect */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "linear-gradient(transparent 50%, rgba(0,0,0,0.03) 50%)",
        backgroundSize: "100% 4px",
        opacity: 0.4,
      }} />

      {/* Radial glow center */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,229,255,0.04) 0%, transparent 70%)",
      }} />

      {/* Top bar — hospital branding */}
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "14px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(0,229,255,0.07)",
        background: "rgba(4,8,16,0.8)",
        backdropFilter: "blur(10px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg,#ef4444,#f43f5e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px #ef444450",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.518 3.318 1 6.5 1c1.863 0 3.404 1.109 4.5 2.695C12.096 2.109 13.637 1 15.5 1 18.682 1 21 3.518 21 7.191c0 4.105-5.37 8.863-11 14.402z"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>
            Sistema de Monitoreo — Posta Médica
          </span>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, color: "#374151",
        }}>
          UNMSM · FISI · IoT 2026
        </div>
      </div>

      {/* Login card */}
      <div
        className={`login-card${shake ? " shake" : ""}`}
        style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 420,
          margin: "0 24px",
          background: "rgba(8,13,24,0.92)",
          border: "1px solid rgba(0,229,255,0.14)",
          borderRadius: 20,
          padding: "40px 36px",
          backdropFilter: "blur(20px)",
          animation: "fadeUp 0.6s ease forwards, glowPulse 4s ease infinite",
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: "linear-gradient(90deg, transparent, #00e5ff, #f43f5e, transparent)",
          borderRadius: "20px 20px 0 0",
        }} />

        {/* Icon + title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: "linear-gradient(135deg, rgba(0,229,255,0.1), rgba(244,63,94,0.1))",
            border: "1px solid rgba(0,229,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 0 30px rgba(0,229,255,0.1)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: 22, fontWeight: 700, margin: "0 0 6px",
            color: "#f1f5f9", letterSpacing: "-0.3px",
          }}>
            Acceso al Sistema
          </h1>
          <p style={{
            fontSize: 12, color: "#4b5563", margin: 0,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            MONITOR IoT · POSTA MÉDICA
          </p>
        </div>

        {/* Usuario */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.1em", display: "block", marginBottom: 7,
          }}>
            USUARIO
          </label>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              pointerEvents: "none",
              color: focusU ? "#00e5ff" : "#374151",
              transition: "color 0.2s",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              className="input-field"
              type="text"
              value={usuario}
              onChange={e => { setUsuario(e.target.value); setError(""); }}
              onFocus={() => setFocusU(true)}
              onBlur={() => setFocusU(false)}
              onKeyDown={handleKey}
              placeholder="Ingresa tu usuario"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${focusU ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                boxShadow: focusU ? "0 0 0 3px rgba(0,229,255,0.08)" : "none",
                color: "#e2e8f0", borderRadius: 10,
                padding: "12px 14px 12px 40px",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            fontSize: 10, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.1em", display: "block", marginBottom: 7,
          }}>
            CONTRASEÑA
          </label>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              pointerEvents: "none",
              color: focusP ? "#00e5ff" : "#374151",
              transition: "color 0.2s",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <input
              className="input-field"
              type={mostrarPass ? "text" : "password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onFocus={() => setFocusP(true)}
              onBlur={() => setFocusP(false)}
              onKeyDown={handleKey}
              placeholder="Ingresa tu contraseña"
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${focusP ? "rgba(0,229,255,0.5)" : "rgba(255,255,255,0.08)"}`,
                boxShadow: focusP ? "0 0 0 3px rgba(0,229,255,0.08)" : "none",
                color: "#e2e8f0", borderRadius: 10,
                padding: "12px 44px 12px 40px",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
            {/* Toggle password */}
            <button
              onClick={() => setMostrarPass(v => !v)}
              style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none",
                color: mostrarPass ? "#00e5ff" : "#4b5563",
                cursor: "pointer", padding: 4,
                transition: "color 0.2s",
              }}
            >
              {mostrarPass ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 16, padding: "10px 14px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 8, fontSize: 12,
            color: "#ef4444", fontFamily: "'JetBrains Mono', monospace",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          className="btn-login"
          onClick={handleSubmit}
          disabled={cargando}
          style={{
            width: "100%",
            background: cargando
              ? "rgba(0,229,255,0.05)"
              : "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,180,255,0.1))",
            border: `1px solid ${cargando ? "rgba(0,229,255,0.1)" : "rgba(0,229,255,0.4)"}`,
            color: cargando ? "#374151" : "#00e5ff",
            borderRadius: 10, padding: "13px 0",
            fontSize: 13, fontWeight: 700,
            cursor: cargando ? "not-allowed" : "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.08em",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          {cargando ? (
            <>
              <div style={{
                width: 14, height: 14, border: "2px solid rgba(0,229,255,0.3)",
                borderTopColor: "#00e5ff", borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }} />
              VERIFICANDO...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              INICIAR SESIÓN
            </>
          )}
        </button>

        {/* Bottom corner decorations */}
        <div style={{
          position: "absolute", bottom: 14, right: 16,
          fontSize: 9, color: "#1f2937",
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: "0.06em",
        }}>
          Ingreso solo para personal autorizado
        </div>
      </div>
    </div>
  );
}