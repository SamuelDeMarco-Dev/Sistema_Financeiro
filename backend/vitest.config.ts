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
      // So usa o padrao local quando DATABASE_URL ainda nao veio do ambiente
      // (ao contrario dos demais valores deste bloco, que sempre sobrescrevem):
      // a CI define suas proprias credenciais do servico Postgres via env do
      // job, diferentes das do docker-compose.yml local, e um valor fixo
      // aqui quebraria uma das duas pontas. Em qualquer caso e sempre a
      // porta 5433/pfm_teste, nunca a de dev (5432/pfm) — limparBanco()
      // apaga tudo, e testes de integracao nao podem arriscar limpar o
      // banco de desenvolvimento por engano.
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://pfm:pfm_local@localhost:5433/pfm_teste?schema=public',
      JWT_SEGREDO: 'x'.repeat(32),
      ORIGENS_PERMITIDAS: 'http://localhost:5173',
    },
    include: ['testes/unitarios/**/*.spec.ts', 'testes/integracao/**/*.spec.ts'],
    // Os testes de integracao compartilham UM UNICO banco pfm_teste e cada
    // arquivo faz beforeEach(limparBanco()) — com arquivos rodando em
    // processos paralelos (padrao do Vitest), um arquivo apaga os dados que
    // o outro acabou de criar no meio do teste (usuario "nao encontrado",
    // 401 em vez de 200, corpo de resposta undefined). Sequencial evita a
    // corrida; e um teste financeiro, correcao vale mais que velocidade.
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/tipos/**'],
      all: true,
    },
  },
});
