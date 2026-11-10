import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (not only VITE_*) for the server process. These stay in
  // Node and are never bundled into browser code.
  const env = loadEnv(mode, process.cwd(), '')

  // /api/research → ${N8N_WEBHOOK_BASE}/research, with the secret header added.
  // Production uses the equivalent nginx rule (see docs/INTEGRATION.md).
  const apiProxy: Record<string, ProxyOptions> | undefined = env.N8N_WEBHOOK_BASE
    ? {
        '/api': {
          target: env.N8N_WEBHOOK_BASE,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
          headers: { 'X-Psycray-Key': env.N8N_WEBHOOK_SECRET ?? '' },
        },
      }
    : undefined

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
  }
})
