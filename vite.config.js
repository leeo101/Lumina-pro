import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true  // Habilita la PWA también en desarrollo
      },
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable.png'],
      manifest: {
        name: 'Lumina Pro — Gestor de Gastos',
        short_name: 'Lumina Pro',
        description: 'Tu gestor de finanzas personales inteligente. Multi-cuenta, metas, suscripciones y más.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icon-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Agregar Gasto',
            short_name: 'Gasto',
            description: 'Registrar un nuevo gasto rápido',
            url: '/?action=add',
            icons: [{ src: 'logo.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dolarapi\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dolar-api-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 3600 }
            }
          }
        ]
      }
    })
  ],
})
