// API para notificar progresso no Telegram
// Uso: POST /api/notify-progress

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_IDS = [
  process.env.TELEGRAM_EXTRA_1,
  process.env.TELEGRAM_EXTRA_2
].filter(Boolean);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, message, type = 'info', phase = '' } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'title e message obrigatórios' });
  }

  // Ícones por tipo
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    phase: '🔄',
    refactor: '♻️',
    test: '🧪',
    deploy: '🚀',
  };

  const icon = icons[type] || '📌';

  // Formatar mensagem
  const telegramMessage = `${icon} **${title}**\n\n${message}${phase ? `\n\n📍 **Phase:** ${phase}` : ''}`;

  // Enviar para todos os chats
  const results = [];
  for (const chatId of CHAT_IDS) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramMessage,
            parse_mode: 'Markdown',
          }),
        }
      );

      const result = await response.json();
      results.push({
        chatId,
        ok: result.ok,
        messageId: result.result?.message_id,
      });
    } catch (error) {
      results.push({
        chatId,
        ok: false,
        error: error.message,
      });
    }
  }

  // Verificar se todos foram enviados
  const allOk = results.every((r) => r.ok);

  return res.status(allOk ? 200 : 206).json({
    ok: allOk,
    message: 'Notificações enviadas',
    results,
  });
}
