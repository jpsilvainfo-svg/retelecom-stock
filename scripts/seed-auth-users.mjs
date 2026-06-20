// scripts/seed-auth-users.mjs — cria as contas de login no Supabase Auth a
// partir de re_users (etapa 1 do "fechar o banco"). Cada usuário recebe uma
// senha temporária forte e é marcado para trocá-la no 1º login.
//
// PRÉ-REQUISITO: a chave secreta service_role no ambiente (NUNCA commitar):
//   SUPABASE_SERVICE_ROLE=...   (ou no .env.local)
//
// Uso: node scripts/seed-auth-users.mjs            (simula, mostra as senhas)
//      node scripts/seed-auth-users.mjs --apply    (cria de verdade)
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const APPLY = process.argv.includes("--apply");
const EMAIL_DOMAIN = "stocktel.app"; // o app mapeia login -> login@stocktel.app

const env = {};
for (const l of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([^#][^=]+?)\s*=\s*(.*)\s*$/); if (m) env[m[1].trim()] = m[2].trim();
}
const URL = env.VITE_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error("Falta VITE_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE no ambiente/.env.local.");
  process.exit(2);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

function senhaForte() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ", a = "abcdefghijkmnpqrstuvwxyz", N = "23456789", S = "!@#%&*?";
  const all = A + a + N + S;
  const pick = set => set[webcrypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  let s = pick(A) + pick(a) + pick(N) + pick(S);
  for (let i = 0; i < 10; i++) s += pick(all);
  return s.split("").sort(() => (webcrypto.getRandomValues(new Uint32Array(1))[0] % 2) - 0.5).join("");
}

const { data: row, error: readErr } = await admin.from("re_data").select("value").eq("key", "re_users").single();
if (readErr) { console.error("Falha ao ler re_users:", readErr.message); process.exit(1); }
const users = Array.isArray(row?.value) ? row.value : [];

const creds = [];
for (const u of users) {
  if (!u?.login) continue;
  const email = `${u.login}@${EMAIL_DOMAIN}`;
  const senha = senhaForte();
  creds.push({ login: u.login, email, senha_temporaria: senha, role: u.role });
  if (APPLY) {
    const { error } = await admin.auth.admin.createUser({
      email, password: senha, email_confirm: true,
      user_metadata: { login: u.login, name: u.name, role: u.role, uid: u.id },
    });
    if (error && !/already.*registered|already.*exists/i.test(error.message)) {
      console.error(`  ERRO em ${u.login}:`, error.message);
    }
  }
}

console.log(`\n${creds.length} usuário(s). E-mail de login = <login>@${EMAIL_DOMAIN}\n`);
console.table(creds);

if (!APPLY) { console.log("\n(simulação) rode com --apply para criar as contas."); process.exit(0); }

// Marca todos para trocar a senha no 1º login (bootstrap seguro do novo auth)
const updated = users.map(u => ({ ...u, mustChangePassword: true }));
const { error: upErr } = await admin.from("re_data").upsert({ key: "re_users", value: updated, updated_at: new Date().toISOString() });
console.log(upErr ? "\nFalha ao marcar troca de senha: " + upErr.message
                  : "\n✅ Contas criadas no Supabase Auth. Distribua as senhas temporárias acima; cada um troca no 1º login.");
