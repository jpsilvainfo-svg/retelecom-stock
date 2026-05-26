import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Aumenta o limite do aviso de chunk (arquivo é grande por design - single file)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Separa dependências externas em chunk próprio
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          xlsx: ['xlsx'],
          supabase: ['@supabase/supabase-js'],
        }
      }
    }
  }
})