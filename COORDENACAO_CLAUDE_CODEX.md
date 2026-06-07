# 🤝 Coordenação Claude Code + Codex

**Data:** 2026-06-07  
**Projeto:** StockTel v1.3.1  
**Objetivo:** Trabalhar em paralelo sem conflitos

---

## 🎯 Divisão de Responsabilidades

### **Claude Code (Eu) — Backend/DevOps/Infraestrutura**

✅ Tarefas:
- Configuração de segurança (credenciais, secrets)
- Configuração de CI/CD e GitHub Actions
- Setup de testes (Jest, estrutura)
- Coordenação de branches
- Merge e deployment
- Documentação técnica
- Auditorias de segurança

### **Codex (Você) — Frontend/UX/Desenvolvimento Interativo**

✅ Tarefas:
- Refatoração de componentes React
- Desenvolvimento de novos módulos
- UI/UX improvements
- Implementação de hooks
- Testes de componentes
- Feedback visual e interatividade
- Performance do frontend

---

## 📋 Tarefas em Paralelo

```
┌─────────────────────────────────────────────┐
│ Task-1: Segurança (URGENTE) — CONCLUÍDO   │
│ Branch: fix/security-credentials           │
│ Status: ✅ Pronto para review              │
│ Responsável: Claude Code                    │
└─────────────────────────────────────────────┘
        ↓
        ├─ Aguardando: Vercel Secrets setup (manual)
        ├─ Próximo: Merge após verificação
        └─ Timeline: Hoje (2026-06-07)

┌─────────────────────────────────────────────┐
│ Task-2: Refatoração App.jsx (IMPORTANTE)  │
│ Branch: refactor/app-jsx-modularization     │
│ Status: 📋 Documentação pronta              │
│ Responsável: Codex                          │
│ Docs: CODEX_TASK_2.md                       │
└─────────────────────────────────────────────┘
        ↓
        ├─ Timeline: 2-3 horas
        ├─ Passar para: Claude Code (review)
        └─ Próximo: Task-3 (testes)

┌─────────────────────────────────────────────┐
│ Task-3: Testes Automáticos (RECOMENDADO)  │
│ Branch: feature/add-tests                   │
│ Status: 📋 Documentação pronta              │
│ Responsável: Claude Code (setup) +          │
│            Codex (implementação)            │
│ Docs: CODEX_TASK_3.md                       │
└─────────────────────────────────────────────┘
        ↓
        ├─ Claude Code: Setup Jest + CI/CD (1h)
        ├─ Codex: Implementar testes (3.5h)
        └─ Timeline: Paralelo com Task-2

┌─────────────────────────────────────────────┐
│ Task-4: PWA Completo (OPCIONAL)            │
│ Branch: feature/pwa-complete                │
│ Status: 📋 Documentação pronta              │
│ Responsável: Codex                          │
│ Docs: CODEX_TASK_4.md                       │
└─────────────────────────────────────────────┘
        ↓
        ├─ Timeline: 4 horas
        ├─ Após: Task-2 finalizar
        └─ Próximo: Deploy final
```

---

## 🔄 Workflow Coordenado

### **Fase 1: Setup (Hoje)**

```
Claude Code:
1. ✅ Criar WORK_PLAN.md
2. ✅ Criar branches
3. ✅ Commit Task-1
4. ✅ Criar documentação das tasks
5. ⏳ Aguardar: Codex começar Task-2

Codex:
1. ⏳ Ler CODEX_TASK_2.md
2. ⏳ Checkout em refactor/app-jsx-modularization
3. ⏳ Começar refatoração
```

### **Fase 2: Desenvolvimento Paralelo**

```
Claude Code:
- Monitorar branches
- Review de commits
- Sugerir melhorias
- Preparar CI/CD
- Setup de testes (Task-3)

Codex:
- Refatorar App.jsx (Task-2)
- Desenvolver novos componentes
- Testar localmente
- Fazer commits pequenos
- Criar pull requests
```

### **Fase 3: Integração**

```
Claude Code:
- Review PRs do Codex
- Merge em sequence
- Resolver conflitos
- Rodar testes
- Deploy em staging

Codex:
- Responder feedback
- Implementar testes
- Trabalhar em Task-4
- Otimizações finais
```

### **Fase 4: Deploy Final**

```
Ambos:
- Verificação final
- Testes em staging
- Checklist de go-live
- Deploy em produção
- Monitoramento
```

---

## 🚨 Evitando Conflitos

### **Regras de Ouro**

1. **Cada um em sua branch** → Sem merge para main até pronto
2. **Commits frequentes** → Pelo menos a cada 30 min
3. **Mensagens claras** → "Task-2: Criar componente X"
4. **Comunicação** → Informar status no README
5. **Não editar os mesmos arquivos** simultaneamente

### **Se Houver Conflito**

```
Cenário: Ambos editam src/App.jsx

Solução:
1. Claude Code: Avisa Codex imediatamente
2. Codex: Para de editar aquele arquivo
3. Claude Code: Faz merge manual
4. Codex: Puxa atualização (`git pull`)
5. Codex: Continua em novo arquivo
```

---

## 📊 Status Em Tempo Real

Acompanhe aqui o progresso:

```
┌─────────────────────────────────────────────────┐
│ PROGRESSO GERAL                                 │
├─────────────────────────────────────────────────┤
│ Task-1 (Segurança):      ████████████░░ 100%   │
│ Task-2 (Refatoração):    ░░░░░░░░░░░░░░ 0%     │
│ Task-3 (Testes):         ░░░░░░░░░░░░░░ 0%     │
│ Task-4 (PWA):            ░░░░░░░░░░░░░░ 0%     │
│                                                 │
│ Total:                   ██░░░░░░░░░░░░ 25%    │
├─────────────────────────────────────────────────┤
│ Tempo Decorrido: ~2h                            │
│ Tempo Estimado: ~12h (sem Task-4)              │
│ ETA: 2026-06-08 (amanhã)                        │
└─────────────────────────────────────────────────┘
```

---

## 💬 Comunicação

### **Padrão de Mensagem**

Quando atualizar status:

```
[STATUS] Task-X: Descrição rápida

Exemplo:
[IN_PROGRESS] Task-2: Extraindo componentes de Dashboard
- Criados: Dashboard.jsx, Charts.jsx, KPI.jsx
- Em progresso: Integrando com useSupabase
- Próximo: Lazy-loading
- ETA: 45 min
- Bloqueadores: Nenhum
```

---

## ✅ Checklist Final

- [x] WORK_PLAN.md criado
- [x] Branches criadas
- [x] Task-1 concluída
- [x] Documentação pronta
- [ ] Codex começa Task-2
- [ ] Claude Code prepara Task-3
- [ ] Integração de branches
- [ ] Testes passando
- [ ] Deploy em staging
- [ ] Deploy em produção

---

## 🎯 Próximos Passos

**Para Codex:**
1. Abrir `CODEX_TASK_2.md`
2. Fazer checkout em `refactor/app-jsx-modularization`
3. Começar conforme documentação
4. Fazer commits a cada 30 min
5. Avisar quando terminar

**Para Claude Code:**
1. Aguardar início da Task-2 do Codex
2. Preparar ambiente de testes (Task-3)
3. Monitorar branches
4. Estar pronto para review

---

## 📞 Suporte

Se houver dúvidas:
- Codex → Claude Code (via comentários)
- Claude Code → Revisar docs
- Ambos → Atualizar COORDENACAO_CLAUDE_CODEX.md

---

**Última atualização:** 2026-06-07 12:30 UTC
**Status geral:** 🟢 GREEN — Pronto para começar!

---

## 🚀 LET'S GO!

Codex: Você está liberado para começar a **Task-2**!  
Claude Code: Monitorando e preparando **Task-3**!

**Objetivo:** Entregar todas as tarefas amanhã com qualidade! 🎉
