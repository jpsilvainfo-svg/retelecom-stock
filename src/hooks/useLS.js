// src/hooks/useLS.js — sincronização local ↔ Supabase com retry, timestamp
// imediato e propagação de exclusões (tombstones).
import { useState, useEffect, useCallback, useRef } from "react";
import { sbGet, sbSet } from "../supabase";
import {
  mergeEntityArray,
  diffIdentity,
  applyTombstones,
  applyDelta,
  mergeTombstones,
} from "./syncMerge";

const tsKey = k => `${k}__ts`;
const tombKey = k => `${k}__tomb`;
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

// ── Tombstones (registro de exclusões) ────────────────────────────────────
function readTomb(key) {
  try { return JSON.parse(localStorage.getItem(tombKey(key)) || "{}"); }
  catch { return {}; }
}
function writeTomb(key, tomb) {
  try { localStorage.setItem(tombKey(key), JSON.stringify(tomb)); } catch {}
}

// ── Fila de pendentes ─────────────────────────────────────────────────────
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
      if (safe === null) return initialRef.current;
      // Respeita exclusões já registradas localmente
      return Array.isArray(safe) ? applyTombstones(safe, readTomb(key)) : safe;
    } catch { return initialRef.current; }
  });

  // Ao montar: sincroniza valor + tombstones com o Supabase
  useEffect(() => {
    Promise.all([sbGet(key), sbGet(tombKey(key))]).then(([remote, remoteTombRow]) => {
      const localRaw = localStorage.getItem(key);
      const localTs  = localStorage.getItem(tsKey(key)) || "0";

      // Combina tombstones local + remoto (timestamp mais recente vence)
      const localTomb  = readTomb(key);
      const remoteTomb = (remoteTombRow && !remoteTombRow.empty && remoteTombRow.value && typeof remoteTombRow.value === "object")
        ? remoteTombRow.value : {};
      const tomb = mergeTombstones(localTomb, remoteTomb);
      writeTomb(key, tomb);
      if (JSON.stringify(tomb) !== JSON.stringify(remoteTomb) && Object.keys(tomb).length) {
        pushToCloud(tombKey(key), tomb);
      }

      const finalize = (arrOrVal) => {
        const next = Array.isArray(arrOrVal) ? applyTombstones(arrOrVal, tomb) : arrOrVal;
        setVal(next);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      };

      if (remote && !remote.empty && remote.value !== null) {
        const remoteTs = remote.updated_at || "0";
        const safe = safeValue(remote.value, initialRef.current);
        if (safe === null) return; // tipo incompatível, ignora
        const localValue = localRaw ? JSON.parse(localRaw) : null;
        const merged = mergeEntityArray(localValue, safe);

        if (remoteTs > localTs) {
          // Remoto mais recente → aplica localmente (respeitando exclusões)
          const next = finalize(merged || safe);
          try { localStorage.setItem(tsKey(key), remoteTs); } catch {}
          if (merged) pushToCloud(key, next);
        } else if (localRaw) {
          // Local igual ou mais recente → garante que remoto está atualizado
          const next = finalize(merged || localValue);
          try { pushToCloud(key, next); } catch {}
        }
      } else if (localRaw) {
        // Supabase vazio mas temos local → envia (já sem itens excluídos)
        try {
          const localValue = JSON.parse(localRaw);
          const next = finalize(localValue);
          pushToCloud(key, next);
        } catch {}
      }
    }).catch(() => {});
  }, [key]);

  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      const ts = new Date().toISOString();

      // Detecta exclusões/recriações para manter os tombstones em dia
      if (Array.isArray(prev) && Array.isArray(next)) {
        const delta = diffIdentity(prev, next);
        if (delta.removed.length || delta.added.length) {
          const { tomb, changed } = applyDelta(readTomb(key), delta, ts);
          if (changed) {
            writeTomb(key, tomb);
            pushToCloud(tombKey(key), tomb);
          }
        }
      }

      // CRÍTICO: grava timestamp LOCAL imediatamente com os dados.
      // Garante que dado local SEMPRE ganha sobre remoto antigo.
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
