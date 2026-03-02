import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { User, Heart, Wind, Droplets, Settings2, Activity } from "lucide-react";
import CorazonPulso from "../components/CorazonPulso";
import ArcoIndicador from "../components/ArcoIndicador";
import BarraFluido from "../components/BarraFluido";
import InsigniaAlerta from "../components/InsigniaAlerta";
import TooltipPersonalizado from "../components/TooltipPersonalizado";
import { EstadoLive, DatosSuero, DatosVitales, EstadoVital } from "../tipos";

interface Props {
  live:              EstadoLive;
  historialSuero?:   DatosSuero[];
  historialVitales?: DatosVitales[];
}

const Monitor = ({ live, historialSuero = [], historialVitales = [] }: Props) => {
  if (!live) return null;

  const datosFC   = (historialVitales ?? []).filter(h => h.fc   > 0);
  const datosSpo2 = (historialVitales ?? []).filter(h => h.spo2 > 0);
  const datosPeso = (historialSuero   ?? []).filter(h => h.peso >= 0);

  const fcMostrar   = live.fc   > 0 ? live.fc   : 0;
  const spo2Mostrar = live.spo2 > 0 ? live.spo2 : 0;
  const pesoMostrar = live.peso >= 0 ? live.peso : 0;

  const estadoFC:     EstadoVital = fcMostrar   < 60 ? "critical" : fcMostrar   > 100 ? "warn" : "ok";
  const estadoSpO2:   EstadoVital = spo2Mostrar < 90 ? "critical" : spo2Mostrar < 95  ? "warn" : "ok";
  const estadoFluido: EstadoVital = pesoMostrar <= 100 ? "critical" : pesoMostrar <= 150 ? "warn" : "ok";

  const estadoFCReal:   EstadoVital = fcMostrar   === 0 ? "ok" : estadoFC;
  const estadoSpo2Real: EstadoVital = spo2Mostrar === 0 ? "ok" : estadoSpO2;

  const coloresEstado: Record<EstadoVital, string> = {
    ok: "#10b981", warn: "#f59e0b", critical: "#ef4444",
  };
  const colorFluido = coloresEstado[estadoFluido];

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>

      {/* Barra paciente */}
      <div style={{
        background: "linear-gradient(135deg, rgba(0,229,255,0.06), rgba(244,63,94,0.06))",
        border: "1px solid rgba(0,229,255,0.12)",
        borderRadius: 14, padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "linear-gradient(135deg, #1e2436, #2d3748)",
            border: "2px solid rgba(0,229,255,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <User size={20} color="#00e5ff" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Paciente — Consultorio General</div>
            <div style={{ fontSize: 11, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace" }}>
              Posta Médica · Monitor en tiempo real
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <InsigniaAlerta label={fcMostrar   > 0 ? `FC ${fcMostrar} bpm`        : "FC Sin sensor"}   type={estadoFCReal} />
          <InsigniaAlerta label={spo2Mostrar > 0 ? `SpO2 ${spo2Mostrar}%`       : "SpO2 Sin sensor"} type={estadoSpo2Real} />
          <InsigniaAlerta label={`IV ${pesoMostrar.toFixed(1)} ml`}                                   type={estadoFluido} />
          <InsigniaAlerta label={live.bomba ? "BOMBA ACTIVA" : "BOMBA OFF"}                           type={live.bomba ? "warn" : "ok"} />
        </div>
      </div>

      {/* Tarjetas vitales */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>

        {/* FC */}
        <div className="card" style={{
          background: "rgba(13,17,28,0.8)", border: "1px solid rgba(244,63,94,0.2)",
          borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #f43f5e, transparent)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>FREC. CARDÍACA</div>
              <div style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>promedio 10s</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: "#f43f5e", lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                  {fcMostrar > 0 ? fcMostrar : "--"}
                </span>
                <span style={{ fontSize: 13, color: "#6b7280" }}>bpm</span>
              </div>
            </div>
            <CorazonPulso bpm={fcMostrar} color="#f43f5e" />
          </div>
          <InsigniaAlerta
            label={fcMostrar === 0 ? "Sin sensor" : estadoFCReal === "ok" ? "Normal" : estadoFCReal === "warn" ? "Atención" : "Crítico"}
            type={estadoFCReal}
          />
          <div style={{ marginTop: 12 }}>
            <ArcoIndicador value={fcMostrar} min={40} max={150} color="#f43f5e" size={60} />
          </div>
        </div>

        {/* SpO2 */}
        <div className="card" style={{
          background: "rgba(13,17,28,0.8)", border: "1px solid rgba(0,229,255,0.2)",
          borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #00e5ff, transparent)" }} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>SATURACIÓN O₂</div>
            <div style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>promedio 10s</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: "#00e5ff", lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                {spo2Mostrar > 0 ? spo2Mostrar : "--"}
              </span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>%</span>
            </div>
          </div>
          <InsigniaAlerta
            label={spo2Mostrar === 0 ? "Sin sensor" : estadoSpo2Real === "ok" ? "Normal" : estadoSpo2Real === "warn" ? "Baja" : "Crítica"}
            type={estadoSpo2Real}
          />
          <div style={{ marginTop: 12 }}>
            <ArcoIndicador value={spo2Mostrar} min={85} max={100} color="#00e5ff" size={60} />
          </div>
        </div>

        {/* Fluido IV */}
        <div className="card" style={{
          background: "rgba(13,17,28,0.8)", border: `1px solid ${colorFluido}30`,
          borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${colorFluido}, transparent)` }} />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace" }}>FLUIDO IV</div>
            <div style={{ fontSize: 9, color: "#374151", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>tiempo real · c/1s</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 42, fontWeight: 800, color: colorFluido, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                {pesoMostrar.toFixed(1)}
              </span>
              <span style={{ fontSize: 13, color: "#6b7280" }}>ml</span>
            </div>
          </div>
          <BarraFluido peso={pesoMostrar} />
          <div style={{ marginTop: 10 }}>
            <InsigniaAlerta
              label={estadoFluido === "ok" ? "Nivel OK" : estadoFluido === "warn" ? "Nivel bajo" : "Nivel crítico"}
              type={estadoFluido}
            />
          </div>
        </div>

        {/* Bomba */}
        <div className="card" style={{
          background: live.bomba ? "rgba(245,158,11,0.05)" : "rgba(13,17,28,0.8)",
          border: `1px solid ${live.bomba ? "#f59e0b40" : "#10b98130"}`,
          borderRadius: 16, padding: "20px", position: "relative", overflow: "hidden",
          transition: "all 0.4s ease",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${live.bomba ? "#f59e0b" : "#10b981"}, transparent)` }} />

          <div style={{ fontSize: 10, color: "#6b7280", letterSpacing: "0.1em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>BOMBA PERISTÁLTICA</div>

          <div style={{ position: "relative", display: "inline-block", marginBottom: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: live.bomba ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Settings2 size={22} color={live.bomba ? "#f59e0b" : "#10b981"} />
            </div>
            {live.bomba && (
              <div style={{
                position: "absolute", inset: -6,
                borderRadius: "50%",
                border: "2px solid #f59e0b",
                animation: "ping 1.2s ease-in-out infinite",
                opacity: 0.6,
              }} />
            )}
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, color: live.bomba ? "#f59e0b" : "#10b981", fontFamily: "'JetBrains Mono', monospace" }}>
            {live.bomba ? "ACTIVA" : "STANDBY"}
          </div>
          <div style={{ fontSize: 11, color: "#4b5563", marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            {live.bomba ? "Transfiriendo fluido de respaldo" : "Nivel de fluido suficiente"}
          </div>

          <div style={{
            marginTop: 14, padding: "6px 10px",
            background: live.bomba ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
            border: `1px solid ${live.bomba ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
            borderRadius: 6, fontSize: 9,
            color: live.bomba ? "#f59e0b" : "#10b981",
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.08em",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Activity size={9} />
            {live.bomba ? "AUTO — Activada por ESP32" : "STANDBY — En espera"}
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* FC */}
        <div className="card" style={{
          background: "rgba(13,17,28,0.8)", border: "1px solid rgba(244,63,94,0.15)",
          borderRadius: 16, padding: "20px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f43f5e", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
            <Heart size={14} /> Frecuencia Cardíaca
          </div>
          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
            {datosFC.length} promedios registrados
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={datosFC} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradFC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={4} />
              <YAxis domain={[40, 140]} tick={{ fontSize: 9, fill: "#374151" }} />
              <Tooltip content={<TooltipPersonalizado unit="bpm" color="#f43f5e" />} />
              <ReferenceLine y={60}  stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={100} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="fc" stroke="#f43f5e" strokeWidth={2} fill="url(#gradFC)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* SpO2 */}
        <div className="card" style={{
          background: "rgba(13,17,28,0.8)", border: "1px solid rgba(0,229,255,0.15)",
          borderRadius: 16, padding: "20px",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#00e5ff", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
            <Wind size={14} /> Saturación de Oxígeno
          </div>
          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
            {datosSpo2.length} promedios registrados
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={datosSpo2} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradSpO2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e5ff" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={4} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 9, fill: "#374151" }} />
              <Tooltip content={<TooltipPersonalizado unit="%" color="#00e5ff" />} />
              <ReferenceLine y={95} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="spo2" stroke="#00e5ff" strokeWidth={2} fill="url(#gradSpO2)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fluido IV — ancho completo */}
        <div className="card" style={{
          background: "rgba(13,17,28,0.8)", border: "1px solid rgba(167,139,250,0.15)",
          borderRadius: 16, padding: "20px", gridColumn: "1 / -1",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
            <Droplets size={14} /> Nivel de Fluido IV
          </div>
          <div style={{ fontSize: 10, color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", marginBottom: 16 }}>
            Alerta: 150 ml · Bomba ON / Crítico: 100 ml — actualización c/1s
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={datosPeso} margin={{ top: 5, right: 60, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gradPesoMon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
              <XAxis dataKey="time" tick={{ fontSize: 9, fill: "#374151" }} interval={9} />
              <YAxis domain={[0, 500]} tick={{ fontSize: 9, fill: "#374151" }} />
              <Tooltip content={<TooltipPersonalizado unit="ml" color="#a78bfa" />} />
              <ReferenceLine y={150} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: "Alerta 150 ml", fontSize: 9, fill: "#f59e0b", position: "right" }} />
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.6} label={{ value: "Crítico 100 ml", fontSize: 9, fill: "#ef4444", position: "right" }} />
              <Area type="monotone" dataKey="peso" stroke="#a78bfa" strokeWidth={2} fill="url(#gradPesoMon)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          70%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default Monitor;