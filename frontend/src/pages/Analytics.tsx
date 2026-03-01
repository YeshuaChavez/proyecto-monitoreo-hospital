import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from "recharts";
import { DatosSuero, DatosVitales, EstadoLive } from "../hooks/useLecturas";

interface Props {
  live:             EstadoLive;
  historialSuero:   DatosSuero[];
  historialVitales: DatosVitales[];
}

// ══════════════════════════════════════════════════════════════
//  ML — Regresión lineal (mínimos cuadrados)
// ══════════════════════════════════════════════════════════════
function regresionLineal(puntos: { x: number; y: number }[]) {
  const n = puntos.length;
  if (n < 2) return { pendiente: 0, intercepto: 0, r2: 0 };
  const sumX  = puntos.reduce((a, p) => a + p.x, 0);
  const sumY  = puntos.reduce((a, p) => a + p.y, 0);
  const sumXY = puntos.reduce((a, p) => a + p.x * p.y, 0);
  const sumX2 = puntos.reduce((a, p) => a + p.x * p.x, 0);
  const pendiente  = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercepto = (sumY - pendiente * sumX) / n;
  const mediaY = sumY / n;
  const ssTot  = puntos.reduce((a, p) => a + (p.y - mediaY) ** 2, 0);
  const ssRes  = puntos.reduce((a, p) => a + (p.y - (pendiente * p.x + intercepto)) ** 2, 0);
  const r2     = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { pendiente, intercepto, r2 };
}

// ══════════════════════════════════════════════════════════════
//  ML — Detección de anomalías (z-score)
// ══════════════════════════════════════════════════════════════
function detectarAnomalia(tasas: number[]) {
  if (tasas.length < 5) return { anomalia: false, zScore: 0 };
  const media = tasas.reduce((a, b) => a + b, 0) / tasas.length;
  const std   = Math.sqrt(tasas.reduce((a, b) => a + (b - media) ** 2, 0) / tasas.length);
  if (std === 0) return { anomalia: false, zScore: 0 };
  const zScore = Math.abs((tasas[tasas.length - 1] - media) / std);
  return { anomalia: zScore > 2.5, zScore: +zScore.toFixed(2) };
}

// ══════════════════════════════════════════════════════════════
//  COMPONENTE
// ══════════════════════════════════════════════════════════════
const Analytics = ({ live, historialSuero, historialVitales }: Props) => {

  const mlSuero = useMemo(() => {
    const datos = historialSuero.filter(d => d.peso > 0).slice(-60);
    if (datos.length < 5) return null;
    const puntos = datos.map((d, i) => ({ x: i, y: d.peso }));
    const { pendiente, intercepto, r2 } = regresionLineal(puntos);
    const tasaGxMin = -(pendiente * 60);
    const tasas: number[] = [];
    for (let i = 1; i < datos.length; i++) tasas.push(datos[i-1].peso - datos[i].peso);
    const { anomalia, zScore } = detectarAnomalia(tasas);
    let claseGoteo = "NORMAL", colorGoteo = "#10b981";
    if (tasaGxMin < 0.5)      { claseGoteo = "DETENIDO"; colorGoteo = "#ef4444"; }
    else if (tasaGxMin < 1.5) { claseGoteo = "LENTO";    colorGoteo = "#f59e0b"; }
    else if (tasaGxMin > 6)   { claseGoteo = "RÁPIDO";   colorGoteo = "#f59e0b"; }
    const pesoActual = datos[datos.length - 1].peso;
    const minHastaCritico = pendiente < 0
      ? Math.max(0, (100 - (intercepto + pendiente * (datos.length-1))) / -(pendiente*60))
      : null;
    const minHastaVacio = pendiente < 0
      ? Math.max(0, (0 - (intercepto + pendiente * (datos.length-1))) / -(pendiente*60))
      : null;
    const tendencia = datos.map((d, i) => ({
      ...d, tendencia: +(intercepto + pendiente * i).toFixed(1),
    }));
    return {
      r2: +r2.toFixed(3), tasaGxMin: +tasaGxMin.toFixed(2),
      claseGoteo, colorGoteo, anomalia, zScore, pesoActual,
      minHastaCritico: minHastaCritico !== null ? +minHastaCritico.toFixed(0) : null,
      minHastaVacio:   minHastaVacio   !== null ? +minHastaVacio.toFixed(0)   : null,
      tendencia, muestras: datos.length,
    };
  }, [historialSuero]);

  const statsV = useMemo(() => {
    const v = historialVitales.filter(d => d.fc > 0 && d.spo2 > 0);
    if (!v.length) return null;
    return {
      promedioFC:   +(v.reduce((a,b) => a+b.fc,   0)/v.length).toFixed(0),
      promedioSpo2: +(v.reduce((a,b) => a+b.spo2, 0)/v.length).toFixed(1),
      minFC:   Math.min(...v.map(d=>d.fc)),
      maxFC:   Math.max(...v.map(d=>d.fc)),
      minSpo2: Math.min(...v.map(d=>d.spo2)),
    };
  }, [historialVitales]);

  const Card = ({ children, style = {} }: any) => (
    <div style={{ background:"rgba(13,17,28,0.8)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:16, padding:20, ...style }}>
      {children}
    </div>
  );
  const SectionLabel = ({ text, color }: { text: string; color: string }) => (
    <div style={{ fontSize:11, color, fontFamily:"'JetBrains Mono', monospace", letterSpacing:"0.12em", marginBottom:12, marginTop:8 }}>
      ◈ {text}
    </div>
  );
  const MetaLabel = ({ text }: { text: string }) => (
    <div style={{ fontSize:10, color:"#6b7280", fontFamily:"'JetBrains Mono', monospace", letterSpacing:"0.1em", marginBottom:8, textTransform:"uppercase" as const }}>
      {text}
    </div>
  );

  return (
    <div style={{ animation:"fadeIn 0.3s ease" }}>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:20, fontWeight:700, margin:0 }}>Analytics</h2>
        <p style={{ fontSize:12, color:"#4b5563", margin:"4px 0 0", fontFamily:"'JetBrains Mono', monospace" }}>
          Análisis estadístico + predicción ML del flujo de suero
        </p>
      </div>

      {/* ── ML SUERO ─────────────────────────────────────────── */}
      <SectionLabel text="MACHINE LEARNING — ANÁLISIS DE FLUIDO IV" color="#a78bfa" />

      {mlSuero ? (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
            {/* Tasa de goteo */}
            <Card style={{ borderTop:`2px solid ${mlSuero.colorGoteo}` }}>
              <MetaLabel text="Tasa de goteo" />
              <div style={{ fontSize:30, fontWeight:800, color:mlSuero.colorGoteo, fontFamily:"'JetBrains Mono', monospace", lineHeight:1 }}>{mlSuero.tasaGxMin}</div>
              <div style={{ fontSize:10, color:"#4b5563", marginTop:3 }}>g / min</div>
              <div style={{ marginTop:8, display:"inline-block", padding:"2px 8px", borderRadius:99, fontSize:9, fontWeight:700, fontFamily:"'JetBrains Mono', monospace", background:`${mlSuero.colorGoteo}18`, color:mlSuero.colorGoteo }}>
                {mlSuero.claseGoteo}
              </div>
            </Card>

            {/* Tiempo hasta crítico */}
            <Card style={{ borderTop:"2px solid #f59e0b" }}>
              <MetaLabel text="Tiempo hasta crítico" />
              <div style={{ fontSize:30, fontWeight:800, color:mlSuero.minHastaCritico!==null?"#f59e0b":"#6b7280", fontFamily:"'JetBrains Mono', monospace", lineHeight:1 }}>
                {mlSuero.minHastaCritico!==null ? mlSuero.minHastaCritico : "—"}
              </div>
              <div style={{ fontSize:10, color:"#4b5563", marginTop:3 }}>minutos</div>
              <div style={{ fontSize:9, color:"#374151", marginTop:6, fontFamily:"'JetBrains Mono', monospace" }}>umbral: 100g</div>
            </Card>

            {/* Tiempo hasta vacío */}
            <Card style={{ borderTop:"2px solid #ef4444" }}>
              <MetaLabel text="Tiempo hasta vacío" />
              <div style={{ fontSize:30, fontWeight:800, color:mlSuero.minHastaVacio!==null?"#ef4444":"#6b7280", fontFamily:"'JetBrains Mono', monospace", lineHeight:1 }}>
                {mlSuero.minHastaVacio!==null ? mlSuero.minHastaVacio : "—"}
              </div>
              <div style={{ fontSize:10, color:"#4b5563", marginTop:3 }}>minutos</div>
              <div style={{ fontSize:9, color:"#374151", marginTop:6, fontFamily:"'JetBrains Mono', monospace" }}>peso: {mlSuero.pesoActual.toFixed(0)}g</div>
            </Card>

            {/* Anomalía */}
            <Card style={{ borderTop:`2px solid ${mlSuero.anomalia?"#ef4444":"#10b981"}` }}>
              <MetaLabel text="Anomalía en goteo" />
              <div style={{ fontSize:30, fontWeight:800, color:mlSuero.anomalia?"#ef4444":"#10b981", fontFamily:"'JetBrains Mono', monospace", lineHeight:1 }}>
                {mlSuero.anomalia ? "SÍ" : "NO"}
              </div>
              <div style={{ fontSize:10, color:"#4b5563", marginTop:3 }}>z-score: {mlSuero.zScore}</div>
              <div style={{ fontSize:9, color:"#374151", marginTop:6, fontFamily:"'JetBrains Mono', monospace" }}>
                {mlSuero.anomalia ? "Revisar catéter" : "Flujo estable"}
              </div>
            </Card>
          </div>

          {/* Gráfica peso + tendencia */}
          <Card style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>Fluido IV — Peso real + Línea de tendencia</div>
              <div style={{ display:"flex", gap:16, fontSize:10, fontFamily:"'JetBrains Mono', monospace", color:"#6b7280" }}>
                <span><span style={{color:"#a78bfa"}}>●</span> Peso real</span>
                <span><span style={{color:"#f59e0b"}}>- -</span> Tendencia ML</span>
                <span style={{color:"#374151"}}>R² = {mlSuero.r2}</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mlSuero.tendencia} margin={{ top:5, right:20, bottom:0, left:-10 }}>
                <defs>
                  <linearGradient id="gradPeso" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                <XAxis dataKey="time" tick={{ fontSize:9, fill:"#374151" }} interval={9} />
                <YAxis domain={[0,600]} tick={{ fontSize:9, fill:"#6b7280" }} />
                <Tooltip contentStyle={{ background:"rgba(10,14,26,0.95)", border:"1px solid #1e2436", borderRadius:8, fontSize:11, fontFamily:"'JetBrains Mono', monospace" }}
                  formatter={(val:any, name?:string) => [`${Number(val).toFixed(1)}g`, name==="peso"?"Peso real":"Tendencia ML"] as [string, string]} />
                <ReferenceLine y={150} stroke="#f59e0b" strokeDasharray="4 2" label={{ value:"ALERTA 150g", position:"right", fontSize:9, fill:"#f59e0b" }} />
                <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="4 2" label={{ value:"CRÍTICO 100g", position:"right", fontSize:9, fill:"#ef4444" }} />
                <Area type="monotone" dataKey="peso"      stroke="#a78bfa" strokeWidth={2} fill="url(#gradPeso)" dot={false} name="peso" />
                <Line type="monotone"  dataKey="tendencia" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="5 3" name="tendencia" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(167,139,250,0.06)", borderRadius:8, fontSize:11, color:"#9ca3af", fontFamily:"'JetBrains Mono', monospace" }}>
              Modelo: Regresión Lineal (mínimos cuadrados) · {mlSuero.muestras} muestras · R² = {mlSuero.r2}
              {mlSuero.r2>=0.85?" · ✓ Ajuste excelente":mlSuero.r2>=0.6?" · ~ Ajuste moderado":" · ⚠ Patrón irregular"}
            </div>
          </Card>
        </>
      ) : (
        <Card style={{ marginBottom:16, textAlign:"center", padding:40 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
          <div style={{ color:"#6b7280", fontSize:13 }}>Acumulando datos de suero...</div>
          <div style={{ color:"#374151", fontSize:11, marginTop:4, fontFamily:"'JetBrains Mono', monospace" }}>Se necesitan al menos 5 lecturas</div>
        </Card>
      )}

      {/* ── VITALES ──────────────────────────────────────────── */}
      <SectionLabel text="SIGNOS VITALES — HISTORIAL" color="#00e5ff" />

      {statsV && historialVitales.length > 0 ? (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginBottom:16 }}>
            {[
              { label:"FC Promedio",   valor:statsV.promedioFC,   unidad:"bpm", color:"#f43f5e" },
              { label:"FC Mínima",     valor:statsV.minFC,        unidad:"bpm", color:"#f59e0b" },
              { label:"FC Máxima",     valor:statsV.maxFC,        unidad:"bpm", color:"#ef4444" },
              { label:"SpO2 Promedio", valor:statsV.promedioSpo2, unidad:"%",   color:"#00e5ff" },
              { label:"SpO2 Mínima",   valor:statsV.minSpo2,      unidad:"%",   color:"#f59e0b" },
            ].map((s,i) => (
              <Card key={i} style={{ borderTop:`2px solid ${s.color}` }}>
                <MetaLabel text={s.label} />
                <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:"'JetBrains Mono', monospace", lineHeight:1 }}>{s.valor}</div>
                <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>{s.unidad}</div>
              </Card>
            ))}
          </div>

          <Card style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:16, color:"#e2e8f0" }}>FC y SpO2 — Vista comparativa (promedios cada 10s)</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historialVitales} margin={{ top:5, right:20, bottom:0, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2436" />
                <XAxis dataKey="time" tick={{ fontSize:9, fill:"#374151" }} interval={4} />
                <YAxis yAxisId="fc"   domain={[40,140]} tick={{ fontSize:9, fill:"#f43f5e" }} />
                <YAxis yAxisId="spo2" orientation="right" domain={[85,100]} tick={{ fontSize:9, fill:"#00e5ff" }} />
                <Tooltip contentStyle={{ background:"rgba(10,14,26,0.95)", border:"1px solid #1e2436", borderRadius:8, fontSize:11, fontFamily:"'JetBrains Mono', monospace" }} />
                <ReferenceLine yAxisId="fc"   y={100} stroke="#ef4444" strokeDasharray="3 2" />
                <ReferenceLine yAxisId="fc"   y={60}  stroke="#f59e0b" strokeDasharray="3 2" />
                <ReferenceLine yAxisId="spo2" y={95}  stroke="#f59e0b" strokeDasharray="3 2" />
                <Line yAxisId="fc"   type="monotone" dataKey="fc"   stroke="#f43f5e" strokeWidth={2} dot={false} name="FC (bpm)" />
                <Line yAxisId="spo2" type="monotone" dataKey="spo2" stroke="#00e5ff" strokeWidth={2} dot={false} name="SpO2 (%)" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            {[
              { titulo:"Interpretación FC", color:"#f43f5e", items:[
                  { label:"Rango normal",  valor:"60–100 bpm",                                     ok:true },
                  { label:"Promedio",       valor:`${statsV.promedioFC} bpm`,                      ok:+statsV.promedioFC>=60&&+statsV.promedioFC<=100 },
                  { label:"Variabilidad",   valor:`${statsV.maxFC-statsV.minFC} bpm`,               ok:statsV.maxFC-statsV.minFC<30 },
              ]},
              { titulo:"Interpretación SpO2", color:"#00e5ff", items:[
                  { label:"Rango normal",       valor:"≥ 95%",                 ok:true },
                  { label:"Promedio",            valor:`${statsV.promedioSpo2}%`, ok:+statsV.promedioSpo2>=95 },
                  { label:"Mínimo registrado",   valor:`${statsV.minSpo2}%`,     ok:+statsV.minSpo2>=90 },
              ]},
            ].map((panel,i) => (
              <Card key={i} style={{ border:`1px solid ${panel.color}20` }}>
                <div style={{ fontSize:13, fontWeight:700, color:panel.color, marginBottom:14 }}>{panel.titulo}</div>
                {panel.items.map((item,j) => (
                  <div key={j} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <span style={{ fontSize:12, color:"#9ca3af" }}>{item.label}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:item.ok?"#10b981":"#ef4444", fontFamily:"'JetBrains Mono', monospace" }}>
                      {item.ok?"✓":"✗"} {item.valor}
                    </span>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card style={{ textAlign:"center", padding:40 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📡</div>
          <div style={{ color:"#6b7280", fontSize:13 }}>Esperando datos de vitales...</div>
          <div style={{ color:"#374151", fontSize:11, marginTop:4, fontFamily:"'JetBrains Mono', monospace" }}>Llegan cada 10 segundos desde el ESP32</div>
        </Card>
      )}
    </div>
  );
};

export default Analytics;