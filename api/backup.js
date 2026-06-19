const DATA_KEYS = [
  "re_users",
  "re_stock",
  "re_tstock",
  "re_os",
  "re_returns",
  "re_nf",
  "re_sol",
  "re_logs",
  "re_veiculos",
  "re_abast",
  "re_checkouts",
  "re_pontos",
  "re_ponto_config",
  "re_ponto_solicits",
  "re_escalas",
  "re_folgas",
  "re_pneus",
  "re_docs_veic",
  "re_manut_os",
  "re_manut_sols",
  "re_cats",
  "re_produtos",
  "re_customization",
  "re_support_tickets",
  "re_access_logs",
  "re_access_daily",
  "re_security_alerts",
  "re_monitor_history",
];

const DEFAULT_BACKUP_RECIPIENTS = ["236353850", "7858844640"];

function nowBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fileDate() {
  const br = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const pad = n => String(n).padStart(2, "0");
  return `${br.getFullYear()}-${pad(br.getMonth() + 1)}-${pad(br.getDate())}_${pad(br.getHours())}-${pad(br.getMinutes())}`;
}

function splitIds(value) {
  return String(value || "")
    .split(/[,\s;]+/)
    .map(v => v.trim())
    .filter(Boolean);
}

function backupRecipients() {
  const configured = [
    ...splitIds(process.env.TELEGRAM_BACKUP_CHAT_IDS),
    process.env.TELEGRAM_BACKUP_ADMIN_CHAT_ID,
    process.env.TELEGRAM_BACKUP_DEV_CHAT_ID,
    process.env.TELEGRAM_EXTRA_1,
    process.env.TELEGRAM_EXTRA_2,
  ].filter(Boolean);

  return [...new Set([...configured, ...DEFAULT_BACKUP_RECIPIENTS].map(String))]
    .filter(id => /^-?\d+$/.test(id))
    .filter(id => !id.startsWith("-100"))
    .slice(0, 2);
}

function isAuthorized(req) {
  const secret = process.env.BACKUP_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-backup-key"] || req.query?.key || req.body?.key;
  return String(provided || "") === String(secret);
}

async function sbGet(key) {
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_KEY;
  if (!supaUrl || !supaKey) throw new Error("Supabase nao configurado no ambiente");

  const response = await fetch(`${supaUrl}/rest/v1/re_data?select=value&key=eq.${encodeURIComponent(key)}`, {
    headers: {
      apikey: supaKey,
      Authorization: `Bearer ${supaKey}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao ler ${key}: ${response.status} ${text.slice(0, 120)}`);
  }

  const data = await response.json();
  return data?.[0]?.value ?? null;
}

async function buildBackup() {
  const values = await Promise.all(DATA_KEYS.map(key => sbGet(key)));
  const data = Object.fromEntries(DATA_KEYS.map((key, index) => [key, values[index]]));
  return {
    app: "StockTel",
    backup_date: nowBR(),
    generated_at: new Date().toISOString(),
    keys: DATA_KEYS,
    data,
  };
}

async function sendDocument(chatId, filename, jsonText, caption) {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) throw new Error("TELEGRAM_TOKEN nao configurado");

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("document", new Blob([jsonText], { type: "application/json" }), filename);

  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form,
  });
  const result = await response.json();
  if (!response.ok || !result.ok) {
    throw new Error(`Telegram falhou para ${chatId}: ${result.description || response.status}`);
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.json({
      ok: true,
      service: "StockTel backup",
      recipients: backupRecipients().length,
      usage: "POST /api/backup para gerar e enviar backup aos chats autorizados.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Backup nao autorizado" });
  }

  try {
    const recipients = backupRecipients();
    if (recipients.length !== 2) {
      return res.status(400).json({ ok: false, error: "Configure exatamente dois destinatarios de backup" });
    }

    const backup = await buildBackup();
    const jsonText = JSON.stringify(backup, null, 2);
    const filename = `stocktel_backup_${fileDate()}.json`;
    const size = Buffer.byteLength(jsonText, "utf8");
    const caption = `Backup StockTel - ${backup.backup_date} | ${size} bytes | ${DATA_KEYS.length} chaves`;

    const results = await Promise.allSettled(
      recipients.map(chatId => sendDocument(chatId, filename, jsonText, caption))
    );

    const sent = results.filter(r => r.status === "fulfilled").length;
    const errors = results
      .filter(r => r.status === "rejected")
      .map(r => r.reason?.message || String(r.reason));

    return res.status(sent === recipients.length ? 200 : 502).json({
      ok: sent === recipients.length,
      sent,
      recipients: recipients.length,
      filename,
      size,
      keys: DATA_KEYS.length,
      errors,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
