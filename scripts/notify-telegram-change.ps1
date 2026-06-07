param(
  [string]$Event = "manual"
)

$ErrorActionPreference = "Stop"

function Read-EnvFile {
  param([string]$Path)
  $envs = @{}
  if (!(Test-Path $Path)) { return $envs }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
      $envs[$matches[1].Trim()] = $matches[2].Trim().Trim('"').Trim("'")
    }
  }
  return $envs
}

function Shorten {
  param([string]$Text, [int]$Max = 3400)
  if (!$Text -or $Text.Length -le $Max) { return $Text }
  return $Text.Substring(0, $Max) + "`n... resumo truncado"
}

$root = (& git rev-parse --show-toplevel 2>$null).Trim()
if (!$root) { exit 0 }
Set-Location $root

$envs = Read-EnvFile ".env.local"
$token = $env:TELEGRAM_TOKEN
if (!$token) { $token = $envs["TELEGRAM_TOKEN"] }

$chats = @()
foreach ($name in @("TELEGRAM_EXTRA_1", "TELEGRAM_EXTRA_2", "TELEGRAM_CHAT_ID")) {
  $value = [Environment]::GetEnvironmentVariable($name)
  if (!$value -and $envs.ContainsKey($name)) { $value = $envs[$name] }
  if ($value) { $chats += $value }
}
$chats = $chats | Where-Object { $_ } | Select-Object -Unique

if (!$token -or $chats.Count -eq 0) {
  Write-Host "Telegram nao configurado; notificacao ignorada."
  exit 0
}

$branch = (& git branch --show-current 2>$null).Trim()
$actor = $env:STOCKTEL_CHANGE_ACTOR
if (!$actor) { $actor = $env:USERNAME }
if (!$actor) { $actor = "local" }

$commit = (& git rev-parse --short HEAD 2>$null).Trim()
$subject = (& git log -1 --pretty=%s 2>$null).Trim()
$files = @()

switch ($Event) {
  "post-commit" {
    $files = & git diff-tree --no-commit-id --name-status -r HEAD 2>$null
    $title = "StockTel - commit registrado"
  }
  "pre-push" {
    $files = & git diff --name-status HEAD~1..HEAD 2>$null
    $title = "StockTel - push iniciado"
  }
  "post-merge" {
    $files = & git diff-tree --no-commit-id --name-status -r HEAD 2>$null
    $title = "StockTel - merge/pull aplicado"
  }
  default {
    $files = & git status --short 2>$null
    $title = "StockTel - alteracao registrada"
  }
}

$fileSummary = ($files | Select-Object -First 35) -join "`n"
if (!$fileSummary) { $fileSummary = "Sem arquivos listados pelo Git." }

$message = @"
$title

Evento: $Event
Origem: $actor
Branch: $branch
Commit: $commit
Mensagem: $subject
Data: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

Arquivos:
$fileSummary
"@

$message = Shorten $message

foreach ($chat in $chats) {
  try {
    $body = @{ chat_id = $chat; text = $message } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method Post -ContentType "application/json" -Body $body | Out-Null
    Write-Host "Notificacao Telegram enviada para $chat."
  } catch {
    Write-Warning "Falha ao enviar Telegram para ${chat}: $($_.Exception.Message)"
  }
}
