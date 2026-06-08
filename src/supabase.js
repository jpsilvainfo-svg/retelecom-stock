// supabase.js — cliente Supabase com retry automático e proteção de dados
import { createClient } from "@supabase/supabase-js";

// Lê das env vars do Vite/Vercel; fallback para valores hardcoded
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.warn("[supabase] Variaveis VITE_SUPABASE_URL/VITE_SUPABASE_KEY ausentes.");
}

const sb = createClient(SUPA_URL, SUPA_KEY, {
  auth: { persistSession: false },
  global: { headers: { "x-app": "stocktel" } },
});

// ── Proteção: detecta valor aninhado incorretamente (bug antigo) ──────────
function isWrapped(v) {
  return v && typeof v === "object" && !Array.isArray(v) &&
    "empty" in v && "value" in v && "updated_at" in v;
}

function normalize(data) {
  if (!data) return null;
  let { value, updated_at } = data;
  // Desempacota se valor foi gravado como estrutura interna por engano
  if (isWrapped(value)) {
    if (value.empty) return { value: null, updated_at: value.updated_at || updated_at, empty: true };
    updated_at = value.updated_at || updated_at;
    value = value.value;
  }
  return { value, updated_at };
}

// ── Retry com backoff exponencial ─────────────────────────────────────────
async function withRetry(fn, retries = 3, delay = 400) {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      if (result.ok !== false) return result;
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
  return { ok: false, error: "Falha após " + retries + " tentativas" };
}

// ── API pública ───────────────────────────────────────────────────────────
export async function sbPing() {
  const t0 = Date.now();
  try {
    const { error } = await sb.from("re_data").select("key").limit(1);
    return { ok: !error, ms: Date.now() - t0, error: error?.message || null };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e?.message || "Sem conexão" };
  }
}

export async function sbGet(key) {
  try {
    const { data, error } = await sb
      .from("re_data")
      .select("value,updated_at")
      .eq("key", key)
      .single();
    if (error?.code === "PGRST116") return { value: null, updated_at: null, empty: true };
    if (error || !data) return null;
    return normalize(data);
  } catch { return null; }
}

export async function sbSet(key, value) {
  // Rejeita valor aninhado incorreto
  if (isWrapped(value)) {
    console.warn("[supabase] sbSet rejeitado: valor aninhado detectado para", key);
    return { ok: false, error: "Valor aninhado rejeitado" };
  }
  return withRetry(async () => {
    const { error } = await sb
      .from("re_data")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    return { ok: !error, error: error?.message || null };
  });
}
