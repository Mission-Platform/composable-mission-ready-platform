/// <reference types="vitest/config" />
import { defineAppConfig } from '@mission-platform/vite-config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineAppConfig({
  overrides: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 64 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /\.wasm$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'wasm-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        manifest: {
          name: 'My Care Notes',
          short_name: 'Care Notes',
          description: 'A clinical notes editor that works offline',
          theme_color: '#4a9ebe',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('monaco-editor')) {
              return 'monaco-editor';
            }
          },
        },
      },
    },
    worker: {
      format: 'es',
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
    },
  },
});
