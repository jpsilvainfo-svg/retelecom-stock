import { broadcastTelegram, escHtml, opsRecipients } from "./_telegram.js";

const SITE_URL = process.env.PUBLIC_SITE_URL || "https://retelecom-stock.vercel.app";

function isAuthorized(req) {
  const secret = process.env.DEPLOY_NOTIFY_SECRET || process.env.RELEASE_NOTIFY_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-deploy-key"] || req.body?.key;
  return String(provided || "") === String(secret);
}

async function checkVercel() {
  const started = Date.now();
  try {
    const response = await fetch(SITE_URL, { method: "GET" });
    return {
      ok: response.ok,
      status: response.status,
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: "erro",
      ms: Date.now() - started,
      error: error.message,
    };
  }
}

function statusLabel(value) {
  const v = String(value || "").toLowerCase();
  if (["success", "ok", "passed"].includes(v)) return "OK";
  if (["skipped"].includes(v)) return "IGNORADO";
  if (["failure", "failed", "cancelled", "error"].includes(v)) return "ERRO";
  if (["start", "started", "running"].includes(v)) return "INICIADO";
  return value || "desconhecido";
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.json({ ok: true, service: "StockTel deploy notify" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Nao autorizado" });
  }

  try {
    const body = req.body || {};
    const phase = body.phase || "result";
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const vercel = phase === "result" ? await checkVercel() : null;
    const deployOk = phase === "start"
      ? true
      : String(body.build_status).toLowerCase() === "success" &&
        String(body.supabase_status).toLowerCase() === "success" &&
        (vercel?.ok ?? true);

    const title = phase === "start"
      ? "StockTel - Deploy iniciado"
      : deployOk
        ? "StockTel - Deploy concluido"
        : "StockTel - Deploy com erro";

    let text =
      `<b>${title}</b>\n\n` +
      `<b>Status:</b> ${deployOk ? "OK" : "ATENCAO"}\n` +
      `<b>Horario:</b> ${escHtml(now)}\n` +
      `<b>Branch:</b> ${escHtml(body.branch || "main")}\n` +
      `<b>Commit:</b> ${escHtml(String(body.commit || "").slice(0, 7))}\n` +
      `<b>Autor:</b> ${escHtml(body.author || "GitHub")}\n`;

    if (phase !== "start") {
      text +=
        `\n<b>GitHub Build:</b> ${escHtml(statusLabel(body.build_status))}\n` +
        `<b>Supabase:</b> ${escHtml(statusLabel(body.supabase_status))}\n` +
        `<b>Vercel:</b> ${vercel?.ok ? "OK" : "ERRO"} - HTTP ${escHtml(vercel?.status)} em ${escHtml(vercel?.ms)}ms`;
      if (vercel?.error) text += `\n<b>Erro Vercel:</b> ${escHtml(vercel.error)}`;
    }

    if (body.run_url) {
      text += `\n\nGitHub Actions: ${escHtml(body.run_url)}`;
    }
    text += `\nSite: ${escHtml(SITE_URL)}`;

    const notify = await broadcastTelegram(text, opsRecipients());
    return res.status(deployOk ? 200 : 207).json({ ok: notify.sent > 0, deployOk, vercel, notify });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
