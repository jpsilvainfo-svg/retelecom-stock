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
  "src/hooks/useLS.js",
  ".env.example",
  "PRODUCTION_RUNBOOK.md",
  "public/offline.html",
  ".github/workflows/preview-check.yml",
  "api/monitor.js",
  "api/backup.js",
  "scripts/sync-vercel-env.mjs",
  "scripts/seed-waldenir.mjs",
  "supabase/migrations/20260608012000_file_registry.sql",
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
const monitor = readFileSync(resolve(root, "api/monitor.js"), "utf8");
const backup = readFileSync(resolve(root, "api/backup.js"), "utf8");
const vercelEnvSync = readFileSync(resolve(root, "scripts/sync-vercel-env.mjs"), "utf8");
const waldenirSeed = readFileSync(resolve(root, "scripts/seed-waldenir.mjs"), "utf8");
const diagnostico = readFileSync(resolve(root, "src/modules/diag/Diagnostico.jsx"), "utf8");
const systemCheck = readFileSync(resolve(root, "src/modules/diag/SystemCheck.js"), "utf8");
const serviceWorker = readFileSync(resolve(root, "public/sw.js"), "utf8");
const envExample = readFileSync(resolve(root, ".env.example"), "utf8");
const supabaseClient = readFileSync(resolve(root, "src/supabase.js"), "utf8");
const filesMigration = readFileSync(resolve(root, "supabase/migrations/20260608012000_file_registry.sql"), "utf8");

assert.doesNotMatch(envExample, /eyJhbGci|[0-9]{8,}:[A-Za-z0-9_-]{20,}/, ".env.example nao deve conter valores reais");
assert.doesNotMatch(waldenirSeed, /waldenir@2026|admin123|tec123|fin123|mec123/, "Seed Waldenir nao deve conter senha real");
assert.doesNotMatch(supabaseClient, /eyJhbGci|enwlwudxtxpebxqfzkku/, "Cliente Supabase nao deve ter fallback hardcoded");
assert.match(monitor, /re_monitor_history/, "Monitor deve salvar historico");
assert.match(backup, /re_monitor_history/, "Backup deve incluir historico do monitor");
assert.match(vercelEnvSync, /upsert=true/, "Sync Vercel deve atualizar variaveis sem duplicar");
assert.match(waldenirSeed, /passHash/, "Seed Waldenir deve gravar senha com hash");
assert.match(systemCheck, /pendente_sync/, "Diagnostico deve diferenciar pendencia de modulo vazio");
assert.match(diagnostico, /Sem dados \(OK\)/, "Diagnostico deve tratar modulo vazio como OK");
assert.match(filesMigration, /create table if not exists public\.re_files/, "Migracao de arquivos deve existir");
assert.match(filesMigration, /stocktel-files/, "Migracao deve criar bucket privado de arquivos");
assert.match(readFileSync(resolve(root, "src/hooks/useLS.js"), "utf8"), /mergeEntityArray/, "Sync local/remoto deve mesclar entidades");
assert.match(serviceWorker, /unregister/, "SW deve ser kill-switch (cloud-only, sem cache offline)");
assert.doesNotMatch(serviceWorker, /caches\.match/, "SW nao deve mais servir conteudo do cache");
assert.match(readFileSync(resolve(root, "src/main.jsx"), "utf8"), /unregister/, "main.jsx deve desregistrar service workers antigos");
assert.match(app, /pontoFechamentos/, "Fechamento mensal de ponto deve estar conectado ao app");
assert.match(app, /exportarExcelPonto/, "Exportacao Excel do ponto deve existir");
assert.match(app, /Auditoria do Sistema/, "Tela de auditoria deve estar disponivel");
assert.match(app, /ACTION_LABELS/, "Permissoes por acao devem estar conectadas ao cadastro");
assert.match(app, /EstoqueModule/, "Estoque base deve usar modulo extraido");
assert.match(app, /KitModule/, "Kit tecnico deve usar modulo extraido");
assert.match(app, /DistModule/, "Saida/liberacao deve usar modulo extraido");
assert.match(app, /NFModule/, "Entrada NF deve usar modulo extraido");
assert.match(app, /ponto:<PontoPage/, "Ponto eletronico deve usar tela completa legada");
assert.match(app, /getCurrentPosition/, "Ponto eletronico deve manter geolocalizacao");
assert.match(app, /frota:<FrotaPage/, "Frota deve usar tela completa legada");
assert.match(app, /Checklist/, "Frota deve manter checklist completo");
assert.match(app, /getCustoPorKm/, "Frota deve manter custos e historico");
assert.match(app, /diag:<DiagnosticoPage/, "Diagnostico deve usar tela completa legada");
assert.match(app, /Forçar Sincronização/, "Diagnostico deve manter controles completos de sincronizacao");
assert.match(app, /RelatoriosModule/, "Relatorios deve usar modulo extraido");

console.log("StockTel smoke tests OK");
