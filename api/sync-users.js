// sync-users.js — Sincronização automática de usuários com Supabase
// Ativa a cada novo cadastro de usuário para manter banco de dados sincronizado

import fs from "fs";
import path from "path";

function nowBR() {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function isAuthorized(req) {
  const secret = process.env.SYNC_USERS_SECRET;
  if (!secret) return true;
  const provided = req.headers["x-sync-key"] || req.query?.key || req.body?.key;
  return String(provided || "") === String(secret);
}

/**
 * Sincroniza usuários locais com Supabase
 * Suporta dois modos:
 * - "sync": sincroniza apenas novos usuários
 * - "full": sincroniza todos os usuários (sobrescreve)
 */
async function syncUsers(mode = "sync") {
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.VITE_SUPABASE_KEY;

  if (!supaUrl || !supaKey) {
    throw new Error("Supabase nao configurado no ambiente (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)");
  }

  // Tenta ler usuários de múltiplas fontes
  let localUsers = [];
  const possiblePaths = [
    path.join(process.cwd(), "usuarios_atualizado.json"),
    path.join(process.cwd(), "Ctemp_users.json"),
    path.join(process.cwd(), "public", "usuarios.json"),
  ];

  for (const filepath of possiblePaths) {
    try {
      if (fs.existsSync(filepath)) {
        const content = fs.readFileSync(filepath, "utf-8");
        const parsed = JSON.parse(content);
        localUsers = parsed.value || parsed;
        break;
      }
    } catch (e) {
      console.warn(`[sync-users] Erro ao ler ${filepath}:`, e.message);
    }
  }

  if (!localUsers || localUsers.length === 0) {
    throw new Error("Nenhum arquivo de usuários encontrado ou arquivo vazio");
  }

  // ── Lê usuários atuais do Supabase ──────────────────────────────────────
  const supaResponse = await fetch(
    `${supaUrl}/rest/v1/re_data?select=value&key=eq.re_users`,
    {
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
      },
    }
  );

  if (!supaResponse.ok) {
    throw new Error(`Falha ao ler re_users do Supabase: ${supaResponse.status}`);
  }

  const supaData = await supaResponse.json();
  const supaUsers = supaData?.[0]?.value || [];

  // ── Determina o que sincronizar ────────────────────────────────────────
  let usersToSync = localUsers;
  let syncReport = {
    mode,
    timestamp: nowBR(),
    iso: new Date().toISOString(),
    local_count: localUsers.length,
    supa_count_before: supaUsers.length,
    new_users: [],
    updated_users: [],
    total_synced: 0,
  };

  if (mode === "sync") {
    // Sincronização incremental: apenas novos
    const supaIds = new Set(supaUsers.map(u => u.id));
    const newUsers = localUsers.filter(u => !supaIds.has(u.id));

    if (newUsers.length > 0) {
      syncReport.new_users = newUsers.map(u => ({ id: u.id, login: u.login, name: u.name }));
      usersToSync = [...supaUsers, ...newUsers];
    } else {
      usersToSync = supaUsers;
    }
    syncReport.total_synced = newUsers.length;
  } else if (mode === "full") {
    // Sincronização completa
    syncReport.updated_users = localUsers.map(u => ({ id: u.id, login: u.login, name: u.name }));
    usersToSync = localUsers;
    syncReport.total_synced = localUsers.length;
  }

  // ── Atualiza re_users no Supabase ──────────────────────────────────────
  const updateResponse = await fetch(
    `${supaUrl}/rest/v1/re_data?key=eq.re_users`,
    {
      method: "PATCH",
      headers: {
        apikey: supaKey,
        Authorization: `Bearer ${supaKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: usersToSync,
        updated_at: new Date().toISOString(),
      }),
    }
  );

  if (!updateResponse.ok) {
    throw new Error(`Falha ao atualizar re_users: ${updateResponse.status}`);
  }

  syncReport.supa_count_after = usersToSync.length;
  syncReport.ok = true;

  return syncReport;
}

/**
 * Handler para POST /api/sync-users
 * Sincroniza usuários automaticamente
 */
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.json({
      ok: true,
      service: "StockTel user sync",
      description: "Sincroniza usuários locais com Supabase automaticamente",
      usage: "POST /api/sync-users?mode=sync ou mode=full",
      modes: {
        sync: "Apenas novos usuários (padrão)",
        full: "Todos os usuários (sobrescreve)",
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: "Sync nao autorizado" });
  }

  try {
    const mode = req.query?.mode || req.body?.mode || "sync";
    if (!["sync", "full"].includes(mode)) {
      return res.status(400).json({ ok: false, error: "Mode invalido: use 'sync' ou 'full'" });
    }

    const report = await syncUsers(mode);
    return res.json(report);
  } catch (error) {
    console.error("[sync-users] Erro:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
