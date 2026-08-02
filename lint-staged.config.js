// Config em JS (nao um bloco "lint-staged" no package.json, como em
// 05-DEVELOPMENT.md §8.3): cada workspace tem seu proprio eslint.config.js,
// e as regras de fronteira usam padroes `files` relativos ao diretorio de
// execucao do ESLint — `eslint --config backend/eslint.config.js` invocado
// a partir da raiz do repo NAO casa esses padroes (eles esperam
// `src/servicos/...`, nao `backend/src/servicos/...`). Por isso cada
// comando roda via `npm run --workspace=<pacote>`, que troca o cwd do
// processo para dentro do workspace antes de chamar o ESLint.
import { relative, resolve } from 'node:path';

const RAIZ = process.cwd();

function comandosWorkspace(workspace, extensoes) {
  return (arquivosAbsolutos) => {
    const raizWorkspace = resolve(RAIZ, workspace);
    const relativos = arquivosAbsolutos
      .filter((arquivo) => extensoes.some((ext) => arquivo.endsWith(ext)))
      .map((arquivo) => relative(raizWorkspace, arquivo));

    if (relativos.length === 0) return [];

    const args = relativos.map((caminho) => JSON.stringify(caminho)).join(' ');
    const relativosARaiz = arquivosAbsolutos
      .filter((arquivo) => extensoes.some((ext) => arquivo.endsWith(ext)))
      .map((arquivo) => JSON.stringify(relative(RAIZ, arquivo)))
      .join(' ');

    return [
      `npm run lint:fix --workspace=${workspace} -- ${args}`,
      `npx prettier --ignore-path .prettierignore --write ${relativosARaiz}`,
    ];
  };
}

export default {
  'backend/**/*.ts': comandosWorkspace('backend', ['.ts']),
  'frontend/**/*.{ts,tsx}': comandosWorkspace('frontend', ['.ts', '.tsx']),
  '*.{json,md,yml,yaml}': ['prettier --ignore-path .prettierignore --write'],
  'backend/prisma/**/*.prisma': ['npm run prisma:format --workspace=backend'],
};
