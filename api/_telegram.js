export const GROUP_CHAT_ID = "-1003823794117";
export const ADMIN_CHAT_ID = "236353850";
export const DEV_CHAT_ID = "7858844640";

export function splitIds(value) {
  return String(value || "")
    .split(/[,\s;]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

export function uniqueIds(ids, { allowGroups = true } = {}) {
  return [...new Set(ids.map(String))]
    .filter(id => /^-?\d+$/.test(id))
    .filter(id => allowGroups || !id.startsWith("-100"));
}

export function opsRecipients() {
  return uniqueIds([
    GROUP_CHAT_ID,
    ADMIN_CHAT_ID,
    DEV_CHAT_ID,
    ...splitIds(process.env.TELEGRAM_OPS_CHAT_IDS),
    process.env.TELEGRAM_EXTRA_1,
    process.env.TELEGRAM_EXTRA_2,
  ], { allowGroups: true });
}

export function directRecipients() {
  return uniqueIds([
    ...splitIds(process.env.TELEGRAM_BACKUP_CHAT_IDS),
    process.env.TELEGRAM_BACKUP_ADMIN_CHAT_ID,
    process.env.TELEGRAM_BACKUP_DEV_CHAT_ID,
    process.env.TELEGRAM_EXTRA_1,
    process.env.TELEGRAM_EXTRA_2,
    ADMIN_CHAT_ID,
    DEV_CHAT_ID,
  ], { allowGroups: false }).slice(0, 2);
}

export function escHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function sendTelegram(chatId, text, options = {}) {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) throw new Error("TELEGRAM_TOKEN nao configurado");

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode || "HTML",
      disable_web_page_preview: options.disable_web_page_preview ?? true,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram HTTP ${response.status}`);
  }
  return data;
}

export async function broadcastTelegram(text, ids = opsRecipients()) {
  const results = await Promise.allSettled(ids.map(chatId => sendTelegram(chatId, text)));
  return {
    recipients: ids.length,
    sent: results.filter(r => r.status === "fulfilled").length,
    errors: results
      .filter(r => r.status === "rejected")
      .map(r => r.reason?.message || String(r.reason)),
  };
}
