# 📦 GUIA DE INSTALAÇÃO - NODE.JS

**Objetivo:** Instalar Node.js para executar npm run dev e npm run sync:users  
**Data:** 07/06/2026

---

## ⚠️ SITUAÇÃO ATUAL

```
❌ Node.js NÃO está instalado no seu computador
❌ npm não está disponível
✅ Código está 100% pronto (apenas aguarda Node.js)
```

---

## 📥 INSTALAÇÃO DO NODE.JS

### Passo 1: Baixar Node.js

1. Acesse: **https://nodejs.org/**
2. Clique em: **"LTS" (Long Term Support)** - RECOMENDADO
3. Isso vai baixar o instalador `.msi` (Windows)

**Versão recomendada:** 20.x LTS ou superior

### Passo 2: Executar Instalador

1. Localize o arquivo baixado (ex: `node-v20.x.x-x64.msi`)
2. Clique duas vezes para abrir
3. Siga o assistente de instalação
4. Aceite os termos de licença
5. Escolha local de instalação (padrão é OK)
6. **IMPORTANTE:** Certifique-se que a opção "Add to PATH" está selecionada
7. Clique "Install"

### Passo 3: Reiniciar o Computador (Recomendado)

Para garantir que o PATH seja atualizado corretamente.

---

## ✅ VERIFICAR INSTALAÇÃO

Abra PowerShell ou CMD e execute:

```powershell
node --version
npm --version
```

**Resultado esperado:**
```
v20.x.x
9.x.x
```

Se não funcionar, reinicie o computador e tente novamente.

---

## 🚀 EXECUTAR SINCRONIZAÇÃO APÓS INSTALAR

### Terminal 1: Iniciar Servidor

```bash
cd C:\Users\Dell\OneDrive\Desktop\StockTel
npm run dev
```

Aguarde a mensagem:
```
VITE v8.0.12  ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Deixe este terminal aberto!**

### Terminal 2: Iniciar Monitor de Sincronização

Abra **outro** PowerShell/CMD:

```bash
cd C:\Users\Dell\OneDrive\Desktop\StockTel
npm run sync:users
```

Você verá:
```
[HH:MM:SS] START Monitorador de sincronização iniciado
[HH:MM:SS] 📁 Monitorando: usuarios_atualizado.json
[HH:MM:SS] 👥 12 usuários encontrados
[HH:MM:SS] ✅ Monitor aguardando mudanças...
```

**Deixe este terminal aberto!**

---

## 🔄 Sincronização Acontece Automaticamente

Quando você **salvar** o arquivo `usuarios_atualizado.json`, o monitor automaticamente:

1. Detecta a mudança
2. Identifica novos usuários
3. Sincroniza com Supabase
4. Mostra:

```
[HH:MM:SS] 🔄 MUDANÇA Detectado arquivo alterado
[HH:MM:SS] ✅ SYNC 1 novo(s) usuário(s) adicionado(s)
[HH:MM:SS] 👤 waldenir (Waldenir Marques Pereira)
```

---

## 🧪 Teste de Login

Após sincronização bem-sucedida:

1. Acesse: **http://localhost:5173**
2. Faça login como Waldenir:
   - Login: `waldenir`
   - Senha: `waldenir@2026!`
3. Sistema pedirá para trocar senha
4. Defina nova senha
5. ✅ Waldenir terá acesso ao sistema!

---

## ❌ Se não Funcionar

### Problema: "npm: command not found"

**Solução:**
1. Verifique se Node.js foi instalado
   ```bash
   node --version
   ```
2. Se não funcionar, reinstale Node.js
3. Reinicie o computador APÓS instalar
4. Tente novamente

### Problema: "VITE port 5173 already in use"

**Solução:**
1. Feche outros projetos Vite que estão rodando
2. Ou use outra porta:
   ```bash
   npm run dev -- --port 3000
   ```

### Problema: "Arquivo usuarios_atualizado.json não encontrado"

**Solução:**
1. Verifique se você está no diretório correto:
   ```bash
   cd C:\Users\Dell\OneDrive\Desktop\StockTel
   dir usuarios_atualizado.json
   ```
2. Se não encontrar, execute:
   ```bash
   git status
   ```
   E procure pelo arquivo

---

## 📋 CHECKLIST

- [ ] Node.js baixado
- [ ] Node.js instalado
- [ ] "Add to PATH" foi selecionado durante instalação
- [ ] Computador reiniciado
- [ ] `node --version` funciona
- [ ] `npm --version` funciona
- [ ] Terminal 1: `npm run dev` iniciado
- [ ] Terminal 2: `npm run sync:users` iniciado
- [ ] Monitor mostra: "aguardando mudanças"
- [ ] Waldenir foi sincronizado
- [ ] Login de Waldenir funciona
- [ ] Senha foi alterada no 1º login

---

## 🎯 RESUMO

```
1. INSTALAR NODE.JS
   └─ https://nodejs.org/ (LTS)

2. ABRIR TERMINAL 1
   └─ npm run dev

3. ABRIR TERMINAL 2
   └─ npm run sync:users

4. AGUARDAR SINCRONIZAÇÃO AUTOMÁTICA
   └─ Monitor detectará mudanças

5. TESTAR LOGIN
   └─ waldenir / waldenir@2026!

6. TROCAR SENHA
   └─ Sistema solicitará na 1ª vez

7. ✅ SUCESSO!
   └─ Waldenir está no sistema
```

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verifique os logs no terminal
2. Leia o arquivo `TESTE_SINCRONIZACAO.md`
3. Verifique se todos os arquivos existem:
   - `usuarios_atualizado.json` ✅
   - `api/sync-users.js` ✅
   - `scripts/auto-sync-watch.mjs` ✅
   - `package.json` ✅

---

**Guia Criado:** 07/06/2026  
**Versão:** 1.0  
**Status:** ✅ Pronto para usar após instalar Node.js

