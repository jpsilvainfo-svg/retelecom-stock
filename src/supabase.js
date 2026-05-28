// supabase.js — usa variáveis de ambiente VITE para segurança
import { createClient } from "@supabase/supabase-js";

const SUPA_URL = import.meta.env.VITE_SUPABASE_URL || "https://enwlwudxtxpebxqfzkku.supabase.co";
const SUPA_KEY = import.meta.env.VITE_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVud2x3dWR4dHhwZWJ4cWZ6a2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MDQ0MTcsImV4cCI6MjA5NDk4MDQxN30.TE1JbN-2JepCotaQMOxTe4CFIt-Ht_o9sUAlpxBzWZ8";

const sb = createClient(SUPA_URL, SUPA_KEY);

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
    return { value: data.value, updated_at: data.updated_at };
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
