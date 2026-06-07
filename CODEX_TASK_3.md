# 🟢 Task-3: Adicionar Testes Automáticos (RECOMENDADO)

**Branch:** `feature/add-tests`
**Responsável:** Claude Code (setup) + Codex (implementação)
**Status:** Pronto para começar

---

## 🎯 Objetivos

1. ✅ Setup Jest + React Testing Library
2. ✅ Testes unitários para hooks
3. ✅ Testes de integração para componentes
4. ✅ Testes E2E para workflows críticos
5. ✅ CI/CD integrado com GitHub Actions

---

## 📦 Dependências a Adicionar

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest-environment-jsdom \
  @babel/preset-react \
  @babel/preset-env
```

---

## 🏗️ Estrutura de Testes

```
src/
├── __tests__/
│   ├── hooks/
│   │   ├── useLS.test.js
│   │   ├── useAuth.test.js
│   │   ├── useSupabase.test.js
│   │   └── useNotification.test.js
│   ├── components/
│   │   ├── Navigation.test.jsx
│   │   ├── Header.test.jsx
│   │   └── ModuleContainer.test.jsx
│   ├── modules/
│   │   ├── dashboard/
│   │   │   ├── Dashboard.test.jsx
│   │   │   └── Charts.test.jsx
│   │   ├── estoque/
│   │   │   └── EstoqueBase.test.jsx
│   │   └── ...
│   └── integration/
│       ├── auth.integration.test.js
│       ├── estoque.integration.test.js
│       └── ...
└── ...
```

---

## 📝 Exemplos de Testes

### **Teste de Hook: useLS**

```javascript
// src/__tests__/hooks/useLS.test.js
import { renderHook, act } from '@testing-library/react';
import { useLS } from '../../hooks/useLS';

describe('useLS Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('deve armazenar e recuperar dados', () => {
    const { result } = renderHook(() => useLS('teste'));
    
    act(() => {
      result.current[1]({ key: 'valor' });
    });
    
    expect(result.current[0]).toEqual({ key: 'valor' });
  });

  test('deve retornar null se não existe', () => {
    const { result } = renderHook(() => useLS('nao-existe'));
    expect(result.current[0]).toBeNull();
  });
});
```

### **Teste de Componente: Navigation**

```javascript
// src/__tests__/components/Navigation.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '../../components/Navigation';

describe('Navigation Component', () => {
  test('deve renderizar todos os módulos permitidos', () => {
    const modules = [
      { k: 'dash', l: 'Dashboard', icon: '🏠' },
      { k: 'estoque', l: 'Estoque', icon: '📦' }
    ];
    
    render(<Navigation modules={modules} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Estoque')).toBeInTheDocument();
  });

  test('deve chamar onChange ao clicar em módulo', () => {
    const onChange = jest.fn();
    const modules = [{ k: 'dash', l: 'Dashboard', icon: '🏠' }];
    
    render(<Navigation modules={modules} onChange={onChange} />);
    
    fireEvent.click(screen.getByText('Dashboard'));
    expect(onChange).toHaveBeenCalledWith('dash');
  });
});
```

### **Teste de Integração: Login**

```javascript
// src/__tests__/integration/auth.integration.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';

describe('Fluxo de Autenticação', () => {
  test('deve fazer login e acessar dashboard', async () => {
    render(<App />);
    
    // Preencher formulário
    const emailInput = screen.getByPlaceholderText('Email');
    const passwordInput = screen.getByPlaceholderText('Senha');
    
    await userEvent.type(emailInput, 'usuario@teste.com');
    await userEvent.type(passwordInput, 'senha123');
    
    // Submit
    fireEvent.click(screen.getByText('Entrar'));
    
    // Verificar redirecionamento
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });
});
```

---

## ⚙️ Configuração Jest

Criar `jest.config.js`:
```javascript
export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}',
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
};
```

Criar `src/setupTests.js`:
```javascript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock do localStorage
global.localStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock do Supabase
vi.mock('./supabase', () => ({
  sbGet: vi.fn(),
  sbSet: vi.fn(),
  sbPing: vi.fn(),
}));
```

---

## 📊 package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## 🚀 GitHub Actions para Testes

Criar `.github/workflows/tests.yml`:
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
```

---

## ✅ Checklist

- [ ] Jest configurado
- [ ] React Testing Library instalado
- [ ] `jest.config.js` criado
- [ ] `src/setupTests.js` criado
- [ ] Testes de hooks implementados
- [ ] Testes de componentes implementados
- [ ] Testes de integração implementados
- [ ] GitHub Actions configurado
- [ ] Coverage acima de 70%
- [ ] CI/CD passando

---

## 📊 Métricas de Qualidade

| Métrica | Target | Ferramentas |
|---------|--------|-------------|
| Coverage | 70%+ | Jest |
| Type Safety | 100% | TypeScript (opcional) |
| Linting | 0 erros | ESLint |
| Performance | <1s | Jest performance |

---

## 🕐 Tempo Estimado

- Setup: 30 min
- Testes de hooks: 1 hora
- Testes de componentes: 1.5 horas
- Testes de integração: 1 hora
- CI/CD: 30 min

**Total: ~4.5 horas**

---

## 🔗 Referências

- [Jest Docs](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Criado em:** 2026-06-07
**Versão:** 1.0
