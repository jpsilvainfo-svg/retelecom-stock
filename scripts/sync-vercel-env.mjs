import { readFileSync } from "node:fs";

const REQUIRED_KEYS = [
  "PUBLIC_SITE_URL",
  "GITHUB_REPOSITORY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_KEY",
  "TELEGRAM_TOKEN",
  "TELEGRAM_CHAT_ID",
  "TELEGRAM_EXTRA_1",
  "TELEGRAM_EXTRA_2",
  "BACKUP_SECRET",
  "DEPLOY_NOTIFY_SECRET",
  "RELEASE_NOTIFY_SECRET",
  "MONITOR_WARN_MS",
  "MONITOR_HISTORY_LIMIT",
];

function readDotenv(path) {
  const env = {};
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#][^=]+?)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const token = process.env.VERCEL_TOKEN;
const project = process.env.VERCEL_PROJECT_NAME || process.env.VERCEL_PROJECT_ID || "retelecom-stock";
const team = process.env.VERCEL_TEAM_ID ? `&teamId=${encodeURIComponent(process.env.VERCEL_TEAM_ID)}` : "";

if (!token) {
  console.error("VERCEL_TOKEN ausente. Gere um token na Vercel e exporte somente no terminal local.");
  process.exit(2);
}

const localEnv = readDotenv(".env.local");
const requiredForRuntime = ["PUBLIC_SITE_URL", "GITHUB_REPOSITORY", "VITE_SUPABASE_URL", "VITE_SUPABASE_KEY", "TELEGRAM_TOKEN"];
const missingRuntime = requiredForRuntime.filter((key) => !localEnv[key]);
if (missingRuntime.length) {
  console.error(`.env.local sem variaveis criticas: ${missingRuntime.join(", ")}`);
  process.exit(2);
}

const variables = REQUIRED_KEYS
  .filter((key) => localEnv[key] || ["MONITOR_WARN_MS", "MONITOR_HISTORY_LIMIT"].includes(key))
  .map((key) => ({
    key,
    value: localEnv[key] || (key === "MONITOR_WARN_MS" ? "1500" : "200"),
    target: ["production", "preview"],
    type: "encrypted",
  }));

const response = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/env?upsert=true${team}`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(variables),
});

const result = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`Falha ao sincronizar envs na Vercel: HTTP ${response.status}`);
  console.error(result.error?.message || JSON.stringify(result));
  process.exit(1);
}

console.log(`Vercel env sync OK: ${variables.length} variaveis aplicadas em ${project}.`);
