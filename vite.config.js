// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
