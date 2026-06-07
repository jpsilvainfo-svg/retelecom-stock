# 🔍 PHASE 3 — Diagnóstico/Customização Extraction

**Data Iniciada:** 2026-06-07  
**Responsável:** Codex  
**Timeline Estimada:** 1-2 horas  
**Branch:** `refactor/phase3-diag-custom`  
**Status:** 🔄 EM EXECUÇÃO

---

## 🎯 Objetivo

Extrair as features **ROOT_ONLY** (Diagnóstico e Customização) de App.jsx para módulos isolados, com lógica bem separada e reutilizável.

---

## 📋 O Que Será Extraído

### **1. `src/modules/diag/Diagnostico.jsx`**
Local atual em App.jsx: Seção de diagnóstico do sistema
- Verificação de conexão com Supabase (sbPing)
- Status do Service Worker
- Verificação de localStorage
- Verificação de permissões de notificação
- Diagnóstico de GitHub Actions
- Informações de versão e ambiente
- Performance metrics
- Botão para teste de integração

### **2. `src/modules/diag/SystemCheck.js`** (novo)
Funções de diagnóstico:
- `checkSupabaseConnection()` - testa conexão
- `checkServiceWorker()` - verifica SW status
- `checkLocalStorage()` - valida localStorage
- `checkNotifications()` - verifica permissões
- `checkGitHubActions()` - status de CI/CD
- `collectSystemInfo()` - coleta dados de ambiente

### **3. `src/modules/customize/Customize.jsx`**
Local atual em App.jsx: Seção de customização
- Seleção de tema (cores, tamanho de fonte)
- Configurações de layout
- Preferências de notificação
- Exportar configurações (JSON)
- Importar configurações (JSON)
- Reset para padrão
- Temas pré-configurados

### **4. `src/modules/customize/CustomizeSettings.js`** (novo)
Funções de customização:
- `getDefaultTheme()` - tema padrão
- `getThemes()` - lista de temas
- `applyTheme(theme)` - aplica tema
- `exportSettings(config)` - exporta JSON
- `importSettings(json)` - importa JSON
- `resetToDefault()` - reset de tudo

### **5. Atualizar `src/utils/constants.js`**
- Adicionar themes pré-configurados
- Adicionar diagnostic labels
- Adicionar configurações padrão

---

## 🔍 Código a Extrair (Referência)

### **De App.jsx — Diagnóstico:**
```javascript
// Diagnóstico do Sistema (ROOT_ONLY)
// Verificar:
// - Conexão Supabase (sbPing)
// - Service Worker status
// - localStorage access
// - Notification permissions
// - GitHub Actions status
// - Version info
// - Performance metrics
```

### **De App.jsx — Customização:**
```javascript
// Customizar Sistema (ROOT_ONLY)
// Controles:
// - Tema/cores
// - Tamanho de fonte
// - Layout (sidebar, mobile)
// - Notificações (on/off)
// - Export/Import de configs
// - Reset para padrão
```

---

## 📝 Passo a Passo

### **Passo 1: Criar estrutura de diretórios**
```bash
mkdir -p src/modules/diag
mkdir -p src/modules/customize
```

### **Passo 2: Criar `SystemCheck.js`**
Extrair:
- Função `checkSupabaseConnection()`
- Função `checkServiceWorker()`
- Função `checkLocalStorage()`
- Função `checkNotifications()`
- Função `checkGitHubActions()`
- Função `collectSystemInfo()`

### **Passo 3: Criar `Diagnostico.jsx`**
Extrair:
- Componente de renderização
- Usa SystemCheck.js para dados
- Tabela com status de tudo
- Botões para ações (test, export logs, etc)

### **Passo 4: Criar `CustomizeSettings.js`**
Extrair:
- Temas pré-configurados
- Funções de apply/save/load
- Export/Import JSON
- Reset to default

### **Passo 5: Criar `Customize.jsx`**
Extrair:
- Componente de renderização
- Controles de tema/font/layout
- Usa CustomizeSettings.js para lógica
- Botões export/import/reset

### **Passo 6: Atualizar constants.js**
- Adicionar THEMES
- Adicionar DIAGNOSTIC_CHECKS
- Adicionar DEFAULT_SETTINGS

### **Passo 7: Atualizar App.jsx**
- Remover código de diag (linhas ~XX-XX)
- Remover código de custom (linhas ~XX-XX)
- Importar Diagnostico
- Importar Customize
- Usar no lugar certo

### **Passo 8: Testes Locais**
```bash
npm run build
npm run lint
npm run test
# Testar diagnóstico (ROOT_ONLY)
# Testar customização (ROOT_ONLY)
```

### **Passo 9: Commits**
```bash
git add src/modules/diag/SystemCheck.js
git commit -m "refactor(phase3): extract SystemCheck"

git add src/modules/diag/Diagnostico.jsx
git commit -m "refactor(phase3): extract Diagnostico component"

git add src/modules/customize/CustomizeSettings.js
git commit -m "refactor(phase3): extract CustomizeSettings"

git add src/modules/customize/Customize.jsx
git commit -m "refactor(phase3): extract Customize component"

git add src/utils/constants.js
git commit -m "refactor(phase3): add theme and customize constants"

git add src/App.jsx
git commit -m "refactor(phase3): update App.jsx to use new modules"
```

---

## ✅ Checklist

- [ ] Criar estrutura de diretórios (`src/modules/diag`, `src/modules/customize`)
- [ ] Extrair `SystemCheck.js`
- [ ] Extrair `Diagnostico.jsx`
- [ ] Extrair `CustomizeSettings.js`
- [ ] Extrair `Customize.jsx`
- [ ] Atualizar `constants.js`
- [ ] Atualizar `App.jsx`
- [ ] Rodar `npm run build`
- [ ] Rodar `npm run lint`
- [ ] Rodar `npm run test`
- [ ] Testes locais funcionando
- [ ] Commits realizados
- [ ] Push para GitHub

---

## 📊 Métricas Esperadas

| Métrica | Valor |
|---------|-------|
| **Arquivos criados** | 4 |
| **Linhas extraídas de App.jsx** | 200-250 |
| **Novos arquivos** | ~400-450 linhas |
| **Lint errors** | 0 |
| **Build success** | ✅ |

---

## 🚨 Pontos de Atenção

1. **ROOT_ONLY:** Essas features são apenas para superadmin/root
2. **Performance:** SystemCheck pode ser slow (network requests)
3. **localStorage:** Customização salva localmente
4. **Export/Import:** JSON format bem estruturado
5. **Temas:** Devem ser aplicáveis globalmente (CSS variables)

---

## 📚 Features de Diagnóstico

```javascript
Diagnostico deve verificar:
✅ Conexão Supabase (ping)
✅ Service Worker (status, version)
✅ localStorage (available, quota)
✅ Notification API (permission status)
✅ GitHub Actions (last run, status)
✅ App Version (current, latest available)
✅ Browser Info (user agent, screen)
✅ Performance (load time, FCP, LCP)
✅ Logs export (download JSON)
✅ Test button (enviar test message)
```

---

## 🎨 Features de Customização

```javascript
Customize deve permitir:
✅ Tema (dark/light/custom)
✅ Cores primárias
✅ Tamanho de fonte (small/medium/large)
✅ Layout sidebar (always/collapse/auto)
✅ Notificações (on/off/quiet)
✅ Export settings (JSON)
✅ Import settings (upload JSON)
✅ Reset to default
✅ Temas pré-configurados
✅ Preview em tempo real
```

---

## 📍 Phase Roadmap

✅ Phase 1: Constants, Colors, Formatters, UI Components, Navigation  
✅ Phase 2: Login/Auth, Auditoria, Ponto, Permissões por Ação  
🔄 Phase 3: Diagnóstico/Customização (EM EXECUÇÃO)  
⏳ Phase 4: Operacional (OS, Solicitações, Devoluções)  
⏳ Phase 5: Estoque (Base, Kit, NF, Saída)  
⏳ Phase 6: Grandes (Ponto, Frota, Relatórios)  

---

**Status:** 🔄 **PRONTA PARA EXECUÇÃO**

---

**Data de Criação:** 2026-06-07  
**Versão:** 1.0
