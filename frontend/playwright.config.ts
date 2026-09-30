import { defineConfig, devices } from '@playwright/test';

const URL_APP = process.env.E2E_URL_APP ?? 'http://localhost:5173';

/** 05-DEVELOPMENT.md §12.6: o E2E roda contra a aplicação real (backend,
 * banco e Mailpit de verdade), então não sobe servidor por conta própria —
 * `docker compose up -d` e `npm run dev` precisam estar de pé. Subir o
 * ambiente aqui esconderia falhas de integração que só aparecem no ambiente
 * completo. */
export default defineConfig({
  testDir: './e2e',
  // Critério da issue #78: o cenário completo em menos de 90 s.
  timeout: 90_000,
  expect: { timeout: 10_000 },
  // Sequencial: os cenários compartilham o mesmo banco de desenvolvimento e
  // o mesmo limitador de requisições por IP.
  workers: 1,
  fullyParallel: false,
  // Sem repetição automática: um E2E que só passa na segunda tentativa está
  // instável, e o critério de aceite pede estabilidade em três execuções.
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: URL_APP,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
