import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'TW Softball',
        short_name: 'TWSoftball',
        description:
          'Slow-pitch softball game recording Progressive Web App with offline-first capabilities',
        theme_color: '#2E7D32',
        background_color: '#FFFFFF',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
        categories: ['sports', 'utilities'],
        orientation: 'portrait-primary',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries chunk - largest dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // UI libraries chunk - component libraries
          ui: ['@headlessui/react', '@tanstack/react-query'],
          // Form and validation libraries chunk
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Utility libraries chunk
          utils: ['clsx', 'tailwind-merge', 'uuid', 'zustand'],
          // PWA and service worker chunk
          pwa: ['workbox-window'],
        },
      },
    },
  },
});
