import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          name: 'HOLO AstroCRM',
          short_name: 'HOLO',
          description: 'Астрологический CRM — натальные карты, транзиты, синастрия',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          lang: 'ru',
          icons: [
            { src: '/icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
            { src: '/icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
            { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
            { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                networkTimeoutSeconds: 10,
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || 'http://localhost:8000'),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Firebase SDK → vendor-firebase
            if (id.includes('node_modules/firebase')) return 'vendor-firebase';
            // PDF export stack (heavy, only loaded on demand): skip
            // manualChunks so Rollup emits pure async chunks and does
            // not hoist __vitePreload here, which would force eager download.
            if (id.includes('html2pdf') || id.includes('html2canvas')
                || id.includes('jspdf') || id.includes('jsPDF')) return;
            // DOMPurify
            if (id.includes('dompurify') || id.includes('purify')) return 'vendor-purify';
            // React runtime
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')
                || id.includes('node_modules/react-router')) return 'vendor-react';
            // Lucide icons (icon-only, no heavy logic)
            if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
            // date-fns (CRM only)
            if (id.includes('node_modules/date-fns')) return 'vendor-date';
            // Everything else in node_modules → vendor-other
            if (id.includes('node_modules')) return 'vendor-other';
          },
        },
      },
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ''),
        },
      },
    },
  };
});
