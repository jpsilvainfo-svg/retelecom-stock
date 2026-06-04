// api/status.js — Relatório automático de status a cada 10 minutos (Vercel Cron)
const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://enwlwudxtxpebxqfzkku.supabase.co";
const SUPA_KEY = process.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud2x3dWR4dHhwZWJ4cWZ6a2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDQ0MTcsImV4cCI6MjA5NDk4MDQxN30.TE1JbN-2JepCotaQMOxTe4CFIt-Ht_o9sUAlpxBzWZ8";

// IDs que recebem o status a cada 10 min — adicione aqui os IDs dos celulares
const STATUS_RECIPIENTS = [
  process.env.TELEGRAM_CHAT_ID || "-5229565123",   // Grupo StockTel
  "236353850",                                        // João Paulo (admin)
  // Adicionar aqui os IDs dos dois celulares quando disponíveis:
  // process.env.TELEGRAM_EXTRA_1,
  // process.env.TELEGRAM_EXTRA_2,
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

async function sbGet(key) {
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/re_data?select=value&key=eq.${key}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
    });
    const data = await r.json();
    return data?.[0]?.value || null;
  } catch { return null; }
}

async function sendTelegram(token, chat_id, text) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode: "HTML" })
    });
    return (await r.json()).ok;
  } catch { return false; }
}

export default async function handler(req, res) {
  // Aceita GET (cron) e POST (manual)
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const BOT_TOKEN = process.env.TELEGRAM_TOKEN;
  if (!BOT_TOKEN) return res.status(400).json({ ok: false, error: "TELEGRAM_TOKEN não configurado no Vercel" });

  try {
    // Busca dados do Supabase
    const [users, stock, os, returns, sol, pontos, logs] = await Promise.all([
      sbGet("re_users"), sbGet("re_stock"), sbGet("re_os"),
      sbGet("re_returns"), sbGet("re_sol"), sbGet("re_pontos"), sbGet("re_logs")
    ]);

    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const usersArr = Array.isArray(users) ? users : [];
    const stockArr = Array.isArray(stock) ? stock : [];
    const osArr = Array.isArray(os) ? os : [];
    const retArr = Array.isArray(returns) ? returns : [];
    const solArr = Array.isArray(sol) ? sol : [];
    const pontosArr = Array.isArray(pontos) ? pontos : [];
    const logsArr = Array.isArray(logs) ? logs : [];

    const criticos = stockArr.filter(s => s.qty <= s.min * 0.6 && s.min > 0);
    const baixos = stockArr.filter(s => s.qty > s.min * 0.6 && s.qty <= s.min);
    const pendRet = retArr.filter(r => r.status === "pending");
    const pendSol = solArr.filter(s => s.status === "pending");
    const tecnicos = usersArr.filter(u => u.role === "tecnico");
    const ultimoLog = logsArr[0];

    // Monta mensagem de status
    let msg = `📊 <b>StockTel — Status ${now}</b>\n\n`;
    msg += `🟢 <b>Sistema Online</b> | retelecom-stock.vercel.app\n\n`;
    msg += `👥 <b>Usuários:</b> ${usersArr.length} (${tecnicos.length} técnicos)\n`;
    msg += `📦 <b>Estoque:</b> ${stockArr.length} itens | ${stockArr.reduce((a, s) => a + (s.qty || 0), 0)} unidades\n`;
    msg += `🔧 <b>OS registradas:</b> ${osArr.length}\n`;
    msg += `📋 <b>Pontos hoje:</b> ${pontosArr.length}\n\n`;

    if (criticos.length > 0) {
      msg += `🔴 <b>CRÍTICO (${criticos.length} itens):</b>\n`;
      criticos.slice(0, 3).forEach(s => { msg += `  • ${s.name}: ${s.qty}/${s.min}\n`; });
      if (criticos.length > 3) msg += `  ... e mais ${criticos.length - 3}\n`;
    } else {
      msg += `✅ Estoque: sem itens críticos\n`;
    }

    if (baixos.length > 0) msg += `🟡 Estoque baixo: ${baixos.length} item(s)\n`;
    if (pendRet.length > 0) msg += `↩️ Devoluções pendentes: ${pendRet.length}\n`;
    if (pendSol.length > 0) msg += `📋 Solicitações pendentes: ${pendSol.length}\n`;

    if (ultimoLog) {
      msg += `\n📋 <b>Última ação:</b> ${ultimoLog.action} — ${ultimoLog.user} (${ultimoLog.date})`;
    }

    // Envia para todos os destinatários
    const results = await Promise.all(
      STATUS_RECIPIENTS.map(chat_id => sendTelegram(BOT_TOKEN, chat_id, msg))
    );

    const sent = results.filter(Boolean).length;
    return res.json({ ok: true, sent, recipients: STATUS_RECIPIENTS.length, timestamp: now });

  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
