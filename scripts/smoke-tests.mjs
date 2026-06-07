import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ACTION_LABELS, ALL_MODULES, DEFAULT_ACTION_PERMS, DEFAULT_PERMS } from "../src/utils/constants.js";
import { hashSenha, sessaoValida, verificarSenha } from "../src/modules/auth/session.js";

const root = process.cwd();
const mustExist = [
  "src/App.jsx",
  "src/modules/auth/session.js",
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
assert.match(app, /ACTION_LABELS/, "Permissoes por acao devem estar conectadas ao cadastro");

console.log("StockTel smoke tests OK");
