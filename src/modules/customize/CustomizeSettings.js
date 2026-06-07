import { ALL_MODULES, CUSTOMIZE_DEFAULT_SETTINGS, CUSTOMIZE_THEMES } from "../../utils/constants.js";

export function getDefaultTheme() {
  return { ...CUSTOMIZE_DEFAULT_SETTINGS, menuOrder: ALL_MODULES.map((m) => m.k) };
}

export function getThemes() {
  return CUSTOMIZE_THEMES;
}

export function applyTheme(config, themeKey) {
  const theme = CUSTOMIZE_THEMES.find((t) => t.key === themeKey);
  if (!theme) return config;
  return { ...config, accentColor: theme.accentColor, sidebarBg: theme.sidebarBg };
}

export function applyRuntimeSettings(config) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--accent", config.accentColor || "#d10000");
  document.documentElement.dataset.stocktelFontSize = config.fontSize || "medium";
}

export function exportSettings(config) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), app: "StockTel", config }, null, 2);
}

export function importSettings(json) {
  const parsed = JSON.parse(json);
  const config = parsed.config || parsed;
  if (!config || typeof config !== "object") throw new Error("JSON de configuracao invalido");
  return { ...getDefaultTheme(), ...config };
}

export function resetToDefault() {
  return getDefaultTheme();
}
