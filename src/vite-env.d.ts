/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Commit publié (injecté par vite.config.ts, vide en local) */
declare const __COMMIT_SHA__: string;
declare const __COMMIT_DATE__: string;

interface Window {
  /** Accès pour les tests automatisés de bout en bout */
  TT?: Record<string, unknown>;
}
