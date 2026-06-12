// Testes da lógica pura de sincronização (merge + exclusões/tombstones).
// Roda com: node scripts/sync-merge.test.mjs
import {
  identityKey, mergeEntityArray, diffIdentity,
  applyTombstones, applyDelta, mergeTombstones,
} from "../src/hooks/syncMerge.js";

let fail = 0;
function ok(cond, msg) {
  if (!cond) { console.error("✗ " + msg); fail++; }
  else console.log("✓ " + msg);
}
const ids = arr => arr.map(identityKey).sort();

// 1. Merge mantém usuários novos de ambos os lados
{
  const local = [{ id: "u1", name: "A" }, { id: "u10", name: "Waldenir" }];
  const remote = [{ id: "u1", name: "A" }, { id: "u2", name: "B" }];
  const m = mergeEntityArray(local, remote);
  ok(JSON.stringify(ids(m)) === JSON.stringify(["u1", "u10", "u2"]), "merge une novos dos dois lados");
}

// 2. diffIdentity detecta exclusão e criação
{
  const prev = [{ id: "u1" }, { id: "u2" }];
  const next = [{ id: "u1" }, { id: "u3" }];
  const d = diffIdentity(prev, next);
  ok(d.removed.join() === "u2", "diff detecta exclusão (u2)");
  ok(d.added.join() === "u3", "diff detecta criação (u3)");
}

// 3. Tombstone faz exclusão "grudar" no merge (não volta)
{
  const local = [{ id: "u1" }];                 // dispositivo A apagou u2
  const remote = [{ id: "u1" }, { id: "u2" }];  // dispositivo B ainda tem u2
  const tomb = { u2: "2026-06-12T00:00:00Z" };
  const merged = mergeEntityArray(local, remote);
  const finalArr = applyTombstones(merged, tomb);
  ok(JSON.stringify(ids(finalArr)) === JSON.stringify(["u1"]), "item excluído NÃO volta após sync");
}

// 4. Recriar um item limpa seu tombstone
{
  const tomb0 = { u2: "2026-06-12T00:00:00Z" };
  const { tomb, changed } = applyDelta(tomb0, { removed: [], added: ["u2"] }, "2026-06-12T01:00:00Z");
  ok(changed && !("u2" in tomb), "recriação limpa o tombstone");
}

// 5. mergeTombstones mantém o timestamp mais recente
{
  const a = { u2: "2026-06-12T00:00:00Z" };
  const b = { u2: "2026-06-12T05:00:00Z", u9: "2026-06-11T00:00:00Z" };
  const m = mergeTombstones(a, b);
  ok(m.u2 === "2026-06-12T05:00:00Z" && m.u9, "tombstone mais recente vence e une chaves");
}

// 6. Objetos puros (config) não são afetados
{
  ok(mergeEntityArray({ a: 1 }, { b: 2 }) === null, "objeto não-array ignora merge de entidades");
  ok(applyTombstones({ a: 1 }, { x: "t" }).a === 1, "applyTombstones não mexe em objeto puro");
}

if (fail) { console.error(`\n${fail} teste(s) falharam.`); process.exit(1); }
console.log("\nsync-merge tests OK");
