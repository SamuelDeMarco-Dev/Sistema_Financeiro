#!/usr/bin/env node
/**
 * verificar-parsing.mjs
 *
 * Valida que docs/07-ISSUES.md e interpretado corretamente pelo importador,
 * sem nenhuma chamada de rede. Rode isto sempre que editar o documento.
 *
 *   node infra/github/verificar-parsing.mjs
 */

import { readFileSync } from 'node:fs';
import { analisarDocumento, montarCorpo, ARQUIVO_ISSUES } from './importar-issues.mjs';

const TOTAL_ISSUES = 128;
const TOTAL_PONTOS = 603;
const PONTOS_POR_MS = {
  M0: 34, M1: 55, M2: 42, M3: 76, M4: 50, M5: 42,
  M6: 71, M7: 29, M8: 63, M9: 52, M10: 47, M11: 42,
};

const falhas = [];
const reprovar = (m) => falhas.push(m);

const { milestones, issues } = analisarDocumento(readFileSync(ARQUIVO_ISSUES, 'utf8'));

console.log('Verificacao de parsing de docs/07-ISSUES.md\n');

// ── Milestones ───────────────────────────────────────────────────────────────
console.log('Milestones detectadas:');
for (const m of milestones) {
  const primeiraLinha = (m.descricao.split('\n')[0] ?? '').slice(0, 62);
  console.log(`  ${m.chave.padEnd(4)} ${m.titulo}`);
  console.log(`       ${primeiraLinha}`);
  if (!m.descricao) reprovar(`${m.chave} sem descricao.`);
}
if (milestones.length !== 12) reprovar(`Esperadas 12 Milestones, encontradas ${milestones.length}.`);

// ── Issues ───────────────────────────────────────────────────────────────────
console.log(`\nIssues detectadas: ${issues.length}`);
if (issues.length !== TOTAL_ISSUES) {
  reprovar(`Esperadas ${TOTAL_ISSUES} issues, encontradas ${issues.length}.`);
}

const numeros = issues.map((i) => i.numero);
for (let n = 1; n <= TOTAL_ISSUES; n++) {
  if (!numeros.includes(n)) reprovar(`Issue #${n} ausente.`);
}
const duplicadas = numeros.filter((n, i) => numeros.indexOf(n) !== i);
if (duplicadas.length) reprovar(`Numeros duplicados: ${[...new Set(duplicadas)].join(', ')}`);

const emOrdem = numeros.every((n, i) => i === 0 || n > numeros[i - 1]);
if (!emOrdem) reprovar('Issues fora de ordem crescente no documento (quebra as referencias cruzadas).');

// ── Integridade de cada issue ────────────────────────────────────────────────
for (const i of issues) {
  if (!i.titulo || i.titulo.length < 10) reprovar(`#${i.numero}: titulo suspeito "${i.titulo}".`);
  if (!/^(feat|fix|docs|refactor|test|chore|perf|style|build|ci|revert)\(/.test(i.titulo)) {
    reprovar(`#${i.numero}: titulo fora de Conventional Commits: "${i.titulo}".`);
  }
  if (!PONTOS_POR_MS[i.milestone]) reprovar(`#${i.numero}: Milestone desconhecida "${i.milestone}".`);
  if (!i.rotulos.length) reprovar(`#${i.numero}: sem rotulos.`);
  if (!i.corpo || i.corpo.length < 120) reprovar(`#${i.numero}: corpo curto (${i.corpo.length} chars).`);
  if (!i.corpo.includes('**Checklist')) reprovar(`#${i.numero}: sem secao de checklist.`);
  if (!i.corpo.includes('**Critérios de aceite**')) reprovar(`#${i.numero}: sem criterios de aceite.`);
  for (const d of i.depende) {
    if (d >= i.numero) reprovar(`#${i.numero}: depende de #${d}, que nao a antecede.`);
    if (!numeros.includes(d)) reprovar(`#${i.numero}: depende de #${d}, que nao existe.`);
  }
  // Sentinelas de mojibake construidas por codigo, para que este arquivo-fonte
  // permaneca em ASCII puro e nao dispare os proprios scanners de encoding.
  const A_CIRCUNFLEXO = String.fromCharCode(0x00c2);
  const SUBSTITUICAO = String.fromCharCode(0xfffd);
  if (i.corpo.includes(A_CIRCUNFLEXO) || i.corpo.includes(SUBSTITUICAO)) {
    reprovar(`#${i.numero}: corpo com corrupcao de encoding.`);
  }
}

// ── Pontos por Milestone ─────────────────────────────────────────────────────
console.log('\nPontos por Milestone:');
console.log('  MS    Issues   Calc  Declarado  Status');
let somaGeral = 0;
for (const [chave, esperado] of Object.entries(PONTOS_POR_MS)) {
  const doMs = issues.filter((i) => i.milestone === chave);
  const soma = doMs.reduce((s, i) => s + i.pontos, 0);
  somaGeral += soma;
  const conforme = soma === esperado;
  if (!conforme) reprovar(`Pontos de ${chave}: ${soma} != ${esperado}.`);
  console.log(
    `  ${chave.padEnd(5)} ${String(doMs.length).padStart(6)} ${String(soma).padStart(6)} ` +
      `${String(esperado).padStart(10)}  ${conforme ? 'OK' : 'DIVERGE'}`,
  );
}
console.log(`  ${'TOTAL'.padEnd(5)} ${String(issues.length).padStart(6)} ${String(somaGeral).padStart(6)} ${String(TOTAL_PONTOS).padStart(10)}`);
if (somaGeral !== TOTAL_PONTOS) reprovar(`Total de pontos: ${somaGeral} != ${TOTAL_PONTOS}.`);

// ── Rotulos ──────────────────────────────────────────────────────────────────
const rotulos = new Set(issues.flatMap((i) => i.rotulos));
const definidos = JSON.parse(readFileSync(new URL('./rotulos.json', import.meta.url), 'utf8'));
const semCor = [...rotulos].filter((r) => !definidos[r]);

console.log(`\nRotulos distintos usados: ${rotulos.size}`);
console.log(`  ${[...rotulos].sort().join(', ')}`);
if (semCor.length) reprovar(`Rotulos sem cor em rotulos.json: ${semCor.join(', ')}`);

// ── Amostra de corpo renderizado ─────────────────────────────────────────────
console.log('\n─── Amostra do corpo gerado (issue #23, repo ficticio) ───');
const amostra = montarCorpo(issues.find((i) => i.numero === 23), 'exemplo/pfm', 'main');
console.log(amostra);
console.log('──────────────────────────────────────────────────────────');

// Nenhum link relativo de documento deve sobrar apos a absolutizacao
const relativosRemanescentes = [...amostra.matchAll(/\]\((?!https?:)([^)]+)\)/g)].map((m) => m[1]);
if (relativosRemanescentes.length) {
  reprovar(
    `Links relativos nao absolutizados no corpo: ${relativosRemanescentes.join(', ')} ` +
      `(quebrariam dentro da issue no GitHub).`,
  );
}

// ── Resultado ────────────────────────────────────────────────────────────────
if (falhas.length === 0) {
  console.log('\n\x1b[32m✔ Parsing validado sem falhas.\x1b[0m');
  process.exit(0);
}
console.log(`\n\x1b[31m✖ ${falhas.length} falha(s):\x1b[0m`);
for (const f of falhas) console.log(`  - ${f}`);
process.exit(1);
