// src/hooks/useLS.js — sincronização local ↔ Supabase com retry e timestamp imediato
import { useState, useEffect, useCallback, useRef } from "react";
import { sbGet, sbSet } from "../supabase";

const tsKey = k => `${k}__ts`;
const QUEUE_KEY = "__sync_queue";

// ── Valida tipo do valor remoto ───────────────────────────────────────────
function safeValue(remote, initial) {
  if (remote === null || remote === undefined) return null;
  if (Array.isArray(initial) && !Array.isArray(remote)) return null;
  if (initial !== null && typeof initial === "object" && !Array.isArray(initial)) {
    if (typeof remote !== "object" || Array.isArray(remote)) return null;
  }
  return remote;
}

// ── Fila de pendentes ─────────────────────────────────────────────────────
function identityKey(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  return item.id || item.login || item.code || item.num || item.os || null;
}

function mergeEntityArray(localValue, remoteValue) {
  if (!Array.isArray(localValue) || !Array.isArray(remoteValue)) return null;
  const allObjects = [...localValue, ...remoteValue].every(item => item && typeof item === "object" && !Array.isArray(item));
  if (!allObjects) return null;
  const byKey = new Map();
  for (const item of remoteValue) {
    const key = identityKey(item);
    if (key) byKey.set(String(key), item);
  }
  for (const item of localValue) {
    const key = identityKey(item);
    if (key) byKey.set(String(key), { ...(byKey.get(String(key)) || {}), ...item });
  }
  const localKeys = new Set(localValue.map(identityKey).filter(Boolean).map(String));
  const localMerged = localValue.map(item => {
    const key = identityKey(item);
    return key ? byKey.get(String(key)) : item;
  });
  const remoteOnly = remoteValue.filter(item => {
    const key = identityKey(item);
    return key && !localKeys.has(String(key));
  });
  return [...localMerged, ...remoteOnly];
}

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

// ── Envia para Supabase (sbSet já faz retry internamente) ─────────────────
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
  const initialRef = useRef(initial);
  const [val, setVal] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      if (!s) return initialRef.current;
      const parsed = JSON.parse(s);
      const safe = safeValue(parsed, initialRef.current);
      return safe !== null ? safe : initialRef.current;
    } catch { return initialRef.current; }
  });

  // Ao montar: sincroniza com Supabase
  useEffect(() => {
    sbGet(key).then(remote => {
      const localRaw = localStorage.getItem(key);
      const localTs  = localStorage.getItem(tsKey(key)) || "0";

      if (remote && !remote.empty && remote.value !== null) {
        const remoteTs = remote.updated_at || "0";
        const safe = safeValue(remote.value, initialRef.current);
        const localValue = localRaw ? JSON.parse(localRaw) : null;
        const merged = mergeEntityArray(localValue, safe);
        if (safe === null) return; // tipo incompatível, ignora

        if (remoteTs > localTs) {
          // Remoto mais recente → aplica localmente
          const next = merged || safe;
          setVal(next);
          try {
            localStorage.setItem(key, JSON.stringify(next));
            localStorage.setItem(tsKey(key), remoteTs);
          } catch {}
          if (merged) pushToCloud(key, merged);
        } else {
          // Local igual ou mais recente → garante que remoto está atualizado
          if (localRaw) {
            try { pushToCloud(key, merged || localValue); } catch {}
          }
        }
      } else if (localRaw) {
        // Supabase vazio mas temos local → envia
        try { pushToCloud(key, JSON.parse(localRaw)); } catch {}
      }
    }).catch(() => {});
  }, [key]);

  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      // CRÍTICO: grava timestamp LOCAL imediatamente com os dados
      // Isso garante que dado local SEMPRE ganha sobre remoto antigo
      const ts = new Date().toISOString();
      try {
        localStorage.setItem(key, JSON.stringify(next));
        localStorage.setItem(tsKey(key), ts);
      } catch {}
      pushToCloud(key, next);
      return next;
    });
  }, [key]);

  return [val, set];
};

export default useLS;
