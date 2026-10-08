import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Hors ligne + mise à jour automatique à chaque publication
registerSW({ immediate: true });

// Nettoyage des caches de l'ancienne version (avant Vite)
if ('caches' in window) {
  caches.keys().then(keys => keys.filter(k => k.startsWith('temps-travail-')).forEach(k => caches.delete(k))).catch(() => {});
}
