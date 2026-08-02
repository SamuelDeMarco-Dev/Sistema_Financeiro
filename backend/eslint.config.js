// @ts-check
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Tipos reconhecidos pelas fronteiras de 05-DEVELOPMENT.md §6.5. So as 5
// camadas com restricoes mutuas entram aqui — utilitarios/erros/tipos/
// validadores nao sao "elementos" reconhecidos, entao continuam livres
// para serem importados de qualquer lugar (nao sao o alvo da regra).
// Sem o `/*` final: cada pasta e o "elemento" inteiro (todo arquivo
// diretamente dentro dela), nao uma pasta-por-modulo — nossa estrutura e
// de arquivos soltos (`src/servicos/saude.servico.ts`), nao subpastas por
// dominio. Ver nota sobre `import/resolver` abaixo.
const ELEMENTOS_FRONTEIRA = [
  { type: 'rota', pattern: 'src/rotas' },
  { type: 'controlador', pattern: 'src/controladores' },
  { type: 'servico', pattern: 'src/servicos' },
  { type: 'repositorio', pattern: 'src/repositorios' },
  { type: 'middleware', pattern: 'src/middlewares' },
];

// A instancia de PrismaClient (`@/banco/cliente`) so pode ser importada em
// repositorios/ e banco/ (CLAUDE.md regra 2) — index.ts (composicao raiz)
// e a excecao deliberada: precisa de `prisma.$disconnect()` no
// encerramento gracioso, o que nao e "logica de negocio via prisma".
const DIRETORIOS_SEM_PRISMA = [
  'src/rotas/**/*.ts',
  'src/controladores/**/*.ts',
  'src/servicos/**/*.ts',
  'src/middlewares/**/*.ts',
];

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/generated/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { import: importPlugin, boundaries },
    settings: {
      // boundaries so reconhece imports por alias (`@/servicos/...`) como
      // "locais" (em vez de "externos") atraves do resolvedor de import —
      // o setting legado `boundaries/alias` foi descontinuado a favor deste.
      'import/resolver': { typescript: { project: './tsconfig.json' } },
      'boundaries/elements': ELEMENTOS_FRONTEIRA,
      'boundaries/ignore': ['**/*.spec.ts'],
    },
    rules: {
      // §5.2 — tipos de retorno explicitos em toda funcao EXPORTADA (nao
      // em toda funcao — helpers locais ficam livres para inferencia).
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Numero/booleano em template literal e uso comum e legivel
      // (`Requisicao em ${porta}`) — so valores realmente ambiguos
      // (objetos, `any`) continuam proibidos.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: 'error',
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message:
            'Leia variaveis de ambiente somente via configuracao/ambiente.ts (05-DEVELOPMENT.md §2.3).',
        },
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          pathGroups: [{ pattern: '@/**', group: 'internal', position: 'after' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      // §6.5: a matriz de camadas. `default: 'disallow'` fecha tudo que nao
      // esta explicitamente permitido — inclusive uma camada importar a si
      // mesma em sentido reverso (ex.: repositorio -> servico).
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'rota' } },
              allow: { to: { element: { types: { anyOf: ['controlador', 'middleware'] } } } },
            },
            {
              // 'middleware' aqui e para utilitarios como asyncHandler
              // (middlewares/async-handler.ts) — nao para middlewares de
              // dominio (autenticar, validar), que rotas montam direto.
              from: { element: { type: 'controlador' } },
              allow: { to: { element: { types: { anyOf: ['servico', 'middleware'] } } } },
            },
            {
              from: { element: { type: 'servico' } },
              allow: { to: { element: { types: { anyOf: ['servico', 'repositorio'] } } } },
            },
            {
              from: { element: { type: 'middleware' } },
              allow: { to: { element: { type: 'servico' } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: DIRETORIOS_SEM_PRISMA,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/banco/cliente',
              message:
                'A instancia de PrismaClient so pode ser importada em repositorios/ e banco/ (CLAUDE.md regra 2).',
            },
          ],
        },
      ],
    },
  },
  // express nao pertence a servicos/ nem repositorios/ — nada de req/res
  // fora das camadas que efetivamente lidam com HTTP (CLAUDE.md regra 3).
  {
    files: ['src/servicos/**/*.ts', 'src/repositorios/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/banco/cliente',
              message:
                'A instancia de PrismaClient so pode ser importada em repositorios/ e banco/ (CLAUDE.md regra 2).',
            },
            {
              name: 'express',
              message:
                'express nao pertence a servicos/ nem repositorios/ (05-DEVELOPMENT.md §6.5).',
            },
          ],
        },
      ],
    },
  },
  // repositorios/ e o unico lugar autorizado a importar a instancia de
  // Prisma (sobrescreve o bloco anterior so nesse ponto).
  {
    files: ['src/repositorios/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'express',
              message: 'express nao pertence a repositorios/ (05-DEVELOPMENT.md §6.5).',
            },
          ],
        },
      ],
    },
  },
  // configuracao/ambiente.ts e o unico arquivo de codigo de aplicacao
  // autorizado a ler process.env — os demais importam `ambiente`.
  {
    files: ['src/configuracao/ambiente.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  // Arquivos de configuracao na raiz do pacote nao fazem parte do
  // tsconfig.json (src/testes/prisma) — sem type-checking para eles.
  // vitest.config.ts tambem le process.env.DATABASE_URL diretamente: e
  // config de teste, nao codigo de aplicacao, e precisa decidir entre o
  // valor que a CI ja injetou no ambiente e o padrao local antes de
  // `ambiente` sequer existir.
  {
    files: ['eslint.config.js', 'vitest.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { 'no-restricted-properties': 'off' },
  },
  // Testes: console e liberado (falhas de teste imprimem contexto);
  // objetos mockados (`res.status = vi.fn()`) disparam falso-positivo em
  // unbound-method, que assume extracao de metodo de instancia real;
  // specs frequentemente montam `process.env` para subprocessos
  // (testes/integracao/ambiente.spec.ts) em vez de ler config da app.
  {
    files: ['testes/**/*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/unbound-method': 'off',
      'no-restricted-properties': 'off',
    },
  },
  eslintConfigPrettier,
);
