// src/hooks/useLS.js
import { useState, useEffect, useCallback } from "react";
import { sbGet, sbSet } from "../supabase";

const tsKey = k => `${k}__ts`;
const QUEUE_KEY = "__sync_queue";

// ── Fila de retry ──────────────────────────────────────────────────────────
export function queueAdd(key, value) {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) || "{}");
    q[key] = { value, ts: new Date().toISOString() };
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
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

// ── Tenta enviar para Supabase, com retry na fila se falhar ───────────────
async function pushToCloud(key, value) {
  const res = await sbSet(key, value);
  if (res.ok) {
    const ts = new Date().toISOString();
    try { localStorage.setItem(tsKey(key), ts); } catch {}
    queueRemove(key);
    window.dispatchEvent(new CustomEvent("sync-ok", { detail: { key } }));
  } else {
    queueAdd(key, value);
    window.dispatchEvent(new CustomEvent("sync-fail", { detail: { key, error: res.error } }));
  }
}

// ── Hook principal ────────────────────────────────────────────────────────
export const useLS = (key, initial) => {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });

  // Ao montar: busca do Supabase e aplica se for mais recente
  useEffect(() => {
    sbGet(key).then(remote => {
      if (remote && !remote.empty && remote.value !== null) {
        const localTs = localStorage.getItem(tsKey(key)) || "0";
        const remoteTs = remote.updated_at || "0";
        if (remoteTs > localTs) {
          setVal(remote.value);
          try {
            localStorage.setItem(key, JSON.stringify(remote.value));
            localStorage.setItem(tsKey(key), remoteTs);
          } catch {}
        }
      }
    }).catch(() => {});
  }, [key]);

  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      // 1. Salva local imediatamente (UI responsivo)
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      // 2. Envia para nuvem (com retry automático se falhar)
      pushToCloud(key, next);
      return next;
    });
  }, [key]);

  return [val, set];
};

export default useLS;
