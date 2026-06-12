// src/hooks/useLS.js — modo CLOUD-ONLY: o Supabase é a única fonte de verdade.
// Nenhum dado de negócio é guardado no navegador. Lê da nuvem ao montar e ao
// voltar o foco; grava direto na nuvem a cada alteração. A única coisa que
// pode ficar localmente é metadado de sincronização: o mapa de exclusões
// (tombstones) e uma fila de reenvio para gravações que falharam por queda de
// conexão (para o usuário não perder o que digitou).
import { useState, useEffect, useCallback, useRef } from "react";
import { sbGet, sbSet } from "../supabase";
import {
  mergeEntityArray,
  diffIdentity,
  applyTombstones,
  applyDelta,
  mergeTombstones,
} from "./syncMerge";

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

// ── Fila de reenvio (só guarda gravações que falharam) ────────────────────
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

// ── Grava direto na nuvem ──────────────────────────────────────────────────
// Para arrays de entidades, faz "ler-mesclar-gravar": lê o estado atual da
// nuvem e une com o valor enviado (respeitando exclusões), para um cliente não
// apagar itens que outro acabou de criar. Se a gravação falhar (sem internet),
// guarda na fila de reenvio.
export async function pushToCloud(key, value) {
  try {
    let toWrite = value;
    if (Array.isArray(value)) {
      try {
        const remote = await sbGet(key);
        if (remote && !remote.empty && Array.isArray(remote.value)) {
          const merged = mergeEntityArray(value, remote.value);
          if (merged) toWrite = applyTombstones(merged, readTomb(key));
        }
      } catch {} // se a leitura falhar, grava o valor local mesmo
    }
    const res = await sbSet(key, toWrite);
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

// Reenvia gravações pendentes (chamado ao reconectar / voltar o foco).
export async function flushQueue() {
  const q = queueGet();
  for (const key of Object.keys(q)) {
    await pushToCloud(key, q[key].value);
  }
}

// ── Hook principal (cloud-only) ────────────────────────────────────────────
export const useLS = (key, initial) => {
  const initialRef = useRef(initial);
  const [val, setVal] = useState(initialRef.current);
  // Só liberamos gravações na nuvem DEPOIS de carregar os dados reais. Antes
  // disso o estado é apenas o valor-padrão (USERS0, etc.); empurrar isso para a
  // nuvem sobrescreveria os dados reais (foi o que reintroduzia senhas/duplicava).
  const hydratedRef = useRef(false);

  // Busca o estado atual da nuvem e aplica exclusões. A nuvem é a fonte de
  // verdade: ao hidratar, o valor remoto substitui o padrão local.
  const pull = useCallback(() => {
    Promise.all([sbGet(key), sbGet(tombKey(key))]).then(([remote, remoteTombRow]) => {
      const remoteTomb = (remoteTombRow && !remoteTombRow.empty && remoteTombRow.value && typeof remoteTombRow.value === "object")
        ? remoteTombRow.value : {};
      const tomb = mergeTombstones(readTomb(key), remoteTomb);
      writeTomb(key, tomb);

      if (remote && !remote.empty && remote.value !== null) {
        const safe = safeValue(remote.value, initialRef.current);
        if (safe !== null) {
          const next = Array.isArray(safe) ? applyTombstones(safe, tomb) : safe;
          setVal(next);
        }
      }
      // Carregou (com ou sem dados): a partir daqui as gravações são legítimas.
      hydratedRef.current = true;
    }).catch(() => {});
  }, [key]);

  useEffect(() => {
    pull();
    const onFocus = () => { flushQueue(); pull(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [pull]);

  const set = useCallback((v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      const ts = new Date().toISOString();

      // Antes de carregar os dados reais, só atualiza em memória — NUNCA grava
      // na nuvem (evita que valores-padrão/migrações sobrescrevam o real).
      if (!hydratedRef.current) return next;

      // Registra exclusões/recriações para que as exclusões propaguem
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

      // Grava direto na nuvem (sem guardar o dado no navegador)
      pushToCloud(key, next);
      return next;
    });
  }, [key]);

  return [val, set];
};

export default useLS;
