// supabase.js — usa variáveis de ambiente VITE para segurança
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = "https://enwlwudxtxpebxqfzkku.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud2x3dWR4dHhwZWJ4cWZ6a2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDQ0MTcsImV4cCI6MjA5NDk4MDQxN30.TE1JbN-2JepCotaQMOxTe4CFIt-Ht_o9sUAlpxBzWZ8";

const sb = createClient(SUPA_URL, SUPA_KEY);

function normalizeRow(data) {
  if (!data) return null;
  let value = data.value;
  let updated_at = data.updated_at;

  // Proteção contra linhas gravadas por engano como retorno inteiro de sbGet:
  // { value: { empty, value, updated_at }, updated_at }.
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "empty") &&
    Object.prototype.hasOwnProperty.call(value, "value") &&
    Object.prototype.hasOwnProperty.call(value, "updated_at")
  ) {
    if (value.empty === true) return { value: null, updated_at: value.updated_at || updated_at, empty: true };
    updated_at = value.updated_at || updated_at;
    value = value.value;
  }

  return { value, updated_at };
}

export async function sbPing() {
  const t0 = Date.now();
  try {
    const { error } = await sb.from("re_data").select("key").limit(1);
    return { ok: !error, ms: Date.now() - t0, error: error?.message || null };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, error: e?.message || "Erro de rede" };
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
    return normalizeRow(data);
  } catch { return null; }
}

export async function sbSet(key, value) {
  try {
    const { error } = await sb
      .from("re_data")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    return { ok: !error, error: error?.message || null };
  } catch (e) {
    return { ok: false, error: e?.message || "Erro de rede" };
  }
}
