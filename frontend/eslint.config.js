// @ts-check
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  jsxA11y.flatConfigs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        // tsconfig.app.json (src/) + tsconfig.node.json (configs) e a
        // configuracao padrao de projeto Vite. O aviso de "multiplos
        // projetos" impresso no stderr e so um lembrete de performance —
        // nao falha o lint (exit code 0) nem conta como warning do ESLint.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    // eslint-plugin-react-hooks@7 ainda exporta `configs.recommended`/
    // `configs['recommended-latest']` no formato legado (`plugins:
    // ['react-hooks']`, array de string), incompativel com flat config —
    // por isso registramos o plugin e copiamos so o mapa de regras.
    plugins: { import: importPlugin, 'react-hooks': reactHooks },
    settings: {
      'import/resolver': {
        typescript: { project: ['./tsconfig.app.json', './tsconfig.node.json'] },
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // §5.2 — tipos de retorno explicitos em toda funcao EXPORTADA
      // (componentes incluidos: `export function Foo(): ReactElement`).
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
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
            'Leia variaveis via import.meta.env (vite-env.d.ts) — process.env nao existe no browser.',
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
    },
  },
  // Arquivos de configuracao na raiz do pacote usam o tsconfig.node.json,
  // que nao inclui `src/` — sem type-checking cruzado entre os dois.
  {
    files: [
      'vite.config.ts',
      'vitest.config.ts',
      'tailwind.config.ts',
      'postcss.config.js',
      'eslint.config.js',
    ],
    extends: [tseslint.configs.disableTypeChecked],
  },
  // Specs: mocks tipados como `any` pelo proprio vitest/testing-library em
  // alguns pontos, e console liberado (falhas de teste imprimem contexto).
  {
    files: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  // E2E (Playwright) roda em Node, fora do navegador: `process.env` e' a
  // forma correta de ler o ambiente ali — a proibicao existe para o codigo
  // do app, onde `process` nao existe.
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      'no-restricted-properties': 'off',
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
);
