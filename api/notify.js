// api/notify.js — Notificações via Telegram Bot (IDs autorizados)
// IDs fixos autorizados + extras via env vars do Vercel
const AUTHORIZED_IDS = [
  "-5229565123",   // Grupo StockTel
  "236353850",     // João Paulo (admin)
  process.env.TELEGRAM_EXTRA_1,  // Celular 1: +55 21 99299-5955
  process.env.TELEGRAM_EXTRA_2,  // Celular 2: +55 21 97382-6927
].filter(Boolean).map(String);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { message, chat_id, token, parse_mode = "HTML" } = req.body;

  const BOT_TOKEN = process.env.TELEGRAM_TOKEN || token;
  const CHAT_ID   = String(process.env.TELEGRAM_CHAT_ID || chat_id || "");

  if (!BOT_TOKEN) return res.status(400).json({ ok: false, error: "TELEGRAM_TOKEN não configurado" });
  if (!CHAT_ID)   return res.status(400).json({ ok: false, error: "TELEGRAM_CHAT_ID não configurado" });
  if (!message)   return res.status(400).json({ ok: false, error: "Mensagem vazia" });

  // Bloqueia IDs não autorizados
  if (!AUTHORIZED_IDS.includes(CHAT_ID)) {
    console.warn(`[notify] Bloqueado: ${CHAT_ID}`);
    return res.status(403).json({ ok: false, error: "Chat ID não autorizado" });
  }

  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode })
    });
    const data = await r.json();
    return res.json({ ok: data.ok, error: data.description || null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
