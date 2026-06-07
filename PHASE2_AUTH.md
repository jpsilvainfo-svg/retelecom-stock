# 🔐 PHASE 2 — Login/Auth Extraction

**Data Iniciada:** 2026-06-07  
**Responsável:** Codex  
**Timeline Estimada:** 1-2 horas  
**Branch:** `refactor/phase2-auth`  
**Status:** 🔄 EM EXECUÇÃO

---

## 🎯 Objetivo

Extrair toda a lógica de autenticação e session management de `App.jsx` para um módulo isolado e reutilizável.

---

## 📋 O Que Será Extraído

### **1. `src/modules/auth/LoginForm.jsx`**
Local atual em App.jsx: Seção de login/formulário
- Formulário de login
- Validações
- Envio de dados
- Feedback visual (loading, erro, sucesso)

### **2. `src/modules/auth/SessionManager.js`**
Local atual em App.jsx: Lógica de sessão
- Autenticação de usuário
- Geração/verificação de hash de senha (PBKDF2)
- Controle de sessão (TTL = 8 horas)
- Persistência em localStorage via useLS hook

### **3. `src/modules/auth/AuthContext.js`** (novo)
Será criado para:
- Compartilhar estado de autenticação
- Funções de login/logout globais
- Verificação de autenticação

### **4. `src/hooks/useAuth.js`** (novo)
Hook customizado para:
- Acessar dados de autenticação
- Funções de login/logout
- Estado de loading

---

## 🔍 Código a Extrair (Referência)

### **De App.jsx — Funções de Autenticação:**

```javascript
// Sessão (8 horas)
const SESSION_TTL = 8 * 60 * 60 * 1000;

// Verificação de hash de senha
async function verificarSenha(senha, hash) {
  // ... PBKDF2 + SHA-256
}

// Autenticação
async function autenticar(email, senha) {
  // ... lógica de login
}

// Logout
function logout() {
  // ... limpar sessão
}
```

---

## 📝 Passo a Passo

### **Passo 1: Criar estrutura de diretórios**
```bash
mkdir -p src/modules/auth
```

### **Passo 2: Criar `SessionManager.js`**
Extrair:
- Função `verificarSenha()`
- Função `hashSenha()`
- Lógica de SESSION_TTL
- Funções de validação

### **Passo 3: Criar `LoginForm.jsx`**
Extrair:
- Componente de formulário de login
- Estados de formulário
- Validações
- Chamadas à API de autenticação

### **Passo 4: Criar `AuthContext.js`**
Novo arquivo para:
- Context de autenticação global
- Provider com estado de usuário
- Funções login/logout

### **Passo 5: Criar `useAuth.js` Hook**
Em `src/hooks/`:
- Hook customizado para acessar auth context
- Retorna: user, login, logout, isLoading, isAuthenticated

### **Passo 6: Atualizar App.jsx**
- Remover código de auth
- Importar LoginForm
- Importar useAuth hook
- Usar AuthProvider wrapper

### **Passo 7: Testes Locais**
```bash
npm run build
npm run lint
# Testar login local
```

### **Passo 8: Commits**
```bash
git add src/modules/auth/SessionManager.js
git commit -m "refactor(phase2): extract SessionManager"

git add src/modules/auth/LoginForm.jsx
git commit -m "refactor(phase2): extract LoginForm component"

git add src/modules/auth/AuthContext.js src/hooks/useAuth.js
git commit -m "refactor(phase2): add AuthContext and useAuth hook"

git add src/App.jsx
git commit -m "refactor(phase2): update App.jsx to use new auth modules"
```

---

## ✅ Checklist

- [ ] Criar estrutura de diretórios (`src/modules/auth/`)
- [ ] Extrair `SessionManager.js`
- [ ] Extrair `LoginForm.jsx`
- [ ] Criar `AuthContext.js`
- [ ] Criar `useAuth.js` hook
- [ ] Atualizar `App.jsx`
- [ ] Rodar `npm run build`
- [ ] Rodar `npm run lint`
- [ ] Testes locais funcionando
- [ ] Commits realizados
- [ ] Push para GitHub

---

## 📊 Métricas Esperadas

| Métrica | Valor |
|---------|-------|
| **Arquivos criados** | 4 |
| **Linhas extraídas de App.jsx** | 150-200 |
| **Novos arquivos** | ~300 linhas |
| **Lint errors** | 0 |
| **Build success** | ✅ |

---

## 🚨 Pontos de Atenção

1. **PBKDF2 + SHA-256:** Mantém lógica nativa do browser
2. **localStorage:** Ainda usa `useLS` hook existente
3. **SessionContext:** Deve estar disponível para toda app
4. **Imports:** Garantir que App.jsx imposta AuthProvider no root

---

## 🎬 Próximos Passos

1. **Codex:** Executar conforme checklist acima
2. **Claude Code:** Aguardar commits e fazer review
3. **Telegram:** Receber notificações de progresso
4. **Usuário:** Autorizar Phase 3 quando Phase 2 terminar

---

## 📍 Phase Anterior

✅ Phase 1: Constants, Colors, Formatters, UI Components, Navigation  
**↓ Você está aqui ↓**  
🔄 Phase 2: Login/Auth (Em progresso)  
⏳ Phase 3: Diagnóstico/Customização  
⏳ Phase 4: Operacional (OS, Solicitações, Devoluções)  
⏳ Phase 5: Estoque (Base, Kit, NF, Saída)  
⏳ Phase 6: Grandes (Ponto, Frota, Relatórios)  

---

**Status:** 🔄 **PRONTA PARA EXECUÇÃO**

---

**Data de Criação:** 2026-06-07  
**Versão:** 1.0
