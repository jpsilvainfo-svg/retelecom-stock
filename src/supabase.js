// supabase.js — cliente Supabase com retry automático e proteção de dados
import { createClient } from "@supabase/supabase-js";

// Lê das env vars do Vite/Vercel; fallback para valores hardcoded
const SUPA_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPA_URL || !SUPA_KEY) {
  console.warn("[supabase] Variaveis VITE_SUPABASE_URL/VITE_SUPABASE_KEY ausentes.");
}

const sb = createClient(SUPA_URL, SUPA_KEY, {
  // Sessão do Supabase Auth persiste no navegador: depois do login, o cliente
  // anexa automaticamente o JWT em todas as chamadas (dados e Storage), o que
  // permite fechar o RLS para "authenticated".
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  global: { headers: { "x-app": "stocktel" } },
});

// ── Autenticação (Supabase Auth) ──────────────────────────────────────────
// O app usa "login" (usuário); por baixo, mapeamos para login@stocktel.app.
export const AUTH_EMAIL_DOMAIN = "stocktel.app";
const loginToEmail = (login) => `${String(login || "").trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

export async function authSignIn(login, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email: loginToEmail(login), password });
  return { ok: !error, error: error?.message || null, session: data?.session || null };
}

export async function authSignOut() {
  try { await sb.auth.signOut(); } catch {}
}

export async function authHasSession() {
  try { const { data } = await sb.auth.getSession(); return !!data?.session; }
  catch { return false; }
}

export async function authUpdatePassword(newPassword) {
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return { ok: !error, error: error?.message || null };
}

// Busca o perfil (papel/permissões) na re_users já autenticado.
export async function fetchUserProfile(login) {
  const row = await sbGet("re_users");
  const list = Array.isArray(row?.value) ? row.value : [];
  return list.find(u => String(u.login).toLowerCase() === String(login).trim().toLowerCase()) || null;
}

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

// ── Storage de arquivos (PDF, fotos, documentos) ──────────────────────────
export const FILES_BUCKET = "stocktel-files";

function sanitizeName(name) {
  return (name || "arquivo").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

// Envia um arquivo para o Storage e registra os metadados em re_files.
export async function sbUploadFile(file, { module = "geral", relatedKey = null, ownerId = null, createdBy = null } = {}) {
  try {
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${module}/${Date.now()}_${rand}_${sanitizeName(file.name)}`;
    const up = await sb.storage.from(FILES_BUCKET).upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (up.error) return { ok: false, error: up.error.message };
    const meta = {
      module, owner_id: ownerId, related_key: relatedKey, bucket: FILES_BUCKET,
      path, filename: file.name, content_type: file.type || null,
      size_bytes: file.size || null, created_by: createdBy,
    };
    const ins = await sb.from("re_files").insert(meta).select().single();
    if (ins.error) {
      // rollback do binário se o metadado falhar
      try { await sb.storage.from(FILES_BUCKET).remove([path]); } catch {}
      return { ok: false, error: ins.error.message };
    }
    return { ok: true, file: ins.data };
  } catch (e) {
    return { ok: false, error: e?.message || "Falha no upload" };
  }
}

// Lista metadados de arquivos por módulo e/ou chave relacionada.
export async function sbListFiles({ module = null, relatedKey = null } = {}) {
  try {
    let q = sb.from("re_files").select("*").order("created_at", { ascending: false });
    if (module) q = q.eq("module", module);
    if (relatedKey) q = q.eq("related_key", relatedKey);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message, files: [] };
    return { ok: true, files: data || [] };
  } catch (e) {
    return { ok: false, error: e?.message || "Falha ao listar", files: [] };
  }
}

// Gera uma URL temporária assinada para abrir/baixar o arquivo privado.
export async function sbFileUrl(path, expiresSeconds = 3600) {
  try {
    const { data, error } = await sb.storage.from(FILES_BUCKET).createSignedUrl(path, expiresSeconds);
    if (error) return null;
    return data?.signedUrl || null;
  } catch { return null; }
}

// Remove o binário do Storage e o metadado de re_files.
export async function sbDeleteFile(fileRow) {
  try {
    const r = await sb.storage.from(FILES_BUCKET).remove([fileRow.path]);
    if (r.error) return { ok: false, error: r.error.message };
    await sb.from("re_files").delete().eq("id", fileRow.id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Falha ao remover" };
  }
}
