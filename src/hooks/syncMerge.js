// src/hooks/syncMerge.js — lógica pura de merge e exclusão (sem dependências).
// Mantida separada do useLS para poder ser testada de forma isolada (sem React
// nem Supabase). Toda a regra de "como local e nuvem se combinam" vive aqui.

// Identidade estável de uma entidade dentro de um array (usuário, item, OS...).
export function identityKey(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  return item.id || item.login || item.code || item.num || item.os || null;
}

// Une dois arrays de entidades por identidade (local sobrescreve campos do
// remoto para a mesma chave). Retorna null se não forem arrays de objetos.
export function mergeEntityArray(localValue, remoteValue) {
  if (!Array.isArray(localValue) || !Array.isArray(remoteValue)) return null;
  const allObjects = [...localValue, ...remoteValue].every(
    item => item && typeof item === "object" && !Array.isArray(item)
  );
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

// Compara o array anterior com o novo e devolve as identidades que saíram
// (foram excluídas) e as que entraram (foram criadas/recriadas).
export function diffIdentity(prevArr, nextArr) {
  const removed = [];
  const added = [];
  if (!Array.isArray(prevArr) || !Array.isArray(nextArr)) return { removed, added };
  const prevKeys = new Set(prevArr.map(identityKey).filter(Boolean).map(String));
  const nextKeys = new Set(nextArr.map(identityKey).filter(Boolean).map(String));
  for (const k of prevKeys) if (!nextKeys.has(k)) removed.push(k);
  for (const k of nextKeys) if (!prevKeys.has(k)) added.push(k);
  return { removed, added };
}

// Aplica a regra de exclusão: remove do array qualquer entidade cuja identidade
// esteja marcada como excluída (tombstone). Itens recriados já tiveram seu
// tombstone limpo em diffIdentity/applyDelta, então sobrevivem.
export function applyTombstones(arr, tomb) {
  if (!Array.isArray(arr) || !tomb || typeof tomb !== "object") return arr;
  return arr.filter(item => {
    const key = identityKey(item);
    return !(key && Object.prototype.hasOwnProperty.call(tomb, String(key)));
  });
}

// Atualiza o mapa de tombstones local: marca excluídos, limpa recriados.
export function applyDelta(tomb, { removed = [], added = [] }, ts) {
  const next = { ...(tomb || {}) };
  let changed = false;
  for (const id of removed) {
    if (next[String(id)] !== ts) { next[String(id)] = ts; changed = true; }
  }
  for (const id of added) {
    if (Object.prototype.hasOwnProperty.call(next, String(id))) {
      delete next[String(id)];
      changed = true;
    }
  }
  return { tomb: next, changed };
}

// Combina dois mapas de tombstone vindos de dispositivos diferentes; mantém o
// timestamp mais recente para cada identidade.
export function mergeTombstones(localTomb, remoteTomb) {
  const out = { ...(localTomb || {}) };
  const remote = remoteTomb || {};
  for (const id of Object.keys(remote)) {
    if (!out[id] || String(remote[id]) > String(out[id])) out[id] = remote[id];
  }
  return out;
}
