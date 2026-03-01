const BASE_URL = import.meta.env.VITE_API_URL || "https://proyecto-monitoreo-hospital-production.up.railway.app";
const WS_URL   = BASE_URL.replace("https://", "wss://").replace("http://", "ws://");

export const API = {
  base:     BASE_URL,
  ws:       `${WS_URL}/ws`,
  suero:    `${BASE_URL}/suero`,
  vitales:  `${BASE_URL}/vitales`,
  alertas:  `${BASE_URL}/alertas`,
  comandos: `${BASE_URL}/comandos`,
};

// ── Suero ─────────────────────────────────────────────────────
export async function getSuero(limit = 60) {
  const res = await fetch(`${API.suero}?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getUltimoSuero() {
  const res = await fetch(`${API.suero}/ultimo`);
  if (!res.ok) return null;
  return res.json();
}

export async function getSueroRango(desde: string, hasta: string) {
  const res = await fetch(`${API.suero}/rango?desde=${desde}&hasta=${hasta}`);
  if (!res.ok) return [];
  return res.json();
}

// ── Vitales ───────────────────────────────────────────────────
export async function getVitales(limit = 60) {
  const res = await fetch(`${API.vitales}?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getUltimosVitales() {
  const res = await fetch(`${API.vitales}/ultimo`);
  if (!res.ok) return null;
  return res.json();
}

export async function getVitalesRango(desde: string, hasta: string) {
  const res = await fetch(`${API.vitales}/rango?desde=${desde}&hasta=${hasta}`);
  if (!res.ok) return [];
  return res.json();
}

// ── Alertas ───────────────────────────────────────────────────
export async function getAlertas(limit = 50) {
  const res = await fetch(`${API.alertas}?limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function limpiarAlertas() {
  const res = await fetch(`${API.alertas}`, { method: "DELETE" });
  if (!res.ok) return null;
  return res.json();
}

// ── Comandos ──────────────────────────────────────────────────
export async function enviarComando(cmd: "bomba_on" | "bomba_off" | "reset") {
  const res = await fetch(API.comandos, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ cmd }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Email ─────────────────────────────────────────────────────
export async function enviarEmail(destinatario: string, payload: object, alertas: object[]) {
  const res = await fetch(`${API.base}/enviar-email`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ destinatario, payload, alertas }),
  });
  if (!res.ok) return null;
  return res.json();
}

// ── Stats ─────────────────────────────────────────────────────
export async function getStats() {
  const res = await fetch(`${API.base}/stats`);
  if (!res.ok) return null;
  return res.json();
}

export async function getConfig() {
  const res = await fetch(`${API.base}/config`);
  return res.json();
}

// ── Configuración de umbrales ───────────────────────────────────────────────
export async function guardarConfig(peso_alerta: number, peso_critico: number) {
  const res = await fetch(`${API.base}/config`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ peso_alerta, peso_critico }),
  });
  return res.json();
}

// ── Login ─────────────────────────────────────────────────────
export async function loginUsuario(usuario: string, password: string) {
  const res = await fetch(`${API.base}/login`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ usuario, password }),
  });
  if (!res.ok) throw new Error("Credenciales incorrectas");
  return res.json();
}

export async function getSueroPorMinuto(limit = 60) {
    const res = await fetch(`${API.base}/suero/por-minuto?limit=${limit}`);
    if (!res.ok) return [];
    return res.json();
}

export async function getVitalesPorMinuto(limit = 60) {
    const res = await fetch(`${API.base}/vitales/por-minuto?limit=${limit}`);
    if (!res.ok) return [];
    return res.json();
}