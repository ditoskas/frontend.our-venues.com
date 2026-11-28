import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // All assets live under /site/ so the same build can be served from any
    // host and path: the celebration subdomains ({label}.o-gamos-mas.com,
    // router basename "/") and the permanent link
    // (app.our-venues.com/celebrations/{guid}, basename "/celebrations/{guid}").
    // The backend's /api/site/entry serves index.html for both; nginx (prod)
    // or the backend's /site rewrite (local) serves these assets.
    base: '/site/',
    server: {
      // Requests proxied by the backend arrive with Host "frontend" (Docker)
      // or a *.localhost celebration host — let Vite answer them.
      allowedHosts: ['frontend', '.localhost'],
      // When the page is served through the backend (port 3000), connect HMR
      // straight to this dev server instead of the page's own port.
      hmr: env.VITE_HMR_CLIENT_PORT ? { clientPort: Number(env.VITE_HMR_CLIENT_PORT) } : undefined,
      // Optional same-origin API for local dev: with VITE_API_BASE_URL=/api,
      // forward /api to the backend so the app works on any host.
      proxy: env.VITE_API_PROXY_TARGET
        ? { '/api': { target: env.VITE_API_PROXY_TARGET, changeOrigin: true } }
        : undefined,
    },
  }
})
