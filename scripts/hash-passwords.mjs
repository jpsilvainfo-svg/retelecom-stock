// scripts/hash-passwords.mjs — migra senhas em texto puro de re_users para hash
// PBKDF2 (mesmo formato do login no app). O login continua funcionando com a
// MESMA senha; apenas o texto puro deixa de existir no banco.
//
// Uso: node scripts/hash-passwords.mjs           (apenas mostra o que faria)
//      node scripts/hash-passwords.mjs --apply   (grava no Supabase)
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
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_KEY;
if (!url || !key) { console.error(".env.local sem Supabase."); process.exit(2); }

const res = await fetch(`${url}/rest/v1/re_data?select=value&key=eq.re_users`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) throw new Error(`Falha ao ler re_users: HTTP ${res.status}`);
const rows = await res.json();
const users = Array.isArray(rows?.[0]?.value) ? rows[0].value : [];

let changed = 0;
const next = [];
for (const u of users) {
  if (u && u.pass && !u.passHash) {
    const { passHash, passSalt } = await hashSenha(u.pass);
    const { pass, ...rest } = u; // remove texto puro
    void pass;
    next.push({ ...rest, passHash, passSalt });
    changed++;
    console.log(`  hash → ${u.login}`);
  } else {
    next.push(u);
  }
}

console.log(`\n${changed} senha(s) em texto puro encontradas de ${users.length} usuário(s).`);
if (!changed) { console.log("Nada a fazer."); process.exit(0); }

if (!APPLY) {
  console.log("\n(simulação) rode com --apply para gravar no Supabase.");
  process.exit(0);
}

const up = await fetch(`${url}/rest/v1/re_data`, {
  method: "POST",
  headers: {
    apikey: key, Authorization: `Bearer ${key}`,
    "Content-Type": "application/json", Prefer: "resolution=merge-duplicates",
  },
  body: JSON.stringify({ key: "re_users", value: next, updated_at: new Date().toISOString() }),
});
if (!up.ok) { const t = await up.text(); throw new Error(`Falha ao gravar: HTTP ${up.status} ${t.slice(0, 120)}`); }
console.log(`\n✅ ${changed} senha(s) convertidas para hash em produção. Login segue com a mesma senha.`);
