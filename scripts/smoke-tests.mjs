import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACTION_LABELS, ALL_MODULES, DEFAULT_ACTION_PERMS, DEFAULT_PERMS } from "../src/utils/constants.js";
import { hashSenha, sessaoValida, verificarSenha } from "../src/modules/auth/session.js";

const root = process.cwd();
const mustExist = [
  "src/App.jsx",
  "src/modules/auth/session.js",
  "src/modules/estoque/EstoquePage.jsx",
  "src/modules/estoque/KitPage.jsx",
  "src/modules/estoque/DistPage.jsx",
  "src/modules/estoque/NFPage.jsx",
  "src/modules/grandes/PontoPage.jsx",
  "src/modules/grandes/FrotaPage.jsx",
  "src/modules/grandes/RelatoriosPage.jsx",
  "src/utils/audit.js",
  "src/hooks/useLS.js",
  "api/notify-progress.js",
  "scripts/notify-telegram-change.ps1",
  ".githooks/post-commit",
  ".githooks/pre-push",
];

for (const file of mustExist) {
  assert.ok(existsSync(resolve(root, file)), `Arquivo obrigatorio ausente: ${file}`);
}

assert.ok(ALL_MODULES.some((m) => m.k === "ponto"), "Modulo ponto precisa existir");
assert.ok(DEFAULT_PERMS.financeiro.includes("ponto"), "Financeiro precisa acessar fechamento de ponto");
assert.ok(DEFAULT_ACTION_PERMS.admin.includes("aprovar_ponto"), "Admin precisa aprovar fechamento");
assert.ok(DEFAULT_ACTION_PERMS.financeiro.includes("exportar"), "Financeiro precisa exportar relatorios");
assert.ok(Object.keys(ACTION_LABELS).includes("reabrir_ponto"), "Acao reabrir ponto precisa existir");

const { hash, salt } = await hashSenha("senha-teste");
assert.ok(hash && salt, "Hash/salt precisam ser gerados");
assert.equal(await verificarSenha("senha-teste", { passHash: hash, passSalt: salt }), true, "Senha hash valida deve autenticar");
assert.equal(await verificarSenha("errada", { passHash: hash, passSalt: salt }), false, "Senha hash errada deve falhar");
assert.equal(await verificarSenha("legada", { pass: "legada" }), true, "Senha legada deve autenticar");
assert.equal(sessaoValida({ loginAt: Date.now() }), true, "Sessao recente deve ser valida");
assert.equal(sessaoValida({ loginAt: Date.now() - 9 * 60 * 60 * 1000 }), false, "Sessao expirada deve falhar");

const app = readFileSync(resolve(root, "src/App.jsx"), "utf8");
assert.match(app, /pontoFechamentos/, "Fechamento mensal de ponto deve estar conectado ao app");
assert.match(app, /exportarExcelPonto/, "Exportacao Excel do ponto deve existir");
assert.match(app, /Auditoria do Sistema/, "Tela de auditoria deve estar disponivel");
assert.match(app, /appendAudit/, "Auditoria estruturada deve estar conectada");
assert.match(app, /ACTION_LABELS/, "Permissoes por acao devem estar conectadas ao cadastro");
assert.match(app, /EstoqueModule/, "Estoque base deve usar modulo extraido");
assert.match(app, /KitModule/, "Kit tecnico deve usar modulo extraido");
assert.match(app, /DistModule/, "Saida/liberacao deve usar modulo extraido");
assert.match(app, /NFModule/, "Entrada NF deve usar modulo extraido");
assert.match(app, /PontoModule/, "Ponto eletronico deve usar modulo extraido");
assert.match(app, /FrotaModule/, "Frota deve usar modulo extraido");
assert.match(app, /RelatoriosModule/, "Relatorios deve usar modulo extraido");

console.log("StockTel smoke tests OK");
