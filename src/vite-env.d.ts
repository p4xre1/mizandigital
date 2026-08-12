/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables (`import.meta.env`).
 * Merges automatically with Vite's built-in client type definitions.
 */
interface ImportMetaEnv {
  /** Optional Google Analytics 4 Measurement ID. */
  readonly VITE_GA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
