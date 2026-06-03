// src/hooks/useLS.js — sync local ↔ Supabase com timestamp e retry automático
import { useState, useEffect, useCallback } from "react";
import { sbGet, sbSet } from "../supabase";

const tsKey = k => `${k}__ts`;
const QUEUE_KEY = "__sync_queue";

// ── Valida tipo do valor remoto contra o tipo esperado ────────────────────
function safeValue(remote, initial) {
  if (remote === null || remote === undefined) return null;
  if (Array.isArray(initial) && !Array.isArray(remote)) return null;
  if (initial !== null && typeof initial === "object" && !Array.isArray(initial)) {
    if (typeof remote !== "object" || Array.isArray(remote)) return null;
  }
  return remote;
}

// ── Fila de retry ─────────────────────────────────────────────────────────
export function queueAdd(key, value) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}");
    q[key] = { value, ts: new Date().toISOString() };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    window.dispatchEvent(new Event("sync-queue-change"));
  } catch {}
}

export function queueRemove(key) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}");
    delete q[key];
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    window.dispatchEvent(new Event("sync-queue-change"));
  } catch {}
}

export function queueGet() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}"); }
  catch { return {}; }
}

export function queueSize() {
  return Object.keys(queueGet()).length;
}

// ── Envia para Supabase, fila de retry se falhar ──────────────────────────
export async function pushToCloud(key, value) {
  try {
    const res = await sbSet(key, value);
    if (res.ok) {
      queueRemove(key);
      window.dispatchEvent(new CustomEvent("sync-ok", { detail: { key } }));
    } else {
      queueAdd(key, value);
      window.dispatchEvent(new CustomEvent("sync-fail", { detail: { key, error: res.error } }));
    }
  } catch {
    queueAdd(key, value);
  }
}

// ── Hook principal ────────────────────────────────────────────────────────
export const useLS = (key, initial) => {
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      if (!s) return initial;
      const parsed = JSON.parse(s);
      const safe = safeValue(parsed, initial);
      return safe !== null ? safe : initial;
    } catch { return initial; }
  });

  // Ao montar: busca do Supabase e aplica se remoto for mais recente
  // Se local for mais recente (ou nuvem vazia) → envia local para nuvem
  useEffect(() => {
    sbGet(key).then(remote => {
      const localRaw = localStorage.getItem(key);
      const localTs  = localStorage.getItem(tsKey(key)) || "0";

      if (remote && !remote.empty && remote.value !== null) {
        const remoteTs = remote.updated_at || "0";
        const safe = safeValue(remote.value, initial);
        if (safe === null) return;

        if (remoteTs > localTs) {
          // Nuvem mais recente → aplica localmente
          setVal(safe);
          try {
            localStorage.setItem(key, JSON.stringify(safe));
            localStorage.setItem(tsKey(key), remoteTs);
          } catch {}
        } else if (localTs >= remoteTs && localRaw) {
          // Local igual ou mais recente → garante que nuvem está atualizada
          try { pushToCloud(key, JSON.parse(localRaw)); } catch {}
        }
      } else if (localRaw) {
        // Nuvem vazia mas temos dados locais → envia para nuvem
        try { pushToCloud(key, JSON.parse(localRaw)); } catch {}
      }
    }).catch(() => {});
  }, [key]); // eslint-disable-line

  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      // CRÍTICO: salva timestamp IMEDIATAMENTE junto com os dados
      // Isso garante que local sempre vence sobre dado remoto antigo
      const ts = new Date().toISOString();
      try {
        localStorage.setItem(key, JSON.stringify(next));
        localStorage.setItem(tsKey(key), ts); // timestamp local definido ANTES do cloud
      } catch {}
      pushToCloud(key, next);
      return next;
    });
  }, [key]);

  return [val, set];
};

export default useLS;
