# StockTel - Operacao em Vercel Pro

## Ambientes

- `main`: producao.
- Branches `refactor/*`, `feature/*` e `fix/*`: preview e validacao.
- `.env.local`: somente notebook/desenvolvimento local.
- Vercel Environment Variables: fonte oficial das credenciais online.

## Variaveis obrigatorias no Vercel

- `PUBLIC_SITE_URL`
- `GITHUB_REPOSITORY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_KEY`
- `TELEGRAM_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_EXTRA_1`
- `TELEGRAM_EXTRA_2`
- `BACKUP_SECRET`
- `DEPLOY_NOTIFY_SECRET`
- `RELEASE_NOTIFY_SECRET`

## Sincronizacao segura das variaveis

Quando houver um `VERCEL_TOKEN` no terminal local, sincronize as variaveis do `.env.local` para Production e Preview:

```powershell
$env:VERCEL_TOKEN="cole-o-token-somente-no-terminal"
npm run vercel:env:sync
```

O script nao imprime os valores. Depois de sincronizar, faca um novo deploy e valide `/api/monitor`. So remova o fallback do `vercel.json` depois que Supabase e Telegram responderem online.

## Processo recomendado

1. Fazer alteracoes em branch.
2. Validar preview da Vercel.
3. Rodar `npm test`, `npm run lint` e `npm run build`.
4. Promover para `main` somente apos verificacao.
5. Conferir Telegram, `/api/monitor` e GitHub Actions.

## Monitoramento

- Workflow `Monitor StockTel 30min` chama `/api/monitor`.
- O endpoint mede Vercel, Supabase e GitHub.
- Historico recente fica em `re_monitor_history`.
- Alertas sao enviados por Telegram quando o endpoint e chamado via `POST`.

## Backup

- Workflow diario chama `/api/backup`.
- O backup exige `BACKUP_SECRET` quando configurado.
- Os arquivos sao enviados aos destinatarios autorizados no Telegram.
- Teste de restauracao deve ser feito em ambiente de preview antes de producao.

## Performance

Prioridade futura:

- Remover codigo legado ainda presente no `App.jsx`.
- Carregar relatórios e `xlsx` sob demanda.
- Dividir telas grandes com lazy loading.
- Medir bundle apos cada fase.

## PWA

- `public/sw.js` controla cache offline.
- `public/offline.html` e usado como fallback de navegacao.
- A cada nova versao relevante, atualizar o nome do cache do service worker.
