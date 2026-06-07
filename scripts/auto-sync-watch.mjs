#!/usr/bin/env node
// auto-sync-watch.mjs — Script de monitoramento automático para sincronização de usuários
// Use: node scripts/auto-sync-watch.mjs

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const WATCH_INTERVAL = 3000; // 3 segundos
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

// ── Cores para output ─────────────────────────────────────────────────────
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(color, label, msg) {
  const ts = new Date().toLocaleTimeString("pt-BR");
  console.log(`${color}[${ts}] ${label}${colors.reset} ${msg}`);
}

function getFileHash(filepath) {
  if (!fs.existsSync(filepath)) return null;
  try {
    const content = fs.readFileSync(filepath, "utf-8");
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch (e) {
    return null;
  }
}

function readLocalUsers() {
  const possiblePaths = [
    path.join(PROJECT_ROOT, "usuarios_atualizado.json"),
    path.join(PROJECT_ROOT, "Ctemp_users.json"),
    path.join(PROJECT_ROOT, "public", "usuarios.json"),
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
      log(colors.yellow, "WARN", `Erro ao ler ${filepath}: ${e.message}`);
    }
  }

  return { users: [], filepath: null };
}

async function syncWithSupabase(users) {
  const supaUrl = process.env.VITE_SUPABASE_URL;
  const supaKey = process.env.VITE_SUPABASE_KEY;

  if (!supaUrl || !supaKey) {
    throw new Error("Supabase nao configurado (VITE_SUPABASE_URL, VITE_SUPABASE_KEY)");
  }

  // Lê usuários atuais
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

  // Identifica novos
  const supaIds = new Set(supaUsers.map(u => u.id));
  const newUsers = users.filter(u => !supaIds.has(u.id));

  if (newUsers.length === 0) {
    return {
      synced: false,
      reason: "Nenhum novo usuário",
      newCount: 0,
    };
  }

  // Sincroniza
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

async function performSync() {
  const { users } = readLocalUsers();

  if (!users || users.length === 0) {
    throw new Error("Arquivo de usuários vazio");
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await syncWithSupabase(users);

      if (result.synced) {
        log(colors.green, "✅ SYNC", `${result.newCount} novo(s) usuário(s) adicionado(s)`);
        result.newUsers.forEach(u => {
          log(colors.cyan, "  👤", `${u.login} (${u.name})`);
        });
      } else {
        log(colors.yellow, "ℹ️ INFO", result.reason);
      }

      return result;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        log(colors.yellow, "🔄 RETRY", `Tentativa ${attempt}/${MAX_RETRIES}: ${error.message}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
}

async function main() {
  log(colors.blue, "START", "Monitorador de sincronização de usuários iniciado");

  const { users, filepath } = readLocalUsers();

  if (!filepath) {
    log(colors.red, "ERROR", "Nenhum arquivo de usuários encontrado");
    process.exit(1);
  }

  log(colors.green, "📁", `Monitorando: ${path.relative(PROJECT_ROOT, filepath)}`);
  log(colors.green, "👥", `${users.length} usuários encontrados`);

  let lastHash = getFileHash(filepath);
  log(colors.green, "✅", "Monitor aguardando mudanças...\n");

  const watchInterval = setInterval(async () => {
    const newHash = getFileHash(filepath);

    if (newHash && newHash !== lastHash) {
      log(colors.bright + colors.yellow, "🔄 MUDANÇA", "Detectado arquivo alterado");
      lastHash = newHash;

      try {
        await performSync();
      } catch (error) {
        log(colors.red, "❌ ERROR", error.message);
      }
    }
  }, WATCH_INTERVAL);

  // Ctrl+C para parar
  process.on("SIGINT", () => {
    clearInterval(watchInterval);
    log(colors.yellow, "STOP", "Monitor parado pelo usuário");
    process.exit(0);
  });
}

main().catch(error => {
  log(colors.red, "FATAL", error.message);
  process.exit(1);
});
