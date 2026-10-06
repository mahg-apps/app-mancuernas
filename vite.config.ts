import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// El repositorio en GitHub se llamará "app-mancuernas", por eso la base.
export default defineConfig({
  base: '/app-mancuernas/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Mancuernas — Entrena en casa',
        short_name: 'Mancuernas',
        description: 'Ejercicios con mancuernas por zona del cuerpo, con animaciones y modo entrenamiento.',
        lang: 'es',
        start_url: '/app-mancuernas/',
        scope: '/app-mancuernas/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d1117',
        theme_color: '#0d1117',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
});
