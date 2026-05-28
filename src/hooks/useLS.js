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

// ── Envia para Supabase, coloca na fila se falhar ─────────────────────────
export async function pushToCloud(key, value) {
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

  // Ao montar: sincronização bidirecional automática
  // - Se remoto for mais recente → aplica no local
  // - Se local for mais recente OU nuvem vazia → empurra local para nuvem
  useEffect(() => {
    sbGet(key).then(remote => {
      const localRaw = localStorage.getItem(key);
      const localTs = localStorage.getItem(tsKey(key)) || "0";

      if (remote && !remote.empty && remote.value !== null) {
        const remoteTs = remote.updated_at || "0";
        if (remoteTs > localTs) {
          // Nuvem mais recente → aplica local
          setVal(remote.value);
          try {
            localStorage.setItem(key, JSON.stringify(remote.value));
            localStorage.setItem(tsKey(key), remoteTs);
          } catch {}
        } else if (localTs > remoteTs && localRaw) {
          // Local mais recente → envia para nuvem
          try { pushToCloud(key, JSON.parse(localRaw)); } catch {}
        }
      } else if (localRaw) {
        // Nuvem vazia mas temos dados locais → envia para nuvem
        try { pushToCloud(key, JSON.parse(localRaw)); } catch {}
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
