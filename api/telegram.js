// api/telegram.js — comandos interativos do bot Telegram StockTel
const SUPA_URL = process.env.VITE_SUPABASE_URL || "https://enwlwudxtxpebxqfzkku.supabase.co";
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_KEY;
const SITE_URL = process.env.PUBLIC_SITE_URL || "https://retelecom-stock.vercel.app";
const GITHUB_REPO = process.env.GITHUB_REPOSITORY || "jpsilvainfo-svg/retelecom-stock";

const AUTHORIZED_IDS = [
  "-1003823794117",
  "236353850",
  "7858844640",
  process.env.TELEGRAM_EXTRA_1,
  process.env.TELEGRAM_EXTRA_2,
].filter(Boolean).map(String);

const BLOCKED_IDS = ["-1003830383137"];

const COMMANDS = [
  ["/status", "Resumo geral do sistema"],
  ["/ponto", "Pontos registrados hoje"],
  ["/plantao", "Quem esta de plantao hoje"],
  ["/estoque", "Itens baixos e criticos"],
  ["/tecnicos", "Tecnicos cadastrados"],
  ["/frota", "Resumo da frota"],
  ["/backup", "Gera backup e envia aos responsaveis"],
  ["/assumir", "Assume um chamado de suporte"],
  ["/fechar", "Fecha um chamado de suporte"],
  ["/versao", "Versao publicada"],
  ["/ajuda", "Lista de comandos"],
];

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function todayISO() {
  const now = new Date();
  const br = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return br.toISOString().slice(0, 10);
}

function nowBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function timed(label, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    return { label, ok: true, ms: Date.now() - started, ...result };
  } catch (error) {
    return { label, ok: false, ms: Date.now() - started, error: error.message };
  }
}

function diaSemanaBR() {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const br = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  return dias[br.getDay()];
}

async function sbGet(key) {
  if (!SUPA_KEY) return null;
  try {
    const r = await fetch(`${SUPA_URL}/rest/v1/re_data?select=value&key=eq.${encodeURIComponent(key)}`, {
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
    });
    const data = await r.json();
    return data?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function testSupabase() {
  if (!SUPA_KEY) throw new Error("VITE_SUPABASE_KEY ausente no ambiente");
  const r = await fetch(`${SUPA_URL}/rest/v1/re_data?select=key,updated_at&limit=1`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return { status: r.status, rows: Array.isArray(data) ? data.length : 0, host: new URL(SUPA_URL).host };
}

async function testVercel() {
  const r = await fetch(SITE_URL, { method: "GET" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const text = await r.text();
  const title = text.match(/<title>(.*?)<\/title>/i)?.[1] || "sem titulo";
  return { status: r.status, title, host: new URL(SITE_URL).host };
}

async function testGitHub() {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/runs?per_page=1`, {
    headers: { "User-Agent": "StockTel-Bot", Accept: "application/vnd.github+json" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const run = data.workflow_runs?.[0];
  return {
    status: r.status,
    workflow: run?.name || "sem workflow",
    conclusion: run?.conclusion || run?.status || "desconhecido",
    branch: run?.head_branch || "main",
  };
}

function integrationLine(item) {
  const status = item.ok ? "OK" : "ERRO";
  const detail = item.ok
    ? [item.status && `HTTP ${item.status}`, item.ms && `${item.ms}ms`, item.workflow && `${item.workflow}: ${item.conclusion}`, item.title && `titulo: ${item.title}`].filter(Boolean).join(" | ")
    : `${item.ms}ms | ${item.error}`;
  return `<b>${esc(item.label)}:</b> ${status}${detail ? ` - ${esc(detail)}` : ""}`;
}

async function integrationTestText(target = "all") {
  const jobs = [];
  if (target === "all" || target === "supabase") jobs.push(timed("Supabase", testSupabase));
  if (target === "all" || target === "github") jobs.push(timed("GitHub", testGitHub));
  if (target === "all" || target === "vercel") jobs.push(timed("Vercel", testVercel));
  const results = await Promise.all(jobs);
  const ok = results.every(r => r.ok);
  return `<b>StockTel - Teste de integracoes</b>\n\n` +
    `<b>Status geral:</b> ${ok ? "OK" : "ATENCAO"}\n` +
    `<b>Horario:</b> ${esc(nowBR())}\n\n` +
    results.map(integrationLine).join("\n") +
    `\n\n${ok ? "Tudo respondeu corretamente." : "Existe falha em uma ou mais integracoes."}`;
}

async function loadData() {
  const keys = [
    "re_users", "re_stock", "re_os", "re_returns", "re_sol", "re_pontos",
    "re_ponto_solicits", "re_escalas", "re_folgas", "re_veiculos",
    "re_abast", "re_manut_os", "re_logs",
  ];
  const values = await Promise.all(keys.map(k => sbGet(k)));
  return Object.fromEntries(keys.map((k, i) => [k, values[i]]));
}

async function sendTelegram(chat_id, text) {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_TOKEN nao configurado" };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  return r.json();
}

async function triggerBackupText() {
  try {
    const headers = {};
    if (process.env.BACKUP_SECRET) headers["x-backup-key"] = process.env.BACKUP_SECRET;

    const r = await fetch("https://retelecom-stock.vercel.app/api/backup", {
      method: "POST",
      headers,
    });
    const data = await r.json();
    if (!r.ok || !data.ok) {
      return `<b>StockTel — Backup</b>\n\nFalha ao gerar backup: ${esc(data.error || data.errors?.join("; ") || r.status)}`;
    }
    return `<b>StockTel — Backup</b>\n\nBackup gerado e enviado para <b>${data.sent}</b> responsaveis.\nArquivo: <b>${esc(data.filename)}</b>\nTamanho: <b>${data.size}</b> bytes`;
  } catch (error) {
    return `<b>StockTel — Backup</b>\n\nFalha ao gerar backup: ${esc(error.message)}`;
  }
}

async function supportActionText(action, text, msg) {
  const id = String(text || "").trim().split(/\s+/)[1];
  if (!id) return `Informe o codigo do chamado. Exemplo: <code>/${action === "assign" ? "assumir" : "fechar"} SUP-000000-ABCD</code>`;

  const by = msg?.from?.username
    ? `@${msg.from.username}`
    : [msg?.from?.first_name, msg?.from?.last_name].filter(Boolean).join(" ") || "Telegram";

  try {
    const r = await fetch("https://retelecom-stock.vercel.app/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, id, by }),
    });
    const data = await r.json();
    if (!r.ok || !data.ok) return `<b>StockTel - Suporte</b>\n\nFalha: ${esc(data.error || r.status)}`;
    return `<b>StockTel - Suporte</b>\n\nChamado <b>${esc(data.ticket.id)}</b> ${action === "assign" ? "assumido" : "fechado"} por <b>${esc(by)}</b>.`;
  } catch (error) {
    return `<b>StockTel - Suporte</b>\n\nFalha: ${esc(error.message)}`;
  }
}

function helpText() {
  return `<b>StockTel Bot — comandos</b>\n\n${COMMANDS.map(([cmd, desc]) => `<b>${cmd}</b> — ${desc}`).join("\n")}\n\nUse os comandos no privado do bot ou no grupo autorizado.`;
}

function statusText(d) {
  const users = arr(d.re_users);
  const stock = arr(d.re_stock);
  const os = arr(d.re_os);
  const returns = arr(d.re_returns);
  const sol = arr(d.re_sol);
  const pontos = arr(d.re_pontos).filter(p => String(p.dt || "").startsWith(todayISO()));
  const criticos = stock.filter(s => Number(s.min) > 0 && Number(s.qty) <= Number(s.min) * 0.6);
  const baixos = stock.filter(s => Number(s.min) > 0 && Number(s.qty) > Number(s.min) * 0.6 && Number(s.qty) <= Number(s.min));
  const pendRet = returns.filter(r => r.status === "pending");
  const pendSol = sol.filter(s => ["pending", "pendente"].includes(s.status));

  return `<b>StockTel — Status ${nowBR()}</b>\n\n` +
    `Sistema: <b>online</b>\n` +
    `Usuarios: <b>${users.length}</b>\n` +
    `Tecnicos: <b>${users.filter(u => u.role === "tecnico").length}</b>\n` +
    `Estoque: <b>${stock.length}</b> itens | <b>${stock.reduce((a, s) => a + (Number(s.qty) || 0), 0)}</b> un.\n` +
    `Criticos: <b>${criticos.length}</b> | Baixos: <b>${baixos.length}</b>\n` +
    `OS: <b>${os.length}</b>\n` +
    `Pontos hoje: <b>${pontos.length}</b>\n` +
    `Devolucoes pendentes: <b>${pendRet.length}</b>\n` +
    `Solicitacoes pendentes: <b>${pendSol.length}</b>`;
}

function pontoText(d) {
  const users = arr(d.re_users);
  const pontos = arr(d.re_pontos).filter(p => String(p.dt || "").startsWith(todayISO()));
  const solicits = arr(d.re_ponto_solicits).filter(s => ["pendente", "pending"].includes(s.status));
  const byUser = new Map();
  pontos.forEach(p => {
    const current = byUser.get(p.funcionarioId) || [];
    current.push(p);
    byUser.set(p.funcionarioId, current);
  });
  const linhas = [...byUser.entries()].map(([uid, regs]) => {
    regs.sort((a, b) => String(a.dt).localeCompare(String(b.dt)));
    const u = users.find(x => x.id === uid);
    const last = regs[regs.length - 1];
    const hora = last?.dt ? new Date(last.dt).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }) : "--:--";
    return `• ${esc(u?.name || last?.funcionarioNome || uid)}: ${regs.length} registro(s), ultimo ${esc(last?.tipo || "?")} ${hora}`;
  });

  return `<b>StockTel — Ponto de hoje</b>\n${nowBR()}\n\n` +
    (linhas.length ? linhas.join("\n") : "Nenhum ponto registrado hoje.") +
    `\n\nSolicitacoes pendentes: <b>${solicits.length}</b>`;
}

function plantaoText(d) {
  const users = arr(d.re_users).filter(u => ["tecnico", "mecanico", "estoque", "admin", "superadmin", "financeiro"].includes(u.role));
  const escalas = arr(d.re_escalas);
  const folgas = arr(d.re_folgas);
  const hoje = todayISO();
  const dia = diaSemanaBR();
  const folgaHoje = (uid) => folgas.find(f => (f.todos || f.userId === uid) && f.data === hoje);
  const escalaHoje = (uid) => {
    const e = escalas.find(x => x.userId === uid);
    if (!e) return null;
    const dias = arr(e.diasSemana).map(String);
    return dias.includes(dia) || dias.includes("Sáb") && dia === "Sab" ? e : null;
  };
  const emPlantao = users.map(u => ({ u, e: escalaHoje(u.id), f: folgaHoje(u.id) })).filter(x => x.e && !x.f);
  const ausentes = users.map(u => ({ u, f: folgaHoje(u.id) })).filter(x => x.f);

  const linhas = emPlantao.map(({ u, e }) => `• ${esc(u.name)} (${esc(u.role)}): ${esc(e.entrada || "08:00")}–${esc(e.saida || "18:00")}`);
  const folgasTxt = ausentes.map(({ u, f }) => `• ${esc(u.name)}: ${esc(f.tipoFolga || "folga")}`);

  return `<b>StockTel — Plantao de hoje</b>\n${hoje} (${dia})\n\n` +
    `<b>Em escala:</b>\n${linhas.length ? linhas.join("\n") : "Nenhuma escala cadastrada para hoje."}` +
    `\n\n<b>Folgas/ausencias:</b>\n${folgasTxt.length ? folgasTxt.join("\n") : "Nenhuma folga registrada hoje."}`;
}

function estoqueText(d) {
  const stock = arr(d.re_stock);
  const criticos = stock.filter(s => Number(s.min) > 0 && Number(s.qty) <= Number(s.min) * 0.6);
  const baixos = stock.filter(s => Number(s.min) > 0 && Number(s.qty) > Number(s.min) * 0.6 && Number(s.qty) <= Number(s.min));
  const top = [...criticos, ...baixos].slice(0, 8).map(s => `• ${esc(s.name)}: ${s.qty}/${s.min}`);
  return `<b>StockTel — Estoque</b>\n\nItens: <b>${stock.length}</b>\nCriticos: <b>${criticos.length}</b>\nBaixos: <b>${baixos.length}</b>\n\n${top.length ? top.join("\n") : "Sem itens baixos ou criticos."}`;
}

function tecnicosText(d) {
  const users = arr(d.re_users).filter(u => u.role === "tecnico");
  const os = arr(d.re_os);
  const linhas = users.map(u => `• ${esc(u.name)} (@${esc(u.login)}): ${os.filter(o => o.uid === u.id).length} OS`);
  return `<b>StockTel — Tecnicos</b>\n\n${linhas.length ? linhas.join("\n") : "Nenhum tecnico cadastrado."}`;
}

function frotaText(d) {
  const veiculos = arr(d.re_veiculos);
  const abast = arr(d.re_abast);
  const manut = arr(d.re_manut_os);
  const ativos = veiculos.filter(v => v.status === "ativo").length;
  const emManut = veiculos.filter(v => String(v.status || "").includes("manuten")).length;
  return `<b>StockTel — Frota</b>\n\nVeiculos: <b>${veiculos.length}</b>\nAtivos: <b>${ativos}</b>\nEm manutencao: <b>${emManut}</b>\nAbastecimentos: <b>${abast.length}</b>\nOS mecanicas: <b>${manut.length}</b>`;
}

async function handleCommand(text, msg = null) {
  const normalized = String(text || "").trim().toLowerCase();
  const cmd = normalized.split(/\s+/)[0].split("@")[0];
  if (!cmd || cmd === "/start" || cmd === "/ajuda" || cmd === "/comandos") return helpText();
  if (cmd === "/versao") return `<b>StockTel</b>\nVersao: <b>v1.3.1</b>\nAtualizado em: 06/06/2026`;
  if (cmd === "/backup") return triggerBackupText();
  if (cmd === "/assumir") return supportActionText("assign", text, msg);
  if (cmd === "/fechar") return supportActionText("close", text, msg);

  const d = await loadData();
  if (cmd === "/status") return statusText(d);
  if (cmd === "/ponto") return pontoText(d);
  if (cmd === "/plantao" || cmd === "/plantão") return plantaoText(d);
  if (cmd === "/estoque") return estoqueText(d);
  if (cmd === "/tecnicos" || cmd === "/técnicos") return tecnicosText(d);
  if (cmd === "/frota") return frotaText(d);
  return `Comando nao reconhecido: <b>${esc(cmd)}</b>\n\n${helpText()}`;
}

export default async function handler(req, res) {
  if (req.method === "GET") return res.json({ ok: true, commands: COMMANDS.map(([command, description]) => ({ command, description })) });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Metodo nao permitido" });

  const msg = req.body?.message || req.body?.edited_message;
  const chatId = String(msg?.chat?.id || "");
  const text = msg?.text || "";
  if (!chatId || !text) return res.json({ ok: true, ignored: true });
  if (BLOCKED_IDS.includes(chatId)) return res.status(403).json({ ok: false, error: "Chat bloqueado" });
  if (!AUTHORIZED_IDS.includes(chatId)) {
    await sendTelegram(chatId, "Este chat nao esta autorizado a usar o bot StockTel.");
    return res.status(403).json({ ok: false, error: "Chat nao autorizado" });
  }

  const answer = await handleCommand(text, msg);
  const sent = await sendTelegram(chatId, answer);
  return res.json({ ok: !!sent.ok, command: text.split(/\s+/)[0], telegram: sent });
}
