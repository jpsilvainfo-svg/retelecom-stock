import { broadcastTelegram, escHtml, opsRecipients } from "./_telegram.js";

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_KEY;
const ACCESS_KEY = "re_access_logs";
const DAILY_KEY = "re_access_daily";
const ALERT_KEY = "re_security_alerts";

const SUSPICIOUS_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /wp-admin/i,
  /wp-login/i,
  /phpmyadmin/i,
  /adminer/i,
  /\.php(\?|$)/i,
  /\/etc\/passwd/i,
  /\/cgi-bin/i,
  /select.+from/i,
  /union.+select/i,
  /<script/i,
  /\.\.\//,
];

function nowBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function todayKey() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function getIp(req) {
  const header = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "";
  return String(header).split(",")[0].trim() || "unknown";
}

function visitorKey(ip, ua) {
  return `${ip}|${String(ua || "").slice(0, 90)}`;
}

function isSuspicious(path, ua) {
  const target = `${path || ""} ${ua || ""}`;
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(target));
}

async function sbGet(key, fallback) {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("Supabase nao configurado");
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data?select=value&key=eq.${encodeURIComponent(key)}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  if (!response.ok) throw new Error(`Falha ao ler ${key}: ${response.status}`);
  const data = await response.json();
  return data?.[0]?.value ?? fallback;
}

async function sbSet(key, value) {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("Supabase nao configurado");
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`Falha ao salvar ${key}: ${response.status}`);
}

function summarizeDay(logs, date = todayKey()) {
  const dayLogs = logs.filter(item => item.day === date);
  const visitors = new Set(dayLogs.map(item => item.visitorKey));
  const ips = new Set(dayLogs.map(item => item.ip));
  const users = new Set(dayLogs.map(item => item.user?.login || item.user?.name).filter(Boolean));
  const suspicious = dayLogs.filter(item => item.suspicious).length;
  return {
    date,
    hits: dayLogs.length,
    visitors: visitors.size,
    ips: ips.size,
    users: users.size,
    suspicious,
    updatedAt: new Date().toISOString(),
  };
}

async function notifySecurity(entry) {
  const text =
    `<b>StockTel - Alerta de seguranca</b>\n\n` +
    `<b>Tipo:</b> acesso suspeito\n` +
    `<b>IP:</b> ${escHtml(entry.ip)}\n` +
    `<b>Rota:</b> ${escHtml(entry.path)}\n` +
    `<b>Usuario:</b> ${escHtml(entry.user?.name || "nao logado")}\n` +
    `<b>Quando:</b> ${escHtml(entry.atBR)}\n\n` +
    `<b>Navegador:</b> ${escHtml(entry.ua.slice(0, 180))}`;
  return broadcastTelegram(text, opsRecipients());
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const logs = await sbGet(ACCESS_KEY, []);
      const daily = await sbGet(DAILY_KEY, []);
      const alerts = await sbGet(ALERT_KEY, []);
      const day = todayKey();
      return res.json({
        ok: true,
        today: summarizeDay(Array.isArray(logs) ? logs : []),
        securityAlertsToday: Array.isArray(alerts) ? alerts.filter(item => String(item.at || "").startsWith(day)).length : 0,
        daily: Array.isArray(daily) ? daily.slice(0, 30) : [],
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  try {
    const body = req.body || {};
    const ip = getIp(req);
    const ua = String(req.headers["user-agent"] || body.userAgent || "");
    const path = String(body.path || req.headers.referer || "/");
    const suspicious = Boolean(body.securityEvent) || isSuspicious(path, ua);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      day: todayKey(),
      at: new Date().toISOString(),
      atBR: nowBR(),
      ip,
      ua,
      path,
      referrer: req.headers.referer || body.referrer || "",
      visitorKey: visitorKey(ip, ua),
      user: body.user || null,
      appVersion: body.appVersion || "",
      suspicious,
      securityEvent: body.securityEvent || "",
    };

    const currentLogs = await sbGet(ACCESS_KEY, []);
    const logs = Array.isArray(currentLogs) ? currentLogs : [];
    const nextLogs = [entry, ...logs].slice(0, 2000);
    await sbSet(ACCESS_KEY, nextLogs);

    const currentDaily = await sbGet(DAILY_KEY, []);
    const daily = Array.isArray(currentDaily) ? currentDaily : [];
    const today = summarizeDay(nextLogs);
    const nextDaily = [today, ...daily.filter(item => item.date !== today.date)].slice(0, 120);
    await sbSet(DAILY_KEY, nextDaily);

    let notify = null;
    if (suspicious) {
      const currentAlerts = await sbGet(ALERT_KEY, []);
      const alerts = Array.isArray(currentAlerts) ? currentAlerts : [];
      await sbSet(ALERT_KEY, [entry, ...alerts].slice(0, 300));
      notify = await notifySecurity(entry);
    }

    return res.json({ ok: true, today, suspicious, notify });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
