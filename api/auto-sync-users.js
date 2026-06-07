// auto-sync-users.js — Monitor automático para sincronização de usuários
// Monitora arquivo local e sincroniza com Supabase automaticamente quando há mudanças

import fs from "fs";
import path from "path";
import crypto from "crypto";

const WATCH_INTERVAL = 5000; // 5 segundos
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

class UserAutoSync {
  constructor() {
    this.lastHash = null;
    this.isRunning = false;
    this.watching = false;
    this.syncAttempts = 0;
    this.lastSyncTime = null;
    this.stats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      usersAdded: 0,
      lastError: null,
    };
  }

  /**
   * Calcula hash do arquivo de usuários para detectar mudanças
   */
  getFileHash(filepath) {
    if (!fs.existsSync(filepath)) return null;
    try {
      const content = fs.readFileSync(filepath, "utf-8");
      return crypto.createHash("sha256").update(content).digest("hex");
    } catch (e) {
      return null;
    }
  }

  /**
   * Lê usuários do arquivo local
   */
  readLocalUsers() {
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
          return {
            users: parsed.value || parsed,
            filepath,
          };
        }
      } catch (e) {
        console.warn(`[auto-sync] Erro ao ler ${filepath}:`, e.message);
      }
    }

    return { users: [], filepath: null };
  }

  /**
   * Sincroniza com Supabase
   */
  async syncWithSupabase(users) {
    const supaUrl = process.env.VITE_SUPABASE_URL;
    const supaKey = process.env.VITE_SUPABASE_KEY;

    if (!supaUrl || !supaKey) {
      throw new Error("Supabase nao configurado");
    }

    // Lê usuários atuais do Supabase
    const getResponse = await fetch(
      `${supaUrl}/rest/v1/re_data?select=value&key=eq.re_users`,
      {
        headers: {
          apikey: supaKey,
          Authorization: `Bearer ${supaKey}`,
        },
      }
    );

    if (!getResponse.ok) {
      throw new Error(`Falha ao ler de Supabase: ${getResponse.status}`);
    }

    const getData = await getResponse.json();
    const supaUsers = getData?.[0]?.value || [];

    // Identifica novos usuários
    const supaIds = new Set(supaUsers.map(u => u.id));
    const newUsers = users.filter(u => !supaIds.has(u.id));

    if (newUsers.length === 0) {
      return {
        synced: false,
        reason: "Nenhum novo usuário para sincronizar",
        newCount: 0,
      };
    }

    // Sincroniza novos usuários
    const mergedUsers = [...supaUsers, ...newUsers];
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
          value: mergedUsers,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!updateResponse.ok) {
      throw new Error(`Falha ao atualizar Supabase: ${updateResponse.status}`);
    }

    return {
      synced: true,
      newUsers: newUsers.map(u => ({ id: u.id, login: u.login, name: u.name })),
      newCount: newUsers.length,
      totalCount: mergedUsers.length,
    };
  }

  /**
   * Executa sincronização com retry
   */
  async performSync() {
    const { users, filepath } = this.readLocalUsers();

    if (!users || users.length === 0) {
      console.warn("[auto-sync] Arquivo de usuários vazio ou não encontrado");
      return;
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.syncWithSupabase(users);

        this.stats.successfulSyncs++;
        this.stats.totalSyncs++;
        this.lastSyncTime = new Date().toISOString();

        if (result.synced) {
          this.stats.usersAdded += result.newCount;
          console.log(`[auto-sync] ✅ SINCRONIZADO: ${result.newCount} novo(s) usuário(s) adicionado(s)`);
          console.log(`[auto-sync] Usuários sincronizados:`, result.newUsers);
        } else {
          console.log(`[auto-sync] ℹ️ Nenhuma mudança: ${result.reason}`);
        }

        return result;
      } catch (error) {
        console.error(
          `[auto-sync] Tentativa ${attempt}/${MAX_RETRIES} falhou:`,
          error.message
        );

        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        } else {
          this.stats.failedSyncs++;
          this.stats.totalSyncs++;
          this.stats.lastError = error.message;
          throw error;
        }
      }
    }
  }

  /**
   * Monitora alterações no arquivo de usuários
   */
  async startWatching() {
    if (this.watching) return;
    this.watching = true;

    const { users, filepath } = this.readLocalUsers();
    if (!filepath) {
      console.warn("[auto-sync] Nenhum arquivo de usuários encontrado para monitorar");
      this.watching = false;
      return;
    }

    console.log(`[auto-sync] 👁️ Monitorando: ${filepath}`);
    this.lastHash = this.getFileHash(filepath);

    this.watchInterval = setInterval(async () => {
      const newHash = this.getFileHash(filepath);

      if (newHash && newHash !== this.lastHash) {
        console.log(`[auto-sync] 🔄 Mudança detectada no arquivo de usuários`);
        this.lastHash = newHash;

        try {
          await this.performSync();
        } catch (error) {
          console.error("[auto-sync] Erro durante sincronização:", error.message);
        }
      }
    }, WATCH_INTERVAL);

    console.log(`[auto-sync] Monitor iniciado (intervalo: ${WATCH_INTERVAL}ms)`);
  }

  /**
   * Para o monitoramento
   */
  stopWatching() {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
      this.watching = false;
      console.log("[auto-sync] Monitor parado");
    }
  }

  /**
   * Retorna estatísticas de sincronização
   */
  getStats() {
    return {
      ...this.stats,
      lastSyncTime: this.lastSyncTime,
      isWatching: this.watching,
    };
  }
}

// Instância global (para usar em servidor)
export const autoSync = new UserAutoSync();

/**
 * Handler para monitoramento manual (POST /api/auto-sync-users)
 */
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.json({
      ok: true,
      service: "StockTel auto sync monitor",
      description: "Sincroniza usuários automaticamente quando arquivo local muda",
      stats: autoSync.getStats(),
      actions: {
        start: "POST com action=start",
        stop: "POST com action=stop",
        sync: "POST com action=sync para sincronizar agora",
        stats: "GET para obter estatísticas",
      },
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Metodo nao permitido" });
  }

  const action = req.query?.action || req.body?.action || "start";

  try {
    if (action === "start") {
      await autoSync.startWatching();
      return res.json({ ok: true, action: "started", stats: autoSync.getStats() });
    } else if (action === "stop") {
      autoSync.stopWatching();
      return res.json({ ok: true, action: "stopped", stats: autoSync.getStats() });
    } else if (action === "sync") {
      const result = await autoSync.performSync();
      return res.json({ ok: true, action: "synced", result, stats: autoSync.getStats() });
    } else {
      return res.status(400).json({ ok: false, error: "Acao invalida" });
    }
  } catch (error) {
    console.error("[auto-sync-handler] Erro:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
