// api/telegram-setup.js — ativa webhook e menu de comandos do bot StockTel
const WEBHOOK_URL = "https://retelecom-stock.vercel.app/api/telegram";

const COMMANDS = [
  { command: "status", description: "Resumo geral do sistema" },
  { command: "ponto", description: "Pontos registrados hoje" },
  { command: "plantao", description: "Quem esta de plantao hoje" },
  { command: "estoque", description: "Itens baixos e criticos" },
  { command: "tecnicos", description: "Tecnicos cadastrados" },
  { command: "frota", description: "Resumo da frota" },
  { command: "backup", description: "Gera backup e envia aos responsaveis" },
  { command: "assumir", description: "Assume um chamado de suporte" },
  { command: "fechar", description: "Fecha um chamado de suporte" },
  { command: "versao", description: "Versao publicada" },
  { command: "ajuda", description: "Lista de comandos" },
];

async function telegram(method, body) {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_TOKEN nao configurado" };

  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return r.json();
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  try {
    const webhook = await telegram("setWebhook", {
      url: WEBHOOK_URL,
      allowed_updates: ["message", "edited_message"],
      drop_pending_updates: false,
    });
    const commands = await telegram("setMyCommands", { commands: COMMANDS });
    const info = await telegram("getWebhookInfo", {});

    return res.json({
      ok: !!webhook.ok && !!commands.ok,
      webhook,
      commands,
      info,
      webhook_url: WEBHOOK_URL,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
