// api/notify.js — Notificações via Telegram Bot (gratuito)
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { message, chat_id, token, parse_mode = "HTML" } = req.body;

  // Usa env vars do Vercel OU token/chat_id enviados pelo sistema
  const BOT_TOKEN = process.env.TELEGRAM_TOKEN || token;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID || chat_id;

  if (!BOT_TOKEN) return res.status(400).json({ ok: false, error: "TELEGRAM_TOKEN não configurado" });
  if (!CHAT_ID)   return res.status(400).json({ ok: false, error: "TELEGRAM_CHAT_ID não configurado" });
  if (!message)   return res.status(400).json({ ok: false, error: "Mensagem vazia" });

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
