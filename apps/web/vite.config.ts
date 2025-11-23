import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ['@twsoftball/infrastructure/web', '@twsoftball/infrastructure/memory'],
  },
  plugins: [
    react(),
    // Bundle analyzer (only in analysis mode)
    process.env.ANALYZE &&
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Offline fallback for navigation requests
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /\.[^/]+$/],
        runtimeCaching: [
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          // Google Fonts webfont files
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Static assets (JS, CSS) - CacheFirst for performance
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          // Images - CacheFirst
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'offline.html'],
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
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: id => {
          // Vendor libraries chunk - largest dependencies
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'vendor';
          }
          // UI libraries chunk - component libraries
          if (id.includes('@headlessui/react') || id.includes('@tanstack/react-query')) {
            return 'ui';
          }
          // Form and validation libraries chunk
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform/resolvers') ||
            id.includes('zod')
          ) {
            return 'forms';
          }
          // Utility libraries chunk
          if (
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('uuid') ||
            id.includes('zustand')
          ) {
            return 'utils';
          }
          // PWA and service worker chunk
          if (id.includes('workbox-window')) {
            return 'pwa';
          }
          // Lineup management feature chunk
          if (id.includes('lineup-management') || id.includes('substitute-player')) {
            return 'lineup';
          }
          // Game recording feature chunk
          if (id.includes('game-recording') || id.includes('record-at-bat')) {
            return 'game';
          }
          // Application layer chunk (business logic)
          if (id.includes('@twsoftball/application')) {
            return 'app-logic';
          }
          // Domain layer chunk (core domain)
          if (id.includes('@twsoftball/domain')) {
            return 'domain';
          }
          // Shared utilities chunk
          if (id.includes('shared/lib') || id.includes('shared/ui')) {
            return 'shared';
          }
          // Infrastructure layer chunk (dynamically loaded)
          if (id.includes('@twsoftball/infrastructure')) {
            return 'infrastructure';
          }
        },
      },
    },
    // Optimize chunk sizes
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
