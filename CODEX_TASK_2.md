# 🟡 Task-2: Refatorar App.jsx (IMPORTANTE)

**Branch:** `refactor/app-jsx-modularization`
**Responsável:** Codex (IDE interativo)
**Status:** Pronto para começar

---

## 📊 Situação Atual

| Métrica | Valor |
|---------|-------|
| Tamanho do App.jsx | 533 KB |
| Linhas de código | ~15.000+ |
| Componentes | 1 (monolítico) |
| Dificuldade | 🔴 Muito alta |

---

## 🎯 Objetivos

1. ✅ Dividir App.jsx em módulos por feature
2. ✅ Implementar lazy-loading de componentes
3. ✅ Melhorar performance de carregamento
4. ✅ Facilitar manutenção futura

---

## 🏗️ Estrutura Proposta

```
src/
├── App.jsx (principal - será reduzido)
├── hooks/
│   ├── useLS.js (já existe)
│   ├── useAuth.js (novo - autenticação)
│   ├── useSupabase.js (novo - dados)
│   └── useNotification.js (novo - notificações)
├── components/
│   ├── Navigation.jsx (menu lateral)
│   ├── Header.jsx (cabeçalho)
│   └── ModuleContainer.jsx (container para módulos)
├── modules/
│   ├── dashboard/
│   │   ├── Dashboard.jsx
│   │   ├── Charts.jsx
│   │   └── KPI.jsx
│   ├── estoque/
│   │   ├── EstoqueBase.jsx
│   │   ├── EstoqueTecnico.jsx
│   │   └── EstoqueForm.jsx
│   ├── frota/
│   │   ├── Frota.jsx
│   │   ├── Manutencao.jsx
│   │   └── FrotaForm.jsx
│   ├── operacional/
│   │   ├── OS.jsx
│   │   ├── Solicitacoes.jsx
│   │   └── OSForm.jsx
│   ├── relatorios/
│   │   ├── Relatorios.jsx
│   │   ├── RelEmail.jsx
│   │   └── Charts.jsx
│   ├── admin/
│   │   ├── Usuarios.jsx
│   │   ├── Categorias.jsx
│   │   ├── Produtos.jsx
│   │   ├── Logs.jsx
│   │   └── Ajuda.jsx
│   └── mecanico/
│       ├── Mecanico.jsx
│       └── Manutencao.jsx
├── styles/
│   ├── index.css
│   ├── theme.css
│   └── components.css
└── utils/
    ├── constants.js
    ├── colors.js
    └── formatters.js
```

---

## 📝 Passo a Passo

### **Passo 1: Extrair Constantes e Cores**

Criar `src/utils/constants.js`:
```javascript
export const APP_VERSION = "1.3.1";
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const APP_RELEASE_DATE = "06/06/2026";
export const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 horas

export const ALL_MODULES = [
  {k:"dash",l:"Dashboard",icon:"🏠",group:"geral"},
  // ... resto dos módulos
];

export const ROOT_ONLY = ["customize","diag"];

export const DEFAULT_PERMS = {
  superadmin: ALL_MODULES.map(m=>m.k).filter(k=>!ROOT_ONLY.includes(k)),
  // ... resto das permissões
};
```

Criar `src/utils/colors.js`:
```javascript
export const C = {
  bg:"#070707",
  surf:"#101010",
  card:"#171717",
  // ... resto das cores
};

export const PIE = ["#d10000","#ff9800",...];

export const catColor = (name, i) => {
  // ... lógica de cores
};

export const consumptionColor = (pct) => {
  // ... lógica de cores
};
```

---

### **Passo 2: Extrair Hooks Customizados**

Criar `src/hooks/useAuth.js`:
```javascript
export const useAuth = () => {
  // Lógica de autenticação
  // Retorna: user, login, logout, isAuthenticated
};
```

Criar `src/hooks/useSupabase.js`:
```javascript
export const useSupabase = () => {
  // Wrapper ao redor do supabase.js
  // Retorna: sbGet, sbSet, sbPing com cache
};
```

---

### **Passo 3: Criar Componentes Base**

Criar `src/components/Navigation.jsx`:
- Menu lateral com módulos
- Filtro por permissões
- Responsivo para mobile

Criar `src/components/Header.jsx`:
- Logo + título
- Usuário logado
- Notificações

---

### **Passo 4: Criar Módulos**

Para cada módulo em `src/modules/[modulo]/[nome].jsx`:
1. Extrair a seção relevante do App.jsx
2. Criar componentes menores
3. Usar hooks customizados
4. Exportar como lazy-load

Exemplo para Dashboard:
```javascript
// src/modules/dashboard/Dashboard.jsx
export default function Dashboard() {
  const { data } = useSupabase();
  const isMobile = useIsMobile();
  
  return (
    <div className="dashboard">
      <Charts data={data} />
      <KPI data={data} />
    </div>
  );
}
```

---

### **Passo 5: Reescrever App.jsx**

Novo App.jsx será pequeno e limpo:
```javascript
import { lazy, Suspense, useState } from "react";
import Navigation from "./components/Navigation";
import Header from "./components/Header";

const Dashboard = lazy(() => import("./modules/dashboard/Dashboard"));
const Estoque = lazy(() => import("./modules/estoque/Estoque"));
const Frota = lazy(() => import("./modules/frota/Frota"));
// ... resto dos módulos

export default function App() {
  const [currentModule, setCurrentModule] = useState("dash");
  
  return (
    <div className="app">
      <Header />
      <div className="container">
        <Navigation 
          currentModule={currentModule}
          onChange={setCurrentModule}
        />
        <main className="main-content">
          <Suspense fallback={<div>Carregando...</div>}>
            {currentModule === "dash" && <Dashboard />}
            {currentModule === "estoque" && <Estoque />}
            // ... resto dos módulos
          </Suspense>
        </main>
      </div>
    </div>
  );
}
```

---

## ✅ Checklist

- [ ] `src/utils/constants.js` criado
- [ ] `src/utils/colors.js` criado
- [ ] `src/hooks/useAuth.js` criado
- [ ] `src/hooks/useSupabase.js` criado
- [ ] Componentes base criados
- [ ] Módulos extraídos
- [ ] App.jsx reescrito
- [ ] Testes passando
- [ ] Performance melhorada

---

## 📊 Métricas Esperadas

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| App.jsx | 533 KB | ~50 KB | 90% ↓ |
| Bundle size | 600+ KB | 300 KB | 50% ↓ |
| TTI (Time to Interactive) | 3s | 1s | 66% ↓ |

---

## 🚀 Instruções para o Codex

1. Checkout na branch `refactor/app-jsx-modularization`
2. Comece criando os arquivos em `src/utils/`
3. Depois os hooks em `src/hooks/`
4. Depois os componentes
5. Por último, reescreva o App.jsx
6. Teste localmente com `npm run dev`
7. Faça commit a cada passo

**Tempo estimado:** 2-3 horas

---

**Criado em:** 2026-06-07
**Versão:** 1.0
