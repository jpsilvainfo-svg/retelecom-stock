import { broadcastTelegram, escHtml, opsRecipients } from "./_telegram.js";

function isAuthorized(req) {
  const secret = process.env.RELEASE_NOTIFY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-release-key"] || req.body?.key;
  return String(provided || "") === String(secret);
}

function lines(value, limit = 12) {
  return String(value || "")
    .split(/\r?\n/)
    .map(v => v.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.json({ ok: true, service: "StockTel release notify" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Nao autorizado" });
  }

  try {
    const body = req.body || {};
    const changed = lines(body.changed_files, 10);
    const improvements = lines(body.improvements || body.commit_message, 8);
    const version = body.version || "nao informado";
    const previous = body.previous_version || "";
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

    const text =
      `<b>StockTel - Atualizacao publicada</b>\n\n` +
      `<b>Versao:</b> ${escHtml(previous ? `${previous} -> ${version}` : version)}\n` +
      `<b>Quando:</b> ${escHtml(now)}\n` +
      `<b>Commit:</b> ${escHtml(String(body.commit || "").slice(0, 7))}\n` +
      `<b>Autor:</b> ${escHtml(body.author || "GitHub")}\n\n` +
      `<b>Mudancas / melhorias:</b>\n` +
      `${improvements.length ? improvements.map(item => `- ${escHtml(item)}`).join("\n") : "- Atualizacao de codigo publicada na main."}\n\n` +
      `<b>Arquivos alterados:</b>\n` +
      `${changed.length ? changed.map(item => `- ${escHtml(item)}`).join("\n") : "- Nao informado"}\n\n` +
      `${body.run_url ? `GitHub Actions: ${escHtml(body.run_url)}` : ""}`;

    const notify = await broadcastTelegram(text, opsRecipients());
    return res.json({ ok: notify.sent > 0, notify });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
