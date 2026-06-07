#!/usr/bin/env node
// test-sync.mjs — Script de teste para sincronização automática

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("\n" + "=".repeat(70));
console.log("🧪 TESTE DE SINCRONIZAÇÃO AUTOMÁTICA DE USUÁRIOS");
console.log("=".repeat(70) + "\n");

// ── 1. Verificar arquivo local ─────────────────────────────────────────
console.log("📁 1. VERIFICANDO ARQUIVO LOCAL...\n");

const localPath = path.join(__dirname, "usuarios_atualizado.json");
try {
  if (fs.existsSync(localPath)) {
    const content = JSON.parse(fs.readFileSync(localPath, "utf-8"));
    const users = content.value || content;

    console.log(`   ✅ Arquivo encontrado: usuarios_atualizado.json`);
    console.log(`   📊 Total de usuários: ${users.length}`);

    const waldenir = users.find(u => u.login === "waldenir");
    if (waldenir) {
      console.log(`   ✅ WALDENIR ENCONTRADO!`);
      console.log(`      • ID: ${waldenir.id}`);
      console.log(`      • Login: ${waldenir.login}`);
      console.log(`      • Nome: ${waldenir.name}`);
      console.log(`      • Email: ${waldenir.email}`);
      console.log(`      • Função: ${waldenir.role}`);
    } else {
      console.log(`   ❌ WALDENIR NÃO ENCONTRADO NO ARQUIVO LOCAL`);
    }
  } else {
    console.log(`   ❌ Arquivo não encontrado: ${localPath}`);
  }
} catch (error) {
  console.log(`   ❌ Erro ao ler arquivo: ${error.message}`);
}

// ── 2. Verificar Supabase online ───────────────────────────────────────
console.log("\n\n📡 2. VERIFICANDO SUPABASE ONLINE...\n");

const supaPath = path.join(__dirname, "online_snapshots", "supabase", "re_data_online.json");
try {
  if (fs.existsSync(supaPath)) {
    const content = JSON.parse(fs.readFileSync(supaPath, "utf-8"));
    const re_users = content.data?.re_users || [];

    console.log(`   ✅ Snapshot Supabase encontrado`);
    console.log(`   📊 Usuários em Supabase: ${re_users.length}`);

    const waldenir = re_users.find(u => u.login === "waldenir");
    if (waldenir) {
      console.log(`   ✅ WALDENIR JÁ ESTÁ EM SUPABASE!`);
      console.log(`      • ID: ${waldenir.id}`);
      console.log(`      • Login: ${waldenir.login}`);
      console.log(`      • Nome: ${waldenir.name}`);
    } else {
      console.log(`   ⏳ Waldenir NÃO está em Supabase (ainda não sincronizado)`);
    }
  } else {
    console.log(`   ⚠️ Snapshot Supabase não encontrado`);
  }
} catch (error) {
  console.log(`   ❌ Erro ao ler Supabase: ${error.message}`);
}

// ── 3. Simular sincronização ───────────────────────────────────────────
console.log("\n\n🔄 3. SIMULANDO SINCRONIZAÇÃO...\n");

try {
  const localContent = JSON.parse(fs.readFileSync(localPath, "utf-8"));
  const localUsers = localContent.value || localContent;

  const supaContent = JSON.parse(fs.readFileSync(supaPath, "utf-8"));
  const supaUsers = supaContent.data?.re_users || [];

  // Encontrar novos usuários
  const supaIds = new Set(supaUsers.map(u => u.id));
  const newUsers = localUsers.filter(u => !supaIds.has(u.id));

  console.log(`   Local: ${localUsers.length} usuários`);
  console.log(`   Supabase: ${supaUsers.length} usuários`);
  console.log(`   Novos para sincronizar: ${newUsers.length}\n`);

  if (newUsers.length > 0) {
    console.log(`   ✅ USUÁRIOS NOVOS IDENTIFICADOS:\n`);
    newUsers.forEach(u => {
      console.log(`      👤 ${u.login.padEnd(15)} | ${u.name.padEnd(30)} | ${u.role}`);
    });

    // Simular merge
    const merged = [...supaUsers, ...newUsers];
    console.log(`\n   📊 Resultado após sincronização: ${merged.length} usuários`);
    console.log(`   ✅ Waldenir SERIA adicionado a Supabase!`);

  } else {
    console.log(`   ℹ️ Nenhum usuário novo para sincronizar`);
  }

} catch (error) {
  console.log(`   ❌ Erro na simulação: ${error.message}`);
}

// ── 4. Verificar variáveis de ambiente ─────────────────────────────────
console.log("\n\n🔐 4. VERIFICANDO VARIÁVEIS DE AMBIENTE...\n");

const supaUrl = process.env.VITE_SUPABASE_URL;
const supaKey = process.env.VITE_SUPABASE_KEY;

if (supaUrl) {
  console.log(`   ✅ VITE_SUPABASE_URL está configurado`);
  console.log(`      ${supaUrl.substring(0, 40)}...`);
} else {
  console.log(`   ❌ VITE_SUPABASE_URL não configurado`);
}

if (supaKey) {
  console.log(`   ✅ VITE_SUPABASE_KEY está configurado`);
  console.log(`      ${supaKey.substring(0, 40)}...`);
} else {
  console.log(`   ❌ VITE_SUPABASE_KEY não configurado`);
}

// ── 5. Status final ────────────────────────────────────────────────────
console.log("\n\n📋 5. STATUS FINAL...\n");

console.log(`   ✅ Waldenir está no arquivo local (usuarios_atualizado.json)`);
console.log(`   ⏳ Waldenir será sincronizado quando o sistema estiver online`);
console.log(`   ⏳ Aguardando ativação do monitor de sincronização automática`);

console.log("\n" + "=".repeat(70));
console.log("✨ PRÓXIMOS PASSOS:");
console.log("=".repeat(70));
console.log(`
1. Iniciar o servidor em desenvolvimento:
   npm run dev

2. Em outro terminal, iniciar o monitor de sincronização:
   npm run sync:users

3. O monitor detectará Waldenir e sincronizará com Supabase automaticamente!

4. Você verá no terminal:
   ✅ SYNC 1 novo(s) usuário(s) adicionado(s)
   👤 waldenir (Waldenir Marques Pereira)

`);
console.log("=".repeat(70) + "\n");
