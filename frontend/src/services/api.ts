const BASE_URL = import.meta.env.VITE_API_URL || "https://proyecto-monitoreo-hospital-production.up.railway.app";
const WS_URL   = BASE_URL.replace("https://", "wss://").replace("http://", "ws://");

export const API = {
  base:      BASE_URL,
  ws:        `${WS_URL}/ws`,
  lecturas:  `${BASE_URL}/lecturas`,
  alertas:   `${BASE_URL}/alertas`,
  comandos:  `${BASE_URL}/comandos`,
};

export async function getLecturas(limit = 50) {
  const res = await fetch(`${API.lecturas}?limit=${limit}`);
  return res.json();
}

export async function getAlertas(limit = 50) {
  const res = await fetch(`${API.alertas}?limit=${limit}`);
  return res.json();
}

export async function enviarComando(cmd: "bomba_on" | "bomba_off" | "reset") {
  const res = await fetch(API.comandos, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ cmd }),
  });
  return res.json();
}

export async function enviarEmail(destinatario: string, payload: object, alertas: object[]) {
  const res = await fetch(`${API.base}/enviar-email`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ destinatario, payload, alertas }),
  });
  return res.json();
}