import { useEffect, useRef } from "react";
import { Lectura } from "../tipos";

interface Props {
  lectura: Lectura;
}

const EscenaPaciente = ({ lectura }: Props) => {
  const ecgRef   = useRef<HTMLCanvasElement>(null);
  const dataRef  = useRef<number[]>(new Array(80).fill(50));
  const phaseRef = useRef(0);
  const animRef  = useRef<number>(0);

  const { fc: bpm, spo2, peso } = lectura;
  const PESO_MAX  = 500;
  const pct       = Math.max(0, Math.min(1, peso / PESO_MAX));
  const fillH     = pct * 91;
  const yStart    = 72 + (91 - fillH);
  const bpmSpeed  = (60 / Math.max(1, bpm)).toFixed(2) + "s";

  const liqTop = pct > 0.5 ? "rgba(0,220,255,0.75)"  : pct > 0.2 ? "rgba(255,180,0,0.75)"  : "rgba(255,50,80,0.75)";
  const liqBot = pct > 0.5 ? "rgba(0,150,220,0.55)"  : pct > 0.2 ? "rgba(220,120,0,0.55)"  : "rgba(200,20,50,0.55)";

  function ecgPt(phase: number): number {
    const p = phase % 1;
    if (p < 0.05) return 50 + (p / 0.05) * 6;
    if (p < 0.08) return 56 - ((p - 0.05) / 0.03) * 10;
    if (p < 0.12) return 46 + ((p - 0.08) / 0.04) * 24;
    if (p < 0.18) return 70 - ((p - 0.12) / 0.06) * 34;
    if (p < 0.22) return 36 + ((p - 0.18) / 0.04) * 20;
    if (p < 0.28) return 56 - ((p - 0.22) / 0.06) * 8;
    if (p < 0.38) return 48 + Math.sin(((p - 0.28) / 0.10) * Math.PI) * 8;
    return 50 + (Math.random() - 0.5) * 0.6;
  }

  useEffect(() => {
    const canvas = ecgRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const loop = () => {
      const w = canvas.offsetWidth || 160;
      const h = canvas.offsetHeight || 44;
      canvas.width = w; canvas.height = h;
      phaseRef.current += (60 / Math.max(1, bpm)) * 0.012;
      dataRef.current.push(ecgPt(phaseRef.current));
      if (dataRef.current.length > w) dataRef.current.shift();
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,15,8,0.5)";
      ctx.fillRect(0, 0, w, h);
      ctx.beginPath();
      const step = w / dataRef.current.length;
      dataRef.current.forEach((v, i) => {
        const x = i * step, y = (v / 100) * h;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "rgba(0,230,80,0.9)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(0,220,80,0.6)";
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [bpm]);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&family=Share+Tech+Mono&display=swap');
        @keyframes sv-heart  { 0%,100%{transform:scale(1)} 15%{transform:scale(1.2)} 30%{transform:scale(1)} 45%{transform:scale(1.08)} 60%{transform:scale(1)} }
        @keyframes sv-spo2   { 0%,100%{opacity:0.5;filter:drop-shadow(0 0 3px #ff2d5b)} 50%{opacity:1;filter:drop-shadow(0 0 12px #ff2d5b)} }
        @keyframes sv-drop   { 0%{transform:translateY(0);opacity:1} 80%{opacity:1} 100%{transform:translateY(22px);opacity:0} }
        @keyframes sv-flow   { from{stroke-dashoffset:30} to{stroke-dashoffset:-30} }
        @keyframes sv-ripple { from{r:3;opacity:1} to{r:10;opacity:0} }
        @keyframes sv-led    { 0%,100%{opacity:0.35} 50%{opacity:1} }
        .sv-heart { animation: sv-heart ${bpmSpeed} ease-in-out infinite; transform-origin: 170px 342px; }
        .sv-spo2  { animation: sv-spo2  ${bpmSpeed} ease-in-out infinite; }
        .sv-da    { animation: sv-drop 1.2s ease-in infinite; }
        .sv-db    { animation: sv-drop 1.2s ease-in 0.6s infinite; }
        .sv-led   { animation: sv-led  1.1s ease-in-out infinite; }
      `}</style>

      <svg viewBox="0 0 700 520" xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="sv-skin"   x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor="#c8845a"/><stop offset="100%" stopColor="#a06040"/></linearGradient>
          <linearGradient id="sv-face"   x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor="#d4906a"/><stop offset="100%" stopColor="#b07050"/></linearGradient>
          <linearGradient id="sv-bed"    x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor="#0d2a40"/><stop offset="100%" stopColor="#071520"/></linearGradient>
          <linearGradient id="sv-blank"  x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor="#1a4a7a"/><stop offset="100%" stopColor="#102848"/></linearGradient>
          <linearGradient id="sv-pillow" x1="0" y1="1" x2="1" y2="0"><stop offset="0%"   stopColor="#f0ebe0"/><stop offset="100%" stopColor="#d8d0c0"/></linearGradient>
          <linearGradient id="sv-liq"    x1="0" y1="0" x2="0" y2="1"><stop offset="0%"   stopColor={liqTop}/><stop offset="100%" stopColor={liqBot}/></linearGradient>
          <linearGradient id="sv-bag"    x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(0,150,200,0.2)"/>
            <stop offset="50%"  stopColor="rgba(0,200,255,0.35)"/>
            <stop offset="100%" stopColor="rgba(0,150,200,0.2)"/>
          </linearGradient>
          <clipPath id="sv-bagclip"><path d="M580,72 Q596,68 612,72 L618,155 Q596,163 574,155 Z"/></clipPath>
          <filter id="sv-gblue"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="sv-gred" ><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="sv-shade"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(0,0,0,0.5)"/></filter>
        </defs>

        {/* ── Poste IV ── */}
        <ellipse cx="596" cy="505" rx="30" ry="6" fill="rgba(0,0,0,0.4)"/>
        <line x1="580" y1="498" x2="612" y2="498" stroke="#1a3a5a" strokeWidth={5} strokeLinecap="round"/>
        <circle cx="578" cy="500" r="4" fill="#0d2030"/>
        <circle cx="614" cy="500" r="4" fill="#0d2030"/>
        <rect x="594" y="40" width="4" height="460" fill="url(#sv-bed)" rx="2"/>
        <rect x="570" y="38" width="52" height="6"   fill="#1a3a5a" rx="3"/>

        {/* ── Bolsa IV ── */}
        <path d="M596,38 Q596,28 606,24 Q616,20 616,28" fill="none" stroke="#2a5a8a" strokeWidth={3} strokeLinecap="round"/>
        <ellipse cx="596" cy="118" rx="26" ry="48" fill="rgba(0,100,160,0.12)" filter="url(#sv-gblue)"/>
        <path d="M580,72 Q596,67 612,72 L618,155 Q596,163 574,155 Z" fill="url(#sv-bag)" stroke="rgba(0,200,255,0.55)" strokeWidth={1.5}/>
        <g clipPath="url(#sv-bagclip)">
          <rect x="574" y={yStart} width="44" height={fillH + 2} fill="url(#sv-liq)" opacity="0.9"/>
          <path d="M570,0 Q580,-5 590,0 Q600,5 610,0 Q620,-3 630,0 L630,10 L570,10 Z" fill="rgba(255,255,255,0.15)">
            <animateTransform attributeName="transform" type="translate" from="-20,72" to="20,72" dur="2s" repeatCount="indefinite"/>
          </path>
        </g>
        <text x="596" y="105" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="7" fill="rgba(255,255,255,0.6)">NaCl</text>
        <text x="596" y="116" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="7" fill="rgba(255,255,255,0.4)">0.9%</text>
        <text x="596" y="128" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="7" fill="rgba(255,255,255,0.3)">500mL</text>
        <rect x="590" y="157" width="12" height="8" rx="3" fill="rgba(0,100,150,0.5)" stroke="rgba(0,180,255,0.5)" strokeWidth={1}/>

        {/* ── Gotero ── */}
        <line x1="596" y1="165" x2="596" y2="190" stroke="rgba(0,200,255,0.35)" strokeWidth={2.5}/>
        <rect x="590" y="190" width="12" height="24" rx="3" fill="rgba(0,150,200,0.1)" stroke="rgba(0,180,255,0.4)" strokeWidth={1}/>
        <ellipse className="sv-da" cx="596" cy="196" rx="2.5" ry="3.5" fill="rgba(0,220,255,0.9)" filter="url(#sv-gblue)"/>
        <ellipse className="sv-db" cx="596" cy="196" rx="2"   ry="3"   fill="rgba(0,200,255,0.7)" filter="url(#sv-gblue)"/>

        {/* ── Tubo IV → muñeca ── */}
        <path d="M596,214 C596,252 575,272 545,287 C515,302 475,308 445,309 C415,309 385,309 330,309 C310,309 295,309 281,310"
          fill="none" stroke="rgba(160,220,255,0.15)" strokeWidth={5.5} strokeLinecap="round"/>
        <path d="M596,214 C596,252 575,272 545,287 C515,302 475,308 445,309 C415,309 385,309 330,309 C310,309 295,309 281,310"
          fill="none" stroke="rgba(0,190,255,0.35)" strokeWidth={3} strokeLinecap="round"/>
        <path d="M596,214 C596,252 575,272 545,287 C515,302 475,308 445,309 C415,309 385,309 330,309 C310,309 295,309 281,310"
          fill="none" stroke="rgba(0,235,255,0.75)" strokeWidth={1.8} strokeDasharray="14,16" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" from="30" to="-30" dur="1s" repeatCount="indefinite"/>
        </path>

        {/* ── Cama ── */}
        <ellipse cx="310" cy="508" rx="220" ry="12" fill="rgba(0,0,0,0.5)"/>
        <rect x="100" y="310" width="18" height="180" fill="#0d2030" rx="4"/>
        <rect x="94"  y="310" width="30" height="12"  fill="#112840" rx="3"/>
        <rect x="94"  y="480" width="30" height="14"  fill="#0a1e30" rx="3"/>
        <rect x="502" y="330" width="16" height="160" fill="#0d2030" rx="4"/>
        <rect x="496" y="330" width="28" height="10"  fill="#112840" rx="3"/>
        <rect x="496" y="482" width="28" height="12"  fill="#0a1e30" rx="3"/>
        <circle cx="106" cy="496" r="8" fill="#081520" stroke="#0d2a40" strokeWidth={2}/>
        <circle cx="512" cy="496" r="7" fill="#081520" stroke="#0d2a40" strokeWidth={2}/>
        <rect x="108" y="318" width="396" height="10" fill="#0f2840" rx="2"/>
        <rect x="108" y="480" width="396" height="10" fill="#0a1e30" rx="2"/>
        <rect x="108" y="296" width="394" height="28" fill="#ddd5c0" rx="4" opacity="0.9"/>

        {/* Almohada */}
        <ellipse cx="183" cy="304" rx="68" ry="18" fill="url(#sv-pillow)" opacity="0.95"/>
        <ellipse cx="183" cy="300" rx="64" ry="14" fill="#f5f0e8" opacity="0.6"/>

        {/* Manta */}
        <path d="M114,308 L502,308 L502,480 L114,480 Z" fill="url(#sv-blank)"/>
        <path d="M114,308 Q310,300 502,308 L502,330 Q310,322 114,330 Z" fill="rgba(30,80,140,0.6)"/>
        <line x1="200" y1="330" x2="195" y2="480" stroke="rgba(10,40,80,0.3)" strokeWidth={1.5}/>
        <line x1="300" y1="330" x2="298" y2="480" stroke="rgba(10,40,80,0.3)" strokeWidth={1.5}/>
        <line x1="400" y1="330" x2="402" y2="480" stroke="rgba(10,40,80,0.3)" strokeWidth={1.5}/>
        <rect x="114" y="308" width="388" height="5" fill="rgba(40,100,180,0.4)" rx="1"/>

        {/* Cuerpo */}
        <rect x="130" y="286" width="90" height="20" fill="url(#sv-skin)" rx="8" opacity="0.7"/>

        {/* Brazo */}
        <path d="M195,303 Q230,300 262,306 Q275,309 285,310" fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={14} strokeLinecap="round"/>
        <path d="M195,303 Q230,300 262,306 Q275,309 285,310" fill="none" stroke="#c07858"          strokeWidth={12} strokeLinecap="round"/>

        {/* Mano */}
        <ellipse cx="291" cy="310" rx="11" ry="8"   fill="#c07858"/>
        <ellipse cx="301" cy="307" rx="4.5" ry="3"   fill="#b87050" transform="rotate(-10,301,307)"/>
        <ellipse cx="302" cy="311" rx="4.5" ry="2.8" fill="#b87050"/>
        <ellipse cx="300" cy="315" rx="4.5" ry="3"   fill="#b87050" transform="rotate(10,300,315)"/>
        <ellipse cx="287" cy="318" rx="3.5" ry="4.5" fill="#b87050" transform="rotate(18,287,318)"/>

        {/* Cánula IV */}
        <rect x="272" y="306" width="11" height="7" rx="2" fill="rgba(0,150,200,0.45)" stroke="rgba(0,210,255,0.75)" strokeWidth={1}/>
        <line x1="282" y1="309.5" x2="272" y2="309.5" stroke="rgba(190,230,255,0.9)" strokeWidth={1.8} strokeLinecap="round"/>
        <polygon points="272,308 265,309.5 272,311.5" fill="rgba(200,235,255,0.92)" stroke="rgba(0,180,255,0.5)" strokeWidth={0.5}/>
        <circle cx="265" cy="309.5" r="3.5" fill="rgba(0,200,255,0.22)" stroke="rgba(0,200,255,0.85)" strokeWidth={1.3}/>
        <circle cx="265" cy="309.5" r="3"   fill="none" stroke="rgba(0,210,255,0.5)" strokeWidth={1}>
          <animate attributeName="r"       from="3" to="10" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="1" to="0"  dur="1.5s" repeatCount="indefinite"/>
        </circle>
        <rect x="258" y="305" width="22" height="9" rx="3" fill="rgba(235,215,175,0.48)" stroke="rgba(195,170,130,0.5)" strokeWidth={0.8}/>
        <text x="265" y="295" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="7" fill="rgba(0,200,255,0.75)">IV LINE</text>
        <line x1="265" y1="296" x2="265" y2="302" stroke="rgba(0,200,255,0.45)" strokeWidth={1} strokeDasharray="2,2"/>

        {/* Dedal oxímetro */}
        <g className="sv-spo2" filter="url(#sv-gred)">
          <rect x="297" y="301" width="16" height="11" rx="4"   fill="#cc1a3a" opacity="0.96"/>
          <rect x="297" y="299" width="16" height="5"  rx="2.5" fill="#991020" opacity="0.96"/>
          <circle cx="305" cy="307" r="3"   fill="#ff3a5a" opacity="0.98"/>
          <circle cx="305" cy="307" r="4.5" fill="none" stroke="rgba(255,50,80,0.55)" strokeWidth={1.2}/>
          <rect x="299" y="302" width="5" height="3" rx="1.5" fill="rgba(255,180,180,0.25)"/>
        </g>

        {/* Cable oxímetro animado */}
        <path d="M313,306 C330,300 350,292 370,285 C390,278 410,275 430,290 C445,302 448,320 450,340"
          fill="none" stroke="rgba(255,60,90,0.6)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="5,3">
          <animate attributeName="stroke-dashoffset" from="0" to="-16" dur="0.85s" repeatCount="indefinite"/>
        </path>

        {/* Tag SpO2 flotante */}
        <rect x="314" y="270" width="56" height="26" rx="5" fill="rgba(255,20,50,0.15)" stroke="rgba(255,60,90,0.45)" strokeWidth={1}/>
        <text x="342" y="280" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="6.5" fill="rgba(255,100,120,0.8)" letterSpacing="1">SpO₂</text>
        <text x="342" y="292" textAnchor="middle" fontFamily="Orbitron" fontWeight="700" fontSize="10" fill="rgba(255,80,100,0.98)">{spo2}%</text>
        <line x1="342" y1="296" x2="342" y2="300" stroke="rgba(255,60,90,0.4)" strokeWidth={1} strokeDasharray="2,2"/>

        {/* Tag peso ESP32 flotante */}
        <rect x="420" y="295" width="90" height="26" rx="5" fill="rgba(2,12,22,0.88)" stroke="rgba(0,180,255,0.3)" strokeWidth={1}/>
        <text x="465" y="305" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="5.5" fill="rgba(0,180,255,0.7)" letterSpacing="0.5">ESP32 · HX711</text>
        <text x="465" y="317" textAnchor="middle" fontFamily="Orbitron" fontWeight="700" fontSize="9" fill="rgba(0,220,255,0.95)">{peso.toFixed(1)} g IV</text>

        {/* Tag FC flotante */}
        <rect x="376" y="345" width="72" height="26" rx="5" fill="rgba(255,20,50,0.12)" stroke="rgba(255,60,90,0.35)" strokeWidth={1}/>
        <text x="412" y="355" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="6" fill="rgba(255,100,120,0.8)" letterSpacing="0.5">FREC. CARD.</text>
        <text x="412" y="367" textAnchor="middle" fontFamily="Orbitron" fontWeight="700" fontSize="9" fill="rgba(255,80,100,0.98)">{bpm} bpm</text>

        {/* Cabeza */}
        <rect x="168" y="275" width="22" height="20" fill="#c07858" rx="4"/>
        <ellipse cx="179" cy="258" rx="38" ry="34" fill="url(#sv-face)" filter="url(#sv-shade)"/>
        <path d="M145,248 Q148,218 179,218 Q210,218 213,248 Q205,230 179,228 Q153,230 145,248 Z" fill="#2a1a0a"/>
        <path d="M163,256 Q168,252 174,256" fill="none" stroke="#7a4a30" strokeWidth={1.5} strokeLinecap="round"/>
        <path d="M184,256 Q190,252 196,256" fill="none" stroke="#7a4a30" strokeWidth={1.5} strokeLinecap="round"/>
        <path d="M170,272 Q179,277 188,272" fill="none" stroke="#9a6040" strokeWidth={1.5} strokeLinecap="round"/>
        <ellipse cx="142" cy="262" rx="7" ry="10" fill="#b87050"/>

        {/* Corazón animado */}
        <g className="sv-heart">
          <path d="M170,330 C156,320 140,332 150,346 L170,362 L190,346 C200,332 184,320 170,330 Z"
            fill="#ff2d5b" opacity="0.88" filter="url(#sv-gred)"/>
          <path d="M170,332 C159,324 145,334 154,345 L170,358 L186,345 C195,334 181,324 170,332 Z"
            fill="rgba(255,80,120,0.45)"/>
        </g>
        <text x="170" y="375" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="7" fill="rgba(255,80,100,0.55)" letterSpacing="1">CARDIO</text>

        {/* ══ DOCTOR — de pie al costado derecho, junto al suero ══ */}
        {/* cx≈645, de pie desde y≈160 hasta y≈510 */}

        {/* Sombra suelo */}
        <ellipse cx="645" cy="508" rx="24" ry="5" fill="rgba(0,0,0,0.3)"/>

        {/* Zapatos */}
        <ellipse cx="635" cy="503" rx="10" ry="4" fill="#1a2a3a"/>
        <ellipse cx="656" cy="503" rx="10" ry="4" fill="#1a2a3a"/>

        {/* Piernas / pantalón */}
        <rect x="628" y="435" width="13" height="70" rx="5" fill="#d8e4f4"/>
        <rect x="645" y="435" width="13" height="70" rx="5" fill="#ccd8ee"/>

        {/* Cuerpo — bata blanca larga */}
        <rect x="621" y="310" width="50" height="130" rx="10" fill="#f0f5ff"/>
        <rect x="621" y="310" width="8"  height="130" rx="6" fill="#dce8f8"/>
        <rect x="663" y="310" width="8"  height="130" rx="6" fill="#dce8f8"/>
        {/* Solapas */}
        <path d="M621,310 Q630,318 632,338 L632,365 Q626,358 621,348 Z" fill="#ccdaee"/>
        <path d="M671,310 Q662,318 660,338 L660,365 Q666,358 671,348 Z" fill="#ccdaee"/>
        {/* Línea central */}
        <line x1="646" y1="315" x2="646" y2="440" stroke="rgba(180,200,230,0.4)" strokeWidth={1} strokeDasharray="3,3"/>
        {/* Bolsillo pecho */}
        <rect x="625" y="328" width="14" height="18" rx="3" fill="#c4d4ea" stroke="#a8bcd8" strokeWidth={0.8}/>
        {/* Lapiceros */}
        <rect x="627" y="325" width="2.5" height="12" rx="1" fill="#3a7ad4"/>
        <rect x="631" y="325" width="2.5" height="12" rx="1" fill="#e84040"/>
        <rect x="635" y="325" width="2.5" height="12" rx="1" fill="#2ab86a"/>
        {/* Cruz médica */}
        <rect x="654" y="326" width="11" height="11" rx="2" fill="rgba(220,40,40,0.1)" stroke="rgba(220,40,40,0.4)" strokeWidth={1}/>
        <line x1="659.5" y1="326" x2="659.5" y2="337" stroke="rgba(220,40,40,0.7)" strokeWidth={2}/>
        <line x1="654"   y1="331.5" x2="665" y2="331.5" stroke="rgba(220,40,40,0.7)" strokeWidth={2}/>

        {/* Estetoscopio */}
        <path d="M632,332 Q622,346 620,363 Q618,378 627,383 Q636,388 639,378 Q641,370 635,366 Q629,362 631,350 Q633,340 641,336"
          fill="none" stroke="#2a3a5a" strokeWidth={3} strokeLinecap="round"/>
        <circle cx="627" cy="384" r="6" fill="#1a2a4a" stroke="#3a5a8a" strokeWidth={1.2}/>
        <circle cx="627" cy="384" r="3.5" fill="#4a7ab0"/>

        {/* Brazo izquierdo — extendido hacia el poste IV (señalando/ajustando) */}
        <path d="M621,328 Q608,318 600,310 Q594,303 592,295"
          fill="none" stroke="#d4906a" strokeWidth={11} strokeLinecap="round"/>
        <path d="M621,328 Q608,316 600,308 Q594,301 592,294"
          fill="none" stroke="#e8f0f8" strokeWidth={9} strokeLinecap="round"/>
        {/* Mano izq tocando el tubo IV */}
        <ellipse cx="591" cy="291" rx="7" ry="6" fill="#d4906a"/>
        <ellipse cx="585" cy="288" rx="3.5" ry="2.5" fill="#c07858" transform="rotate(-20,585,288)"/>
        <ellipse cx="584" cy="293" rx="3.5" ry="2.5" fill="#c07858"/>

        {/* Brazo derecho — sostiene tablet */}
        <path d="M671,328 Q682,340 688,358 Q692,372 691,388"
          fill="none" stroke="#d4906a" strokeWidth={11} strokeLinecap="round"/>
        <path d="M671,328 Q682,338 688,355 Q692,368 691,384"
          fill="none" stroke="#e8f0f8" strokeWidth={9} strokeLinecap="round"/>
        {/* Mano der */}
        <ellipse cx="691" cy="392" rx="7" ry="8" fill="#d4906a"/>
        {/* Tablet */}
        <rect x="678" y="386" width="26" height="34" rx="3" fill="#0d1e30" stroke="rgba(0,180,255,0.55)" strokeWidth={1.2}/>
        <rect x="680" y="388" width="22" height="27" rx="2" fill="#050e1a"/>
        <line x1="682" y1="392" x2="700" y2="392" stroke="rgba(0,200,255,0.65)" strokeWidth={1}/>
        <line x1="682" y1="396" x2="698" y2="396" stroke="rgba(0,200,255,0.4)"  strokeWidth={1}/>
        <line x1="682" y1="400" x2="700" y2="400" stroke="rgba(0,200,255,0.65)" strokeWidth={1}/>
        <line x1="682" y1="404" x2="696" y2="404" stroke="rgba(255,80,100,0.5)" strokeWidth={1}/>
        <line x1="682" y1="408" x2="700" y2="408" stroke="rgba(0,200,255,0.4)"  strokeWidth={1}/>
        <rect x="680" y="388" width="8"  height="4"  rx="1" fill="rgba(0,200,255,0.12)"/>

        {/* Cuello */}
        <rect x="640" y="288" width="12" height="26" rx="5" fill="#d4906a"/>

        {/* Cabeza */}
        <ellipse cx="646" cy="266" rx="27" ry="30" fill="#d4906a" filter="url(#sv-shade)"/>
        {/* Pelo oscuro */}
        <path d="M620,258 Q621,226 646,222 Q671,226 672,258 Q663,240 646,238 Q629,240 620,258 Z" fill="#1a0e08"/>
        <path d="M620,261 Q618,244 622,233 Q630,220 646,218" fill="none" stroke="#2a1a0c" strokeWidth={3.5} strokeLinecap="round"/>
        {/* Orejas */}
        <ellipse cx="620" cy="268" rx="6" ry="8" fill="#c07858"/>
        <ellipse cx="672" cy="268" rx="6" ry="8" fill="#c07858"/>
        {/* Ojos */}
        <ellipse cx="637" cy="264" rx="4.5" ry="4"   fill="white"/>
        <ellipse cx="655" cy="264" rx="4.5" ry="4"   fill="white"/>
        <ellipse cx="637" cy="264" rx="2.5" ry="3"   fill="#2a1808"/>
        <ellipse cx="655" cy="264" rx="2.5" ry="3"   fill="#2a1808"/>
        <circle  cx="638" cy="263" r="1"   fill="white" opacity="0.85"/>
        <circle  cx="656" cy="263" r="1"   fill="white" opacity="0.85"/>
        {/* Cejas */}
        <path d="M631,258 Q637,255 643,257" fill="none" stroke="#1a0e08" strokeWidth={2} strokeLinecap="round"/>
        <path d="M649,257 Q655,255 661,258" fill="none" stroke="#1a0e08" strokeWidth={2} strokeLinecap="round"/>
        {/* Nariz */}
        <path d="M644,268 Q642,274 646,276 Q650,274 648,268" fill="none" stroke="rgba(150,80,40,0.45)" strokeWidth={1.2} strokeLinecap="round"/>
        {/* Boca */}
        <path d="M638,282 Q646,286 654,282" fill="none" stroke="#9a5030" strokeWidth={1.5} strokeLinecap="round"/>
        {/* Gafas */}
        <rect x="629" y="259" width="15" height="11" rx="4" fill="none" stroke="rgba(50,70,120,0.85)" strokeWidth={1.8}/>
        <rect x="648" y="259" width="15" height="11" rx="4" fill="none" stroke="rgba(50,70,120,0.85)" strokeWidth={1.8}/>
        <line x1="644" y1="264" x2="648" y2="264" stroke="rgba(50,70,120,0.85)" strokeWidth={1.5}/>
        <line x1="629" y1="264" x2="624" y2="265" stroke="rgba(50,70,120,0.6)"  strokeWidth={1.2}/>
        <line x1="663" y1="264" x2="668" y2="265" stroke="rgba(50,70,120,0.6)"  strokeWidth={1.2}/>
        <ellipse cx="633" cy="262" rx="3" ry="2" fill="rgba(200,230,255,0.1)"/>
        <ellipse cx="652" cy="262" rx="3" ry="2" fill="rgba(200,230,255,0.1)"/>

        {/* Tag nombre sobre la cabeza */}
        <rect x="603" y="210" width="86" height="24" rx="5" fill="rgba(2,10,24,0.92)" stroke="rgba(0,180,255,0.28)" strokeWidth={1}/>
        <text x="646" y="220" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="6.5" fill="rgba(0,200,255,0.7)"  letterSpacing="0.5">DR. HERRERA QUISPE</text>
        <text x="646" y="230" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="6"   fill="rgba(0,229,255,0.45)" letterSpacing="0.3">MÉDICO UCI · TURNO MAÑANA</text>
        {/* Monitor ECG en mesita */}
        <rect x="48" y="368" width="84" height="64" fill="#0a1e30" rx="5" stroke="#0d2a40" strokeWidth={1}/>
        <rect x="50" y="370" width="80" height="58" fill="#060f1a" rx="4"/>
        <rect x="52" y="372" width="76" height="38" fill="#020f08" rx="3"/>
        <text x="90" y="382" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="6" fill="rgba(0,200,80,0.5)" letterSpacing="1">ECG</text>
        <polyline
          points="54,398 60,398 63,386 66,411 69,398 76,398 83,398 90,398 97,398 104,398 110,398 122,398"
          fill="none" stroke="rgba(0,220,80,0.85)" strokeWidth={1.3} strokeLinecap="round"/>
        <text x="90" y="416" textAnchor="middle" fontFamily="Share Tech Mono" fontSize="7" fill="rgba(0,200,80,0.65)">{bpm} BPM</text>
        <rect x="56"  y="432" width="6" height="28" fill="#0a1e30" rx="2"/>
        <rect x="84"  y="432" width="6" height="28" fill="#0a1e30" rx="2"/>
        <rect x="112" y="432" width="6" height="28" fill="#0a1e30" rx="2"/>

        {/* LED ESP32 status */}
        <circle className="sv-led" cx="456" cy="348" r="4" fill="#00ff9d" style={{ filter: "drop-shadow(0 0 6px #00ff9d)" }}/>
        <text x="465" y="352" fontFamily="Share Tech Mono" fontSize="6" fill="rgba(0,255,157,0.7)" letterSpacing="0.5">ESP32</text>
      </svg>
    </div>
  );
};

export default EscenaPaciente;