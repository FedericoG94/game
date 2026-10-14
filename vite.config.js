import { defineConfig } from 'vite';

// `base: './'` rende la build indipendente dal percorso di pubblicazione:
// funziona sia in locale, sia su https://utente.github.io/carlotta-gift-run/.
// Se vuoi forzare un percorso assoluto: VITE_BASE=/nome-repo/ npm run build
export default defineConfig({
  base: process.env.VITE_BASE || './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
  server: { host: true },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
