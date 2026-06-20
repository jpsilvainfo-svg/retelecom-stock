import { broadcastTelegram, escHtml, opsRecipients } from "./_telegram.js";

const SITE_URL = process.env.PUBLIC_SITE_URL || "https://retelecom-stock.vercel.app";
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || "jpsilvainfo-svg/retelecom-stock";
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const ACCESS_KEY = "re_access_logs";
const ALERT_KEY = "re_security_alerts";
const MONITOR_HISTORY_KEY = "re_monitor_history";
const WARN_MS = Number(process.env.MONITOR_WARN_MS || 1500);
const HISTORY_LIMIT = Number(process.env.MONITOR_HISTORY_LIMIT || 200);

async function timed(label, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    return { label, ok: true, ms: Date.now() - started, ...result };
  } catch (error) {
    return { label, ok: false, ms: Date.now() - started, error: error.message };
  }
}

async function checkVercel() {
  const response = await fetch(SITE_URL, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { status: response.status };
}

async function checkSupabase() {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("env Supabase ausente");
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data?select=key&limit=1`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { status: response.status };
}

async function sbGet(key, fallback) {
  if (!SUPA_URL || !SUPA_KEY) return fallback;
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data?select=value&key=eq.${encodeURIComponent(key)}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  if (!response.ok) return fallback;
  const data = await response.json();
  return data?.[0]?.value ?? fallback;
}

async function sbSet(key, value) {
  if (!SUPA_URL || !SUPA_KEY) return { ok: false, error: "env Supabase ausente" };
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
  return { ok: true };
}

function todayKey() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

async function accessSummary() {
  const [logs, alerts] = await Promise.all([
    sbGet(ACCESS_KEY, []),
    sbGet(ALERT_KEY, []),
  ]);
  const day = todayKey();
  const dayLogs = Array.isArray(logs) ? logs.filter(item => item.day === day) : [];
  const dayAlerts = Array.isArray(alerts) ? alerts.filter(item => String(item.at || "").startsWith(day)) : [];
  return {
    hits: dayLogs.length,
    visitors: new Set(dayLogs.map(item => item.visitorKey)).size,
    ips: new Set(dayLogs.map(item => item.ip)).size,
    suspicious: dayLogs.filter(item => item.suspicious).length + dayAlerts.length,
  };
}

async function checkGitHub() {
  const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=1`, {
    headers: { "User-Agent": "StockTel-Monitor", Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const run = data.workflow_runs?.[0];
  return {
    status: response.status,
    workflow: run?.name || "sem workflow",
    conclusion: run?.conclusion || run?.status || "desconhecido",
  };
}

function statusLine(item) {
  const icon = item.ok ? "OK" : "ERRO";
  const slow = item.ok && item.ms > WARN_MS ? " | LENTO" : "";
  const extra = item.conclusion ? ` | ${item.conclusion}` : "";
  const error = item.error ? ` | ${item.error}` : "";
  return `${icon} ${item.label}: ${item.ms}ms${slow}${extra}${error}`;
}

async function saveHistory(checks, access, ok) {
  const current = await sbGet(MONITOR_HISTORY_KEY, []);
  const history = Array.isArray(current) ? current : [];
  const entry = {
    at: new Date().toISOString(),
    ok,
    warn: checks.some(item => item.ok && item.ms > WARN_MS),
    checks: checks.map(item => ({
      label: item.label,
      ok: item.ok,
      ms: item.ms,
      status: item.status || null,
      conclusion: item.conclusion || null,
      error: item.error || null,
    })),
    access,
  };
  return sbSet(MONITOR_HISTORY_KEY, [entry, ...history].slice(0, HISTORY_LIMIT));
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  const checks = await Promise.all([
    timed("Vercel", checkVercel),
    timed("Supabase", checkSupabase),
    timed("GitHub", checkGitHub),
  ]);
  const access = await accessSummary();
  const ok = checks.every(item => item.ok);
  const warn = checks.some(item => item.ok && item.ms > WARN_MS);
  const history = await saveHistory(checks, access, ok).catch(error => ({ ok: false, error: error.message }));
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const text =
    `<b>StockTel - Monitor 30 min</b>\n\n` +
    `<b>Status geral:</b> ${ok && !warn ? "OK" : "ATENCAO"}\n` +
    `<b>Horario:</b> ${escHtml(now)}\n\n` +
    checks.map(statusLine).map(escHtml).join("\n") +
    `\n\n<b>Acessos hoje:</b> ${access.hits} visitas | ${access.visitors} visitantes | ${access.ips} IPs` +
    `\n<b>Alertas suspeitos hoje:</b> ${access.suspicious}` +
    `\n<b>Historico:</b> ${history.ok ? "salvo" : `falhou (${escHtml(history.error || "?")})`}` +
    `\n\nSite: ${escHtml(SITE_URL)}`;

  const shouldNotify = req.method === "POST" || req.query?.notify === "1";
  const notify = shouldNotify ? await broadcastTelegram(text, opsRecipients()) : null;

  return res.status(ok ? 200 : 503).json({ ok, warn, warnMs: WARN_MS, checks, access, history, notify });
}
