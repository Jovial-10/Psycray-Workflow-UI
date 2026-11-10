/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" for local mock data; anything else uses the live n8n API. */
  readonly VITE_API_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
