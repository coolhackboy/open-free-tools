import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { prerender } from './scripts/prerender.ts'

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Fills the brand placeholders in index.html (dev server and build). */
function htmlMeta(opts: { brandName: string }): Plugin {
  return {
    name: 'html-meta',
    transformIndexHtml: {
      order: 'post',
      handler: (html) => html.replaceAll('__BRAND_NAME__', escapeHtml(opts.brandName)),
    },
  }
}

/**
 * Public URL of the deployment, used for canonical / og:url / sitemap.xml.
 * VITE_SITE_URL wins; Netlify (URL) and Vercel (VERCEL_PROJECT_PRODUCTION_URL) provide one automatically.
 */
function siteUrl(env: Record<string, string>) {
  const explicit = env.VITE_SITE_URL?.trim()
  if (explicit) return explicit
  if (process.env.URL) return process.env.URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return ''
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_')
  const brandName = env.VITE_BRAND_NAME?.trim() || 'Open Free Tools'
  return {
    plugins: [react(), tailwindcss(), htmlMeta({ brandName }), prerender({ brandName, siteUrl: siteUrl(env) })],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    worker: { format: 'es' },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Long-lived vendor chunks keep the app chunk small and cache-friendly.
          manualChunks(id) {
            if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          },
        },
      },
    },
    optimizeDeps: {
      // Loaded on demand with import(); FFmpeg spawns its own worker from the package files.
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
  }
})
