// scripts/cleanup-users.mjs — limpa re_users na nuvem:
//  - de-duplica por login (mantém a entrada com hash, descarta duplicatas)
//  - remove senhas em texto puro quando já existe hash
//  - gera hash para quem ainda estiver só com texto puro
//
// Uso: node scripts/cleanup-users.mjs           (simula)
//      node scripts/cleanup-users.mjs --apply   (grava)
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const APPLY = process.argv.includes("--apply");

function readDotenv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([^#][^=]+?)\s*=\s*(.*)\s*$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}
const b64 = bytes => Buffer.from(bytes).toString("base64");
async function hashSenha(senha) {
  const enc = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey("raw", enc.encode(senha), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return { passHash: b64(new Uint8Array(bits)), passSalt: b64(salt) };
}

const env = readDotenv(".env.local");
const url = env.VITE_SUPABASE_URL, key = (env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_KEY);
if (!url || !key) { console.error(".env.local sem Supabase."); process.exit(2); }

const res = await fetch(`${url}/rest/v1/re_data?select=value&key=eq.re_users`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const rows = await res.json();
const users = Array.isArray(rows?.[0]?.value) ? rows[0].value : [];

// De-duplica por login, preferindo a entrada que já tem hash.
const byLogin = new Map();
for (const u of users) {
  if (!u || !u.login) continue;
  const prev = byLogin.get(u.login);
  if (!prev) { byLogin.set(u.login, u); continue; }
  const prevHash = !!prev.passHash, curHash = !!u.passHash;
  // mantém o que tem hash; se ambos ou nenhum, mantém o primeiro
  byLogin.set(u.login, prevHash && !curHash ? prev : (!prevHash && curHash ? u : prev));
}

const next = [];
let hashed = 0, strippedPlain = 0;
for (const u of byLogin.values()) {
  let user = { ...u };
  if (user.passHash) {
    if ("pass" in user) { delete user.pass; strippedPlain++; }
  } else if (user.pass) {
    const { passHash, passSalt } = await hashSenha(user.pass);
    delete user.pass;
    user = { ...user, passHash, passSalt };
    hashed++;
  }
  next.push(user);
}

console.log(`Entrada: ${users.length} usuário(s) | Saída: ${next.length} (de-duplicados: ${users.length - next.length})`);
console.log(`Texto puro removido (tinha hash): ${strippedPlain} | Convertidos para hash: ${hashed}`);
console.log("Logins finais:", next.map(u => u.login).join(", "));
console.log("Texto puro restante:", next.filter(u => u.pass).length);

if (!APPLY) { console.log("\n(simulação) rode com --apply para gravar."); process.exit(0); }

const up = await fetch(`${url}/rest/v1/re_data`, {
  method: "POST",
  headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
  body: JSON.stringify({ key: "re_users", value: next, updated_at: new Date().toISOString() }),
});
if (!up.ok) { const t = await up.text(); throw new Error(`Falha ao gravar: HTTP ${up.status} ${t.slice(0, 120)}`); }
console.log(`\n✅ re_users limpo: ${next.length} usuário(s), 0 em texto puro.`);
