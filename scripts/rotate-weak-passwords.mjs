// scripts/rotate-weak-passwords.mjs — troca as senhas fracas/padrão por senhas
// fortes aleatórias (hash PBKDF2) e marca a conta para trocar no 1º login.
// Reduz o risco mesmo com o banco exposto: hash de senha forte não é
// quebrável por força bruta como "admin123".
//
// Uso: node scripts/rotate-weak-passwords.mjs           (simula, mostra senhas)
//      node scripts/rotate-weak-passwords.mjs --apply   (grava no Supabase)
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const APPLY = process.argv.includes("--apply");

// Contas com senha fraca/padrão a serem rotacionadas.
const ALVO = new Set([
  "admin", "estoque", "joao", "carlos", "jpaulo",
  "marcos", "pedro", "financeiro", "mecanico",
]);

function readDotenv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#][^=]+?)\s*=\s*(.*)\s*$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}
const b64 = bytes => Buffer.from(bytes).toString("base64");

// Senha forte legível (sem caracteres ambíguos), com letras, número e símbolo.
function senhaForte() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ", a = "abcdefghijkmnpqrstuvwxyz";
  const N = "23456789", S = "!@#%&*?";
  const all = A + a + N + S;
  const pick = set => set[webcrypto.getRandomValues(new Uint32Array(1))[0] % set.length];
  let s = pick(A) + pick(a) + pick(N) + pick(S);
  for (let i = 0; i < 10; i++) s += pick(all);
  return s.split("").sort(() => (webcrypto.getRandomValues(new Uint32Array(1))[0] % 2) - 0.5).join("");
}

async function hashSenha(senha) {
  const enc = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey("raw", enc.encode(senha), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return { passHash: b64(new Uint8Array(bits)), passSalt: b64(salt) };
}

const env = readDotenv(".env.local");
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_KEY;
if (!url || !key) { console.error(".env.local sem Supabase."); process.exit(2); }

const res = await fetch(`${url}/rest/v1/re_data?select=value&key=eq.re_users`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) throw new Error(`Falha ao ler re_users: HTTP ${res.status}`);
const rows = await res.json();
const users = Array.isArray(rows?.[0]?.value) ? rows[0].value : [];

const credenciais = [];
const next = [];
for (const u of users) {
  if (u && ALVO.has(u.login)) {
    const senha = senhaForte();
    const { passHash, passSalt } = await hashSenha(senha);
    const { pass, ...rest } = u; void pass;
    next.push({ ...rest, passHash, passSalt, mustChangePassword: true });
    credenciais.push({ login: u.login, nome: u.name, senha_temporaria: senha });
  } else {
    next.push(u);
  }
}

console.log(`\nContas a rotacionar: ${credenciais.length} de ${users.length} usuário(s).\n`);
console.table(credenciais);

if (!APPLY) { console.log("\n(simulação) rode com --apply para gravar no Supabase."); process.exit(0); }

const up = await fetch(`${url}/rest/v1/re_data`, {
  method: "POST",
  headers: {
    apikey: key, Authorization: `Bearer ${key}`,
    "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
  },
  body: JSON.stringify({ key: "re_users", value: next, updated_at: new Date().toISOString() }),
});
if (!up.ok) { const t = await up.text(); throw new Error(`Falha ao gravar: HTTP ${up.status} ${t.slice(0, 120)}`); }
console.log(`\n✅ ${credenciais.length} senha(s) rotacionadas. Cada usuário troca no 1º login.`);
console.log("⚠️ Anote/distribua as senhas acima AGORA — elas não ficam salvas em texto puro.");
