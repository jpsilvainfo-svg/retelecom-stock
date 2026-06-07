// API para notificar progresso no Telegram.
// Uso: POST /api/notify-progress

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_IDS = [process.env.TELEGRAM_EXTRA_1, process.env.TELEGRAM_EXTRA_2].filter(Boolean);

const labels = {
  success: '[OK]',
  error: '[ERRO]',
  warning: '[AVISO]',
  info: '[INFO]',
  phase: '[FASE]',
  refactor: '[REFATORACAO]',
  test: '[TESTE]',
  deploy: '[DEPLOY]',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, message, type = 'info', phase = '' } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({ error: 'title e message obrigatorios' });
  }

  if (!TELEGRAM_TOKEN) {
    return res.status(500).json({ error: 'TELEGRAM_TOKEN nao configurado' });
  }

  if (CHAT_IDS.length === 0) {
    return res.status(500).json({ error: 'Nenhum chat Telegram configurado' });
  }

  const label = labels[type] || '[STATUS]';
  const telegramMessage = `${label} *${title}*\n\n${message}${phase ? `\n\nFase: ${phase}` : ''}`;

  const results = [];
  for (const chatId of CHAT_IDS) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: telegramMessage,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json();
      results.push({
        chatId,
        ok: Boolean(response.ok && result.ok),
        messageId: result.result?.message_id,
        description: result.description,
      });
    } catch (error) {
      results.push({
        chatId,
        ok: false,
        error: error.message,
      });
    }
  }

  const allOk = results.every((r) => r.ok);

  return res.status(allOk ? 200 : 206).json({
    ok: allOk,
    message: 'Notificacoes processadas',
    results,
  });
}
