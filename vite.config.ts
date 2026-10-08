import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Commit affiché dans Réglages : fourni par GitHub Actions (GITHUB_SHA), sinon lu dans git.
function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return ''; }
}
const sha = process.env.GITHUB_SHA || '';
const commitDate = sha ? git('log -1 --format=%cI') : '';

export default defineConfig({
  // Chemins relatifs : le site est servi sous /temps-travail/ sur GitHub Pages
  base: './',
  define: {
    __COMMIT_SHA__: JSON.stringify(sha),
    __COMMIT_DATE__: JSON.stringify(commitDate),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Temps de travail',
        short_name: 'Temps travail',
        description: 'Calcul du temps de travail et des heures supplémentaires',
        lang: 'fr',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f2f2f7',
        theme_color: '#1f4e79',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webmanifest}'],
        // Modules optionnels de jsPDF (export HTML, SVG) jamais utilisés par l'app
        globIgnores: ['**/html2canvas-*.js', '**/purify.es-*.js', '**/index.es-*.js'],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
