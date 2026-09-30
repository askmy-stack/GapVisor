/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base path or absolute URL, e.g. /api/v1 or https://api.example.com/api/v1. */
  readonly VITE_API_BASE?: string;
  /** Optional override for the API health check URL. */
  readonly VITE_API_HEALTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
