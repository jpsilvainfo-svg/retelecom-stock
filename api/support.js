import { broadcastTelegram, escHtml, opsRecipients } from "./_telegram.js";

const SUPA_URL = process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_KEY;
const SUPPORT_KEY = "re_support_tickets";

function nowBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function uid() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(2, 12);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SUP-${stamp}-${rand}`;
}

async function sbGet(key) {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("Supabase nao configurado");
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data?select=value&key=eq.${encodeURIComponent(key)}`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  if (!response.ok) throw new Error(`Falha ao ler ${key}: ${response.status}`);
  const data = await response.json();
  return data?.[0]?.value ?? [];
}

async function sbSet(key, value) {
  if (!SUPA_URL || !SUPA_KEY) throw new Error("Supabase nao configurado");
  const response = await fetch(`${SUPA_URL}/rest/v1/re_data?on_conflict=key`, {
    method: "POST",
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao salvar ${key}: ${response.status} ${text.slice(0, 120)}`);
  }
}

function normalizeTickets(value) {
  return Array.isArray(value) ? value : [];
}

async function createTicket(body) {
  const tickets = normalizeTickets(await sbGet(SUPPORT_KEY));
  const user = body.user || {};
  const ticket = {
    id: uid(),
    status: "aberto",
    priority: body.priority || "normal",
    message: String(body.message || "").trim(),
    page: body.page || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdAtBR: nowBR(),
    requester: {
      id: user.id || "",
      name: user.name || "Usuario",
      login: user.login || "",
      role: user.role || "",
      email: user.email || "",
    },
    assignedTo: null,
    history: [
      { at: new Date().toISOString(), type: "created", by: user.name || "Usuario", message: String(body.message || "").trim() },
    ],
  };

  if (!ticket.message) throw new Error("Mensagem vazia");
  await sbSet(SUPPORT_KEY, [ticket, ...tickets].slice(0, 300));

  const text =
    `<b>StockTel - Novo chamado</b>\n\n` +
    `<b>Codigo:</b> ${escHtml(ticket.id)}\n` +
    `<b>Usuario:</b> ${escHtml(ticket.requester.name)} (${escHtml(ticket.requester.role || "sem perfil")})\n` +
    `<b>Pagina:</b> ${escHtml(ticket.page || "nao informado")}\n` +
    `<b>Quando:</b> ${escHtml(ticket.createdAtBR)}\n\n` +
    `<b>Mensagem:</b>\n${escHtml(ticket.message)}\n\n` +
    `Para assumir: <code>/assumir ${escHtml(ticket.id)}</code>\n` +
    `Para fechar: <code>/fechar ${escHtml(ticket.id)}</code>`;

  const notify = await broadcastTelegram(text, opsRecipients());
  return { ticket, notify };
}

async function updateTicket(action, body) {
  const tickets = normalizeTickets(await sbGet(SUPPORT_KEY));
  const id = String(body.id || "").trim().toUpperCase();
  if (!id) throw new Error("Codigo do chamado nao informado");

  let found = null;
  const updated = tickets.map(ticket => {
    if (String(ticket.id).toUpperCase() !== id) return ticket;
    const status = action === "close" ? "fechado" : "assumido";
    found = {
      ...ticket,
      status,
      updatedAt: new Date().toISOString(),
      assignedTo: action === "assign" ? (body.by || "Telegram") : ticket.assignedTo,
      closedBy: action === "close" ? (body.by || "Telegram") : ticket.closedBy,
      history: [
        ...(ticket.history || []),
        { at: new Date().toISOString(), type: action, by: body.by || "Telegram", message: body.note || "" },
      ],
    };
    return found;
  });

  if (!found) throw new Error(`Chamado ${id} nao encontrado`);
  await sbSet(SUPPORT_KEY, updated);

  const text =
    `<b>StockTel - Chamado atualizado</b>\n\n` +
    `<b>Codigo:</b> ${escHtml(found.id)}\n` +
    `<b>Status:</b> ${escHtml(found.status)}\n` +
    `<b>Responsavel:</b> ${escHtml(found.assignedTo || found.closedBy || body.by || "Telegram")}\n` +
    `<b>Usuario:</b> ${escHtml(found.requester?.name || "Usuario")}\n\n` +
    `${escHtml(found.message || "")}`;

  const notify = await broadcastTelegram(text, opsRecipients());
  return { ticket: found, notify };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const tickets = normalizeTickets(await sbGet(SUPPORT_KEY));
      return res.json({ ok: true, tickets: tickets.slice(0, 50) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  try {
    const action = req.body?.action || "create";
    const result = action === "assign" || action === "close"
      ? await updateTicket(action, req.body)
      : await createTicket(req.body || {});

    return res.json({ ok: true, ...result });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
