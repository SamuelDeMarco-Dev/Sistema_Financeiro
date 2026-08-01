/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AMBIENTE: 'development' | 'test' | 'production';
  readonly VITE_NOME_APP: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
