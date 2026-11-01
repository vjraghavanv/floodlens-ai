/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_FALLBACK_TO_DEMO?: string;
  readonly VITE_LOCATION_STYLE_URL?: string;
  readonly VITE_LOCATION_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
