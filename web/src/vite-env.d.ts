/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_FALLBACK_TO_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
