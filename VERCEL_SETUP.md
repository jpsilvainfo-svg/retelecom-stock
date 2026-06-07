# 🚀 VERCEL SETUP — Environment Variables

**IMPORTANTE:** As credenciais do Supabase **NUNCA** devem estar no `vercel.json` ou no Git!

---

## 🔒 SEGURANÇA PRIMEIRO!

As variáveis de ambiente devem ser configuradas diretamente no painel do Vercel, **NÃO** no código.

---

## ⚙️ COMO CONFIGURAR NO VERCEL

### **Opção 1: Vercel Dashboard (Recomendado)**

1. **Acesse:** https://vercel.com/dashboard
2. **Selecione seu projeto:** `stocktel`
3. **Vá em:** Settings → Environment Variables
4. **Adicione as variáveis:**

```
VITE_SUPABASE_URL = https://enwlwudxtxpebxqfzkku.supabase.co
VITE_SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TELEGRAM_TOKEN = 8575341005:AAE_71QUDdOq48ZFBllDuSeVHr37dfR2qmM
```

5. **Salve** e redeploye

### **Opção 2: Vercel CLI**

```bash
# Login no Vercel
vercel login

# Adicione variável
vercel env add VITE_SUPABASE_URL

# Responda com o valor:
# https://enwlwudxtxpebxqfzkku.supabase.co

# Faça para cada variável...

# Redeploy
vercel --prod
```

### **Opção 3: `.env.production`** (Local apenas, NÃO commitar!)

Crie na raiz do projeto:

```env
VITE_SUPABASE_URL=https://enwlwudxtxpebxqfzkku.supabase.co
VITE_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TELEGRAM_TOKEN=8575341005:AAE_71QUDdOq48ZFBllDuSeVHr37dfR2qmM
```

⚠️ **ADICIONE AO .gitignore:**

```
.env.production
.env.production.local
```

---

## 📋 VARIÁVEIS NECESSÁRIAS

| Variável | Valor | Tipo |
|----------|-------|------|
| `VITE_SUPABASE_URL` | https://enwlwudxtxpebxqfzkku.supabase.co | Build + Runtime |
| `VITE_SUPABASE_KEY` | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... | Build + Runtime |
| `TELEGRAM_TOKEN` | 8575341005:AAE_71QUDdOq48ZFBllDuSeVHr37dfR2qmM | Runtime |

---

## 🔧 VERIFICAR CONFIGURAÇÃO

### **Vercel CLI:**

```bash
vercel env list
```

Deve mostrar:

```
VITE_SUPABASE_URL
VITE_SUPABASE_KEY
TELEGRAM_TOKEN
GROQ_API_KEY
```

### **Vercel Dashboard:**

1. Vá em Settings → Environment Variables
2. Verifique que todas as variáveis estão lá
3. Certifique-se de que estão ativas para "Production"

---

## 🚀 DEPLOY COM VARIÁVEIS

### **Comando:**

```bash
vercel --prod
```

Ou via GitHub:

1. Push para main/master
2. Vercel faz deploy automático
3. Usa variáveis configuradas no dashboard

---

## 🔍 TROUBLESHOOTING

### **Problema: Build falha com "VITE_SUPABASE_URL undefined"**

**Solução:**
1. Verifique se a variável está no dashboard
2. Certifique-se de estar no branch correto
3. Redeploy: `vercel --prod`

### **Problema: API calls falham em produção**

**Solução:**
1. Verifique se a chave do Supabase é válida
2. Verifique CORS settings no Supabase
3. Verifique se as variáveis foram propagadas

### **Problema: Telegram notificações não funcionam**

**Solução:**
1. Verifique `TELEGRAM_TOKEN`
2. Certifique-se que o token está correto
3. Teste localmente com `.env.local`

---

## ✅ CHECKLIST DE DEPLOY

- [ ] Variáveis configuradas no Vercel dashboard
- [ ] Nenhuma credencial em vercel.json
- [ ] .env.* no .gitignore
- [ ] .env.local em .gitignore
- [ ] Build passa localmente: `npm run build`
- [ ] Redeploy via `vercel --prod`
- [ ] Verificar logs: https://vercel.com/dashboard
- [ ] Testar funcionalidade em produção

---

## 📱 TELEGRAM WEBHOOK (Avançado)

Para notificações automáticas em Telegram:

1. Crie um webhook no Vercel
2. Configure em `vercel.json`
3. Use `TELEGRAM_TOKEN` para autenticação

**Exemplo:**

```json
{
  "webhooks": [
    {
      "url": "https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
      "events": ["deployment.success"]
    }
  ]
}
```

---

## 🔐 SEGURANÇA: NÃO FAÇA ISSO ❌

```json
// ❌ NUNCA HARDCODE CREDENCIAIS
{
  "env": {
    "VITE_SUPABASE_KEY": "eyJhbGciOiJIUzI1..."  // ERRADO!
  }
}
```

```bash
# ❌ NUNCA COMMITE .env FILES
git add .env.production  # NUNCA!
```

```javascript
// ❌ NUNCA IMPORTE DO .env NOS ARQUIVOS
import SUPABASE_KEY from '.env.production'  // ERRADO!
```

---

## ✅ SEGURANÇA: FAÇA ISSO ✅

```json
// ✅ Deixe vercel.json limpo
{
  "rewrites": [...],
  "headers": [...]
  // Sem "env" ou "build.env"
}
```

```bash
# ✅ Adicione ao .gitignore
echo ".env*" >> .gitignore
```

```javascript
// ✅ Use import.meta.env (Vite)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
```

---

## 📊 VITE CONFIGURATION

O `vite.config.js` **já está configurado** para ler do `.env`:

```javascript
import { defineConfig, loadEnv } from 'vite'

export default defineConfig({
  plugins: [...],
  define: {
    __SUPABASE_URL__: JSON.stringify(process.env.VITE_SUPABASE_URL),
    __SUPABASE_KEY__: JSON.stringify(process.env.VITE_SUPABASE_KEY),
  }
})
```

Isso significa que o build automáticamente injeta as variáveis!

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Configure variáveis no Vercel dashboard
2. ✅ Redeploy: `vercel --prod`
3. ✅ Verifique logs
4. ✅ Teste funcionalidade
5. ✅ Valide Supabase connection
6. ✅ Valide Telegram integration

---

## 📞 SUPORTE

Se encontrar erros:

1. **Verifique os logs:** https://vercel.com/dashboard → Deployments → Logs
2. **Teste localmente:** `npm run build && npm run preview`
3. **Valide variáveis:** `vercel env list`
4. **Verifique Supabase:** Acesse https://app.supabase.io

---

**IMPORTANTE:** Este arquivo é para referência. **NUNCA** comite credenciais em código!

**Data:** 2026-06-07  
**Versão:** 1.0
