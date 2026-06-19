import { broadcastTelegram, escHtml, opsRecipients } from "./_telegram.js";

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_KEY;
const ALERT_KEY = "re_security_alerts";

function nowBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function getIp(req) {
  const header = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
  return String(header).split(",")[0].trim() || "unknown";
}

async function sbGet(key, fallback = []) {
  if (!SUPA_URL || !SUPA_KEY) return fallback;
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data?select=value&key=eq.${encodeURIComponent(key)}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  if (!response.ok) return fallback;
  const data = await response.json();
  return data?.[0]?.value ?? fallback;
}

async function sbSet(key, value) {
  if (!SUPA_URL || !SUPA_KEY) return;
  await fetch(`${SUPA_URL}/rest/v1/re_data?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
}

export default async function handler(req, res) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "security_probe",
    kind: req.query?.kind || "unknown",
    path: req.url || "",
    ip: getIp(req),
    ua: String(req.headers["user-agent"] || ""),
    at: new Date().toISOString(),
    atBR: nowBR(),
  };

  const alerts = await sbGet(ALERT_KEY, []);
  await sbSet(ALERT_KEY, [entry, ...(Array.isArray(alerts) ? alerts : [])].slice(0, 300));

  const text =
    `<b>StockTel - Tentativa suspeita</b>\n\n` +
    `<b>Tipo:</b> ${escHtml(entry.kind)}\n` +
    `<b>IP:</b> ${escHtml(entry.ip)}\n` +
    `<b>Rota:</b> ${escHtml(entry.path)}\n` +
    `<b>Quando:</b> ${escHtml(entry.atBR)}\n\n` +
    `<b>User-Agent:</b> ${escHtml(entry.ua.slice(0, 180))}`;

  const notify = await broadcastTelegram(text, opsRecipients()).catch(error => ({ sent: 0, error: error.message }));
  return res.status(404).json({ ok: false, blocked: true, notify });
}
