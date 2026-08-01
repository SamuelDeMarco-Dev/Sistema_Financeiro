import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // configuracao/ambiente.ts valida process.env na importacao e chama
    // process.exit(1) se faltar algo obrigatorio — sem isto, qualquer spec
    // que importe (mesmo transitivamente, ex.: via utilitarios/registrador)
    // mataria o processo inteiro do Vitest assim que carregasse o modulo.
    env: {
      NODE_ENV: 'test',
      URL_BASE_API: 'http://localhost:3333',
      URL_BASE_FRONTEND: 'http://localhost:5173',
      DATABASE_URL: 'postgresql://pfm:pfm_local@localhost:5432/pfm?schema=public',
      JWT_SEGREDO: 'x'.repeat(32),
      ORIGENS_PERMITIDAS: 'http://localhost:5173',
    },
    include: ['testes/unitarios/**/*.spec.ts', 'testes/integracao/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
    },
  },
});
