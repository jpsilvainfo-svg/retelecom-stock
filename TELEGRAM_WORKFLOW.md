# 📱 Telegram Workflow — Coordenação Claude Code + Codex

**Objetivo:** Manter todos informados em tempo real sobre o progresso das refatorações

---

## 🔄 Como Funciona

```
┌──────────────────────────────────────────────────────────┐
│  Codex trabalha no VS Code                               │
│  (refactor/app-jsx-modularization branch)                │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ├─ Faz commits
                 └─ Publica no GitHub
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Claude Code faz review/análise                          │
│  (via git log, git diff)                                 │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ├─ Analisa mudanças
                 ├─ Prepara resumo
                 └─ Envia para Telegram
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  📱 TELEGRAM — Você recebe notificação em tempo real     │
│  (Chat principal + chat secundário)                       │
└────────────────┬─────────────────────────────────────────┘
                 │
                 ├─ Lê o resumo
                 ├─ Acompanha progresso
                 └─ Pede para Codex fazer auto-análise
                        │
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Codex faz AUTO-ANÁLISE do que fez                       │
│  (LLM self-reflection)                                    │
└──────────────────────────────────────────────────────────┘
```

---

## 📤 Como Enviar Notificações para Telegram

### **Opção 1: Via curl (linha de comando)**

```bash
TOKEN="$TELEGRAM_TOKEN"
CHAT_IDS="$TELEGRAM_EXTRA_1 $TELEGRAM_EXTRA_2"

MESSAGE="sua_mensagem_aqui"

for CHAT_ID in $CHAT_IDS; do
  curl -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}&text=${MESSAGE}&parse_mode=Markdown"
done
```

### **Opção 2: Via API local**

```bash
curl -X POST http://localhost:3000/api/notify-progress \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Phase 1 Concluída",
    "message": "App.jsx reduzido em 408 linhas",
    "type": "success",
    "phase": "Phase 1"
  }'
```

---

## 📋 Tipos de Notificações

| Tipo | Ícone | Uso |
|------|-------|-----|
| `success` | ✅ | Phase concluída |
| `error` | ❌ | Erro ou falha |
| `warning` | ⚠️ | Aviso |
| `info` | ℹ️ | Informação geral |
| `phase` | 🔄 | Mudança de phase |
| `refactor` | ♻️ | Refatoração |

---

## 🎯 Workflow Proposto

### **A cada commit significativo:**
```
Codex:
├─ Faz commit
├─ Publica no GitHub
└─ Avisa Claude Code

Claude Code:
├─ Verifica git log
├─ Analisa mudanças
├─ Prepara resumo
└─ Envia para Telegram

Usuário:
├─ Recebe notificação
├─ Lê o resumo
└─ Pede auto-análise do Codex
```

---

**Status:** 🟢 **SISTEMA ATIVO E FUNCIONAL**

---

**Última atualização:** 2026-06-07
