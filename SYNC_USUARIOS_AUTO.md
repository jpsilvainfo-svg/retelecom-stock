# 🔄 SINCRONIZAÇÃO AUTOMÁTICA DE USUÁRIOS

**Versão:** 1.0  
**Data:** 07/06/2026  
**Objetivo:** Sincronizar automaticamente novos usuários cadastrados com Supabase

---

## 📋 RESUMO

O StockTel agora **sincroniza automaticamente** todos os novos usuários cadastrados com Supabase. Quando você adiciona um novo usuário ao arquivo local (`usuarios_atualizado.json`), o sistema:

1. ✅ Detecta a mudança no arquivo
2. ✅ Identifica novos usuários
3. ✅ Sincroniza com Supabase automaticamente
4. ✅ Notifica via Telegram (opcional)

---

## 🚀 COMO USAR

### 1️⃣ **Monitor em Tempo Real (Desenvolvimento)**

Inicie o monitor de sincronização automática:

```bash
npm run sync:users
```

Isso iniciará um processo que monitora o arquivo de usuários a cada 3 segundos e sincroniza automaticamente quando houver mudanças.

**Output esperado:**
```
[10:30:45] START Monitorador de sincronização de usuários iniciado
[10:30:45] 📁 Monitorando: usuarios_atualizado.json
[10:30:45] 👥 12 usuários encontrados
[10:30:45] ✅ Monitor aguardando mudanças...

[10:35:20] 🔄 MUDANÇA Detectado arquivo alterado
[10:35:21] ✅ SYNC 1 novo(s) usuário(s) adicionado(s)
[10:35:21] 👤 waldenir (Waldenir Marques Pereira)
```

---

### 2️⃣ **Sincronização Manual (Uma Única Vez)**

Se preferir sincronizar uma única vez sem monitoramento contínuo:

```bash
# Apenas novos usuários
npm run sync:manual

# Todos os usuários (sobrescreve)
npm run sync:full
```

Ou via curl direto:

```bash
# Modo incremental (apenas novos)
curl -X POST http://localhost:3000/api/sync-users?mode=sync

# Modo completo (todos)
curl -X POST http://localhost:3000/api/sync-users?mode=full
```

---

### 3️⃣ **Sincronização Automática em Produção**

Em produção (Vercel), os endpoints estão sempre disponíveis:

```bash
# Sincronizar novos usuários
curl -X POST https://retelecom-stock.vercel.app/api/sync-users?mode=sync \
  -H "x-sync-key: $SYNC_USERS_SECRET"

# Sincronização completa
curl -X POST https://retelecom-stock.vercel.app/api/sync-users?mode=full \
  -H "x-sync-key: $SYNC_USERS_SECRET"
```

---

## 📁 ARQUIVOS ENVOLVIDOS

### Novos Arquivos Criados:

| Arquivo | Descrição |
|---------|-----------|
| `api/sync-users.js` | Endpoint para sincronização manual |
| `api/auto-sync-users.js` | Handler para monitoramento automático |
| `scripts/auto-sync-watch.mjs` | Script de monitoramento (CLI) |
| `SYNC_USUARIOS_AUTO.md` | Esta documentação |

### Arquivos Modificados:

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Adicionados scripts `sync:users`, `sync:manual`, `sync:full` |

---

## 🔧 CONFIGURAÇÃO

### Variáveis de Ambiente Necessárias:

```bash
# Supabase (obrigatório para sincronização)
VITE_SUPABASE_URL=https://enwlwudxtxpebxqfzkku.supabase.co
VITE_SUPABASE_KEY=eyJhbGci...

# Sincronização (opcional - apenas para autorização)
SYNC_USERS_SECRET=seu-token-secreto-opcional
```

---

## ⚡ MODOS DE SINCRONIZAÇÃO

### Modo `sync` (Padrão)

**Comportamento:** Apenas novos usuários são sincronizados

```
Local:    [u0, u1, u2, u3, u10]  ← u10 é novo
Supabase: [u0, u1, u2, u3]       ← sem u10 ainda

Resultado: [u0, u1, u2, u3, u10]  ← u10 adicionado
```

**Quando usar:** Sempre (padrão recomendado)

---

### Modo `full` (Sobrescrever)

**Comportamento:** Todos os usuários locais substitui os do Supabase

```
Local:    [u0, u1, u2, u3, u10]
Supabase: [u0, u1, u2, u3]

Resultado: [u0, u1, u2, u3, u10]  ← todos substituem
```

**Quando usar:** Recuperação de backup ou sincronização completa

---

## 📊 EXEMPLO: ADICIONAR WALDENIR

### Passo 1: Editar arquivo local
```json
// usuarios_atualizado.json
{
  "value": [
    // ... outros usuários ...
    {
      "id": "u10",
      "login": "waldenir",
      "name": "Waldenir Marques Pereira",
      "pass": "waldenir@2026!",
      "email": "waldenir@stocktel.com.br",
      "role": "admin",
      // ... outros campos ...
    }
  ]
}
```

### Passo 2: Salvar arquivo

### Passo 3: Sistema detecta e sincroniza automaticamente

```
[10:35:20] 🔄 MUDANÇA Detectado arquivo alterado
[10:35:21] ✅ SYNC 1 novo(s) usuário(s) adicionado(s)
[10:35:21] 👤 waldenir (Waldenir Marques Pereira)
```

### Passo 4: Waldenir já está em Supabase!

---

## 🔍 MONITORAMENTO

### Verificar Status de Sincronização

```bash
curl http://localhost:3000/api/auto-sync-users
```

**Resposta:**
```json
{
  "ok": true,
  "service": "StockTel auto sync monitor",
  "stats": {
    "totalSyncs": 5,
    "successfulSyncs": 5,
    "failedSyncs": 0,
    "usersAdded": 3,
    "lastError": null,
    "lastSyncTime": "2026-06-07T13:35:21.123Z",
    "isWatching": true
  }
}
```

### Iniciar Monitor via API

```bash
curl -X POST http://localhost:3000/api/auto-sync-users?action=start
```

### Parar Monitor

```bash
curl -X POST http://localhost:3000/api/auto-sync-users?action=stop
```

---

## ⚠️ NOTAS IMPORTANTES

### 1. Sincronização Incremental
- Apenas **novos usuários** são sincronizados
- Usuários existentes **não são modificados**
- Campos adicionados em usuários antigos também **não são sincronizados**

### 2. Conflitos
Se o mesmo usuário existe em duas versões diferentes:
- A versão do Supabase **prevalece**
- Novos usuários do arquivo local são **adicionados**

### 3. Segurança
- Use `SYNC_USERS_SECRET` para proteger endpoints em produção
- Senhas são sincronizadas junto com os dados
- Não sincronize arquivos com dados sensíveis não encryados

### 4. Retry Automático
- Falhas de conexão são retentadas automaticamente
- Máximo de 3 tentativas com backoff exponencial
- Erros são registrados em logs

---

## 🐛 TROUBLESHOOTING

### Erro: "Supabase nao configurado"

**Solução:** Certifique-se que as variáveis estão definidas:
```bash
export VITE_SUPABASE_URL=...
export VITE_SUPABASE_KEY=...
```

---

### Erro: "Arquivo de usuários vazio"

**Solução:** Verifique se o arquivo existe e contém dados válidos:
```bash
cat usuarios_atualizado.json
```

---

### Sincronização não está ocorrendo

**Causa:** Monitor pode ter parado
**Solução:** Reinicie com `npm run sync:users`

---

## 📝 CHANGELOG

### v1.0 (07/06/2026)
- ✅ Sincronização automática de usuários
- ✅ Monitor em tempo real com detecção de mudanças
- ✅ Modo incremental (sync) e completo (full)
- ✅ Retry automático com exponential backoff
- ✅ Endpoints de API para sincronização manual
- ✅ Scripts de CLI para desenvolvimento
- ✅ Documentação completa

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Waldenir está no banco de dados local
2. ⏳ Waldenir será sincronizado com Supabase automaticamente
3. ⏳ Waldenir pode fazer login no sistema
4. ⏳ Waldenir deve trocar senha na primeira tentativa

---

**Sistema de Sincronização Automática Ativado! 🚀**

Qualquer novo usuário cadastrado será sincronizado imediatamente com Supabase.
