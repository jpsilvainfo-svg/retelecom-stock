// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Injeta um ID unico de build no nome do cache do service worker, para que
// cada deploy invalide automaticamente o cache do PWA dos clientes.
function swBuildId() {
  return {
    name: "sw-build-id",
    apply: "build",
    closeBundle() {
      const swPath = resolve("dist", "sw.js");
      try {
        const buildId = Date.now().toString(36);
        const code = readFileSync(swPath, "utf8").replace(/__BUILD_ID__/g, buildId);
        writeFileSync(swPath, code);
        console.log(`[sw-build-id] cache = stocktel-pwa-${buildId}`);
      } catch (e) {
        console.warn("[sw-build-id] nao foi possivel atualizar dist/sw.js:", e.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), swBuildId()],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Vite 8 (rolldown): manualChunks DEVE ser função, não objeto!
        manualChunks(id) {
          if (id.includes("/node_modules/react") || id.includes("/node_modules/react-dom"))
            return "vendor-react";
          if (id.includes("/node_modules/recharts"))
            return "vendor-charts";
          if (id.includes("/node_modules/xlsx"))
            return "vendor-xlsx";
          if (id.includes("/node_modules/@supabase"))
            return "vendor-supabase";
        }
      }
    }
  }
});
