import { sbGet, sbPing, sbSet } from "../../supabase.js";
import { APP_VERSION, DIAGNOSTIC_MODULES } from "../../utils/constants.js";

export async function checkSupabaseConnection() {
  const result = await sbPing();
  return {
    key: "supabase",
    ok: Boolean(result.ok),
    label: "Supabase",
    detail: result.ok ? `Conectado em ${result.ms}ms` : result.error || "Falha de conexao",
    ms: result.ms || null,
  };
}

export function checkServiceWorker() {
  const supported = "serviceWorker" in navigator;
  return {
    key: "serviceWorker",
    ok: supported,
    label: "Service Worker",
    detail: supported ? "Suportado pelo navegador" : "Nao suportado",
  };
}

export function checkLocalStorage() {
  try {
    const key = "__stocktel_diag_test";
    localStorage.setItem(key, "ok");
    localStorage.removeItem(key);
    return { key: "localStorage", ok: true, label: "LocalStorage", detail: "Leitura e escrita OK" };
  } catch (error) {
    return { key: "localStorage", ok: false, label: "LocalStorage", detail: error.message };
  }
}

export function checkNotifications() {
  const supported = "Notification" in window;
  return {
    key: "notifications",
    ok: supported && Notification.permission !== "denied",
    label: "Notificacoes",
    detail: supported ? `Permissao: ${Notification.permission}` : "API indisponivel",
  };
}

export async function checkGitHubActions() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return { key: "githubActions", ok: true, label: "GitHub Actions", detail: data.status || "API status OK" };
  } catch (error) {
    return { key: "githubActions", ok: false, label: "GitHub Actions", detail: error.message };
  }
}

export function collectSystemInfo() {
  const nav = navigator;
  return {
    appVersion: APP_VERSION,
    userAgent: nav.userAgent,
    language: nav.language,
    screen: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    online: nav.onLine,
    time: new Date().toISOString(),
  };
}

export async function runSystemChecks() {
  const checks = [
    await checkSupabaseConnection(),
    checkServiceWorker(),
    checkLocalStorage(),
    checkNotifications(),
    await checkGitHubActions(),
  ];
  return { checks, systemInfo: collectSystemInfo() };
}

export async function checkDataModules() {
  const rows = [];
  for (const mod of DIAGNOSTIC_MODULES) {
    let localCount = 0;
    let localTs = "0";
    try {
      const raw = localStorage.getItem(mod.key);
      localTs = localStorage.getItem(`${mod.key}__ts`) || "0";
      const data = raw ? JSON.parse(raw) : null;
      localCount = Array.isArray(data) ? data.length : data && typeof data === "object" ? 1 : 0;
    } catch {}

    try {
      const remote = await sbGet(mod.key);
      const remoteCount = remote && !remote.empty
        ? Array.isArray(remote.value) ? remote.value.length : remote.value && typeof remote.value === "object" ? 1 : 0
        : 0;
      const remoteTs = remote?.updated_at || "0";
      let status = "ok";
      if (!remote || remote.empty || remote.value === null) status = localCount > 0 ? "pendente_sync" : "vazio";
      else if (localTs > remoteTs) status = "desatualizado";
      rows.push({ ...mod, localCount, localTs, remoteCount, remoteTs, status });
    } catch (error) {
      rows.push({ ...mod, localCount, localTs, remoteCount: 0, remoteTs: "?", status: "erro", error: error.message });
    }
  }
  return rows;
}

export async function syncModuleToCloud(mod) {
  const raw = localStorage.getItem(mod.key);
  const data = raw ? JSON.parse(raw) : [];
  const result = await sbSet(mod.key, data);
  if (result.ok) localStorage.setItem(`${mod.key}__ts`, new Date().toISOString());
  return { ...result, detail: raw ? result.detail : "Modulo inicializado vazio no Supabase" };
}
