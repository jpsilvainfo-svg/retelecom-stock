// src/hooks/useLS.js
import { useState, useEffect, useCallback } from "react";
import { sbGet, sbSet } from "../supabase";

const tsKey = k => `${k}__ts`;
const QUEUE_KEY = "__sync_queue";

// ── Garante que o tipo do valor remoto bate com o tipo esperado ───────────
function safeValue(remote, initial) {
  if (remote === null || remote === undefined) return null;
  if (
    remote &&
    typeof remote === "object" &&
    !Array.isArray(remote) &&
    Object.prototype.hasOwnProperty.call(remote, "empty") &&
    Object.prototype.hasOwnProperty.call(remote, "value") &&
    Object.prototype.hasOwnProperty.call(remote, "updated_at")
  ) return null;
  // Se o valor inicial é array, o remoto também deve ser array
  if (Array.isArray(initial) && !Array.isArray(remote)) return null;
  // Se o valor inicial é objeto (não array), o remoto deve ser objeto
  if (initial !== null && typeof initial === "object" && !Array.isArray(initial)) {
    if (typeof remote !== "object" || Array.isArray(remote)) return null;
  }
  return remote;
}

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
  try {
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
      // Garante que o tipo bate com o inicial
      const safe = safeValue(parsed, initial);
      if (safe === null) {
        localStorage.removeItem(key);
        localStorage.removeItem(tsKey(key));
      }
      return safe !== null ? safe : initial;
    } catch { return initial; }
  });

  // Ao montar: sincronização bidirecional automática
  useEffect(() => {
    sbGet(key).then(remote => {
      const localRaw = localStorage.getItem(key);
      const localTs = localStorage.getItem(tsKey(key)) || "0";

      if (remote && !remote.empty && remote.value !== null) {
        const remoteTs = remote.updated_at || "0";
        // Valida tipo antes de aplicar dado remoto
        const safe = safeValue(remote.value, initial);
        if (safe === null) return; // tipo incompatível, ignora

        if (remoteTs > localTs) {
          // Nuvem mais recente → aplica local
          setVal(safe);
          try {
            localStorage.setItem(key, JSON.stringify(safe));
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
  }, [key]); // eslint-disable-line

  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      pushToCloud(key, next);
      return next;
    });
  }, [key]);

  return [val, set];
};

export default useLS;
