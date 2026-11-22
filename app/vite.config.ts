import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'TNPSC Master – Group 1 Prep',
        short_name: 'TNPSC Master',
        description: 'Daily quizzes, SCERT study material and Tamil Nadu current affairs for TNPSC Group 1.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell is precached; book chapters (13 MB) are cached as they are opened.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['content/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/content\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/content/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'content', expiration: { maxEntries: 500 } },
          },
          {
            urlPattern: ({ url }) => url.origin.includes('fonts.g'),
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
});
