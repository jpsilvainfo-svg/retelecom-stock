import { broadcastTelegram, escHtml, opsRecipients } from "./_telegram.js";

const SITE_URL = process.env.PUBLIC_SITE_URL || "https://retelecom-stock.vercel.app";
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || "jpsilvainfo-svg/retelecom-stock";
const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.VITE_SUPABASE_KEY;

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
  const extra = item.conclusion ? ` | ${item.conclusion}` : "";
  const error = item.error ? ` | ${item.error}` : "";
  return `${icon} ${item.label}: ${item.ms}ms${extra}${error}`;
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
  const ok = checks.every(item => item.ok);
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const text =
    `<b>StockTel - Monitor 30 min</b>\n\n` +
    `<b>Status geral:</b> ${ok ? "OK" : "ATENCAO"}\n` +
    `<b>Horario:</b> ${escHtml(now)}\n\n` +
    checks.map(statusLine).map(escHtml).join("\n") +
    `\n\nSite: ${escHtml(SITE_URL)}`;

  const shouldNotify = req.method === "POST" || req.query?.notify === "1";
  const notify = shouldNotify ? await broadcastTelegram(text, opsRecipients()) : null;

  return res.status(ok ? 200 : 503).json({ ok, checks, notify });
}
