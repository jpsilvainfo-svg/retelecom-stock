import { APP_VERSION } from "./constants.js";
import { now, uid } from "./formatters.js";

const TYPE_RULES = [
  { type: "auth", words: ["login", "logout", "sessao", "senha"] },
  { type: "nav", words: ["navegacao", "acesso"] },
  { type: "entrada", words: ["entrada", "nf", "novo material"] },
  { type: "saida", words: ["saida", "saída", "liberacao", "liberação", "os"] },
  { type: "aprovada", words: ["aprovada", "aprovado", "aprovar", "confirmada", "confirmado"] },
  { type: "dev", words: ["devolucao", "devolução", "solicitacao", "solicitação", "rejeitada", "rejeitado"] },
  { type: "admin", words: ["usuario", "usuário", "permissao", "permissão", "perfil", "customizacao", "customização"] },
  { type: "relatorio", words: ["relatorio", "relatório", "exportacao", "exportação", "csv", "pdf"] },
  { type: "frota", words: ["frota", "veiculo", "veículo", "abastecimento", "manutencao", "manutenção"] },
  { type: "ponto", words: ["ponto", "fechamento"] },
];

export function auditType(action = "") {
  const normalized = String(action).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return TYPE_RULES.find(rule => rule.words.some(word => normalized.includes(word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())))?.type || "outro";
}

export function actorFromUser(user, fallbackName = "Sistema") {
  return {
    userId: user?.id || "",
    user: user?.name || fallbackName,
    login: user?.login || "",
    role: user?.role || "",
    email: user?.email || "",
  };
}

export function createAuditEvent({ user, action, detail = "", module = "", origin = "StockTel Web", status = "ok", meta = {} }) {
  const actor = actorFromUser(user, user?.name || "Sistema");
  return {
    id: uid(),
    date: now(),
    isoAt: new Date().toISOString(),
    ...actor,
    action,
    detail,
    tipo: auditType(`${action} ${module}`),
    module,
    origin,
    status,
    appVersion: APP_VERSION,
    meta,
  };
}

export function safeAuditDetail(value) {
  return String(value ?? "")
    .replace(/senha\s*[:=]\s*\S+/gi, "senha: [oculta]")
    .replace(/pass(word)?\s*[:=]\s*\S+/gi, "senha: [oculta]")
    .slice(0, 500);
}
