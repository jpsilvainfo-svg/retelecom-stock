import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";

const ALL_MODULES = ["dash", "os", "frota", "estoque", "kit", "nf", "dist", "dev", "sol", "rel", "email", "cat", "produtos", "usr", "log", "ajuda", "manut", "ponto"];
const ACTION_PERMS = ["exportar", "aprovar_ponto", "reabrir_ponto", "editar_ponto", "administrar_usuarios"];

function readDotenv(path) {
  const env = {};
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+?)\s*=\s*(.*)\s*$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
  return env;
}

function b64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

async function hashSenha(senha, saltB64 = null) {
  const enc = new TextEncoder();
  const salt = saltB64 ? Uint8Array.from(Buffer.from(saltB64, "base64")) : webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey("raw", enc.encode(senha), { name: "PBKDF2" }, false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return { passHash: b64(new Uint8Array(bits)), passSalt: b64(salt) };
}

const env = readDotenv(".env.local");
const supaUrl = env.VITE_SUPABASE_URL;
const supaKey = (env.SUPABASE_SERVICE_ROLE || env.VITE_SUPABASE_KEY);
if (!supaUrl || !supaKey) {
  console.error(".env.local sem Supabase.");
  process.exit(2);
}

const tempPassword = process.env.WALDENIR_TEMP_PASSWORD;
if (!tempPassword) {
  console.error("WALDENIR_TEMP_PASSWORD ausente. Informe apenas no terminal local.");
  process.exit(2);
}
const { passHash, passSalt } = await hashSenha(tempPassword);

const response = await fetch(`${supaUrl}/rest/v1/re_data?select=value&key=eq.re_users`, {
  headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
});
if (!response.ok) throw new Error(`Falha ao ler re_users: HTTP ${response.status}`);
const rows = await response.json();
const users = Array.isArray(rows?.[0]?.value) ? rows[0].value : [];

const waldenir = {
  id: "u10",
  name: "Waldenir Marques Pereira",
  email: "waldenir@stocktel.com.br",
  phone: "",
  cpf: "",
  login: "waldenir",
  role: "admin",
  photo: "",
  perms: ALL_MODULES,
  actionPerms: ACTION_PERMS,
  mustChangePassword: true,
  passHash,
  passSalt,
};

const exists = users.some((user) => user.login === waldenir.login || user.id === waldenir.id);
const next = exists
  ? users.map((user) => (user.login === waldenir.login || user.id === waldenir.id ? { ...user, ...waldenir, id: user.id || waldenir.id } : user))
  : [...users, waldenir];

const upsert = await fetch(`${supaUrl}/rest/v1/re_data`, {
  method: "POST",
  headers: {
    apikey: supaKey,
    Authorization: `Bearer ${supaKey}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates",
  },
  body: JSON.stringify({ key: "re_users", value: next, updated_at: new Date().toISOString() }),
});

if (!upsert.ok) {
  const text = await upsert.text();
  throw new Error(`Falha ao gravar re_users: HTTP ${upsert.status} ${text.slice(0, 120)}`);
}

console.log(`Waldenir sincronizado em re_users. Total de usuarios: ${next.length}.`);
