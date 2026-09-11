#!/usr/bin/env node
/**
 * importar-issues.mjs
 *
 * Cria no GitHub os rotulos, as Milestones e as 128 issues descritas em
 * docs/07-ISSUES.md, usando o `gh` CLI.
 *
 * Uso:
 *   node infra/github/importar-issues.mjs                    # simulacao (padrao)
 *   node infra/github/importar-issues.mjs --aplicar          # cria de verdade
 *   node infra/github/importar-issues.mjs --aplicar --somente M0,M1
 *   node infra/github/importar-issues.mjs --aplicar --repo usuario/repositorio
 *
 * Opcoes:
 *   --aplicar          Executa as escritas. Sem esta flag, apenas simula.
 *   --repo <o/r>       Repositorio alvo. Padrao: detectado por `gh repo view`.
 *   --somente <lista>  Importa apenas as Milestones indicadas (ex.: M0,M1,M2).
 *   --pausa <ms>       Intervalo entre criacoes. Padrao 1200 ms.
 *   --branch <nome>    Branch usada nos links dos corpos. Padrao "main".
 *   --sem-rotulos      Nao cria/atualiza rotulos.
 *   --sem-milestones   Nao cria/atualiza Milestones.
 *   --forcar           Ignora o aviso de desalinhamento de numeracao. Leia o README.
 *
 * Retoma de onde parou: o progresso e gravado em .estado-importacao.json.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, '..', '..');
const ARQUIVO_ISSUES = join(RAIZ, 'docs', '07-ISSUES.md');
const ARQUIVO_ROTULOS = join(AQUI, 'rotulos.json');
const ARQUIVO_ESTADO = join(AQUI, '.estado-importacao.json');

const TOTAL_ESPERADO = 128;

// ───────────────────────────────── argumentos ─────────────────────────────────

function lerArgumentos(argv) {
  const op = {
    aplicar: false,
    repo: null,
    somente: null,
    pausa: 1200,
    branch: 'main',
    semRotulos: false,
    semMilestones: false,
    forcar: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--aplicar') op.aplicar = true;
    else if (a === '--repo') op.repo = argv[++i];
    else if (a === '--somente') op.somente = argv[++i].split(',').map((s) => s.trim().toUpperCase());
    else if (a === '--pausa') op.pausa = Number(argv[++i]);
    else if (a === '--branch') op.branch = argv[++i];
    else if (a === '--sem-rotulos') op.semRotulos = true;
    else if (a === '--sem-milestones') op.semMilestones = true;
    else if (a === '--forcar') op.forcar = true;
    else if (a === '--ajuda' || a === '-h') {
      console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
      process.exit(0);
    } else {
      erro(`Argumento desconhecido: ${a}`);
    }
  }
  if (!Number.isFinite(op.pausa) || op.pausa < 0) erro('--pausa deve ser um numero de milissegundos.');
  return op;
}

// ───────────────────────────────── utilidades ─────────────────────────────────

const c = {
  reset: '\x1b[0m', neg: '\x1b[1m', cinza: '\x1b[90m',
  verde: '\x1b[32m', vermelho: '\x1b[31m', amarelo: '\x1b[33m', azul: '\x1b[36m',
};
const ok = (m) => console.log(`${c.verde}✔${c.reset} ${m}`);
const info = (m) => console.log(`${c.azul}·${c.reset} ${m}`);
const aviso = (m) => console.log(`${c.amarelo}!${c.reset} ${m}`);
const passo = (m) => console.log(`\n${c.neg}${m}${c.reset}`);
const detalhe = (m) => console.log(`  ${c.cinza}${m}${c.reset}`);

function erro(m) {
  console.error(`${c.vermelho}✖ ${m}${c.reset}`);
  process.exit(1);
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function gh(args, { permitirFalha = false } = {}) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    if (permitirFalha) return null;
    const saida = [e.stderr, e.stdout].filter(Boolean).join('\n').trim();
    throw new Error(`gh ${args.join(' ')}\n${saida || e.message}`);
  }
}

/** Executa com retentativa em limite secundario de taxa da API. */
async function ghComRetentativa(args, tentativas = 4) {
  for (let t = 1; t <= tentativas; t++) {
    try {
      return gh(args);
    } catch (e) {
      const msg = String(e.message);
      const limite = /secondary rate limit|rate limit|was submitted too quickly|abuse/i.test(msg);
      if (!limite || t === tentativas) throw e;
      const espera = 20_000 * t;
      aviso(`Limite de taxa atingido. Aguardando ${espera / 1000}s (tentativa ${t}/${tentativas - 1})...`);
      await dormir(espera);
    }
  }
}

function lerEstado() {
  if (!existsSync(ARQUIVO_ESTADO)) return { repo: null, milestones: {}, issues: {} };
  let estado;
  try {
    estado = JSON.parse(readFileSync(ARQUIVO_ESTADO, 'utf8'));
  } catch {
    erro(`Estado corrompido em ${ARQUIVO_ESTADO}. Remova o arquivo para comecar do zero.`);
  }
  // Formato antigo guardava apenas o numero da Milestone. Normaliza para
  // { numero, titulo }, pois `gh issue create --milestone` casa por TITULO.
  for (const [chave, valor] of Object.entries(estado.milestones ?? {})) {
    if (typeof valor === 'number') estado.milestones[chave] = { numero: valor, titulo: null };
  }
  return estado;
}

function gravarEstado(estado) {
  writeFileSync(ARQUIVO_ESTADO, `${JSON.stringify(estado, null, 2)}\n`, 'utf8');
}

// ─────────────────────────────────── parsing ──────────────────────────────────

/**
 * Extrai Milestones e issues de docs/07-ISSUES.md.
 *
 * Formato esperado por issue:
 *   #### #N · tipo(escopo): titulo
 *   (vazio)
 *   `Mx` · **P pts** · `rotulo` `rotulo` · Depende de: #A, #B · RF-01, RN-02
 *   (vazio)
 *   corpo...
 */
function analisarDocumento(texto) {
  const linhas = texto.split(/\r?\n/);
  const milestones = [];
  const issues = [];

  let msAtual = null;
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    // Cabecalho de Milestone: "# Milestone 0 — Fundação e Infraestrutura"
    const mMs = /^# Milestone (\d+)\s+[—-]\s+(.+?)\s*$/.exec(linha);
    if (mMs) {
      const descricao = [];
      let j = i + 1;
      while (j < linhas.length && !/^#### /.test(linhas[j]) && !/^# Milestone /.test(linhas[j])) {
        const q = /^>\s?(.*)$/.exec(linhas[j]);
        if (q) descricao.push(q[1].trim());
        j++;
      }
      msAtual = {
        chave: `M${mMs[1]}`,
        titulo: `M${mMs[1]} — ${mMs[2]}`,
        descricao: descricao.filter(Boolean).join('\n'),
      };
      milestones.push(msAtual);
      i++;
      continue;
    }

    // Cabecalho de issue: "#### #1 · chore(infra): titulo"
    const mIss = /^#### #(\d+)\s+[·]\s+(.+?)\s*$/.exec(linha);
    if (mIss) {
      const numero = Number(mIss[1]);
      const titulo = mIss[2].trim();

      // Localiza a linha de metadados (primeira nao-vazia iniciada por crase)
      let j = i + 1;
      while (j < linhas.length && linhas[j].trim() === '') j++;
      const linhaMeta = linhas[j] ?? '';
      if (!/^`M\d+`/.test(linhaMeta)) {
        erro(`Issue #${numero}: linha de metadados nao encontrada (linha ${j + 1}).`);
      }
      const meta = analisarMetadados(linhaMeta, numero);

      // Corpo: da linha seguinte aos metadados ate o separador "---"
      const corpo = [];
      let k = j + 1;
      while (k < linhas.length && linhas[k].trim() !== '---') {
        corpo.push(linhas[k]);
        k++;
      }

      issues.push({
        numero,
        titulo,
        milestone: meta.milestone,
        pontos: meta.pontos,
        rotulos: meta.rotulos,
        depende: meta.depende,
        requisitos: meta.requisitos,
        corpo: corpo.join('\n').trim(),
      });

      i = k + 1;
      continue;
    }

    i++;
  }

  return { milestones, issues };
}

function analisarMetadados(linha, numero) {
  // Separador e " · " (espaco + U+00B7 + espaco)
  const partes = linha.split(' · ').map((p) => p.trim());

  const milestone = (/^`(M\d+)`$/.exec(partes[0]) ?? [])[1];
  if (!milestone) erro(`Issue #${numero}: Milestone ilegivel em "${partes[0]}".`);

  const pontos = Number((/\*\*(\d+) pts\*\*/.exec(partes[1] ?? '') ?? [])[1]);
  if (!Number.isFinite(pontos)) erro(`Issue #${numero}: pontos ilegiveis em "${partes[1]}".`);

  const idxDep = partes.findIndex((p) => p.startsWith('Depende de:'));
  if (idxDep < 0) erro(`Issue #${numero}: segmento "Depende de:" ausente.`);

  // Rotulos: tokens entre crases nos segmentos entre pontos e "Depende de"
  const rotulos = [];
  for (const seg of partes.slice(2, idxDep)) {
    for (const m of seg.matchAll(/`([^`]+)`/g)) rotulos.push(m[1]);
  }

  const brutoDep = partes[idxDep].replace('Depende de:', '').trim();
  const depende = [...brutoDep.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));

  const requisitos = partes.slice(idxDep + 1).join(' · ').trim();

  return { milestone, pontos, rotulos, depende, requisitos };
}

/**
 * Reescreve links relativos dos documentos para URLs absolutas.
 *
 * No corpo de uma issue, o GitHub resolve caminhos relativos contra a raiz do
 * repositorio — nao contra `docs/`. Assim, "](02-ARCHITECTURE.md#x)" apontaria
 * para um arquivo inexistente. URL absoluta elimina a ambiguidade.
 */
function absolutizarLinks(texto, repo, branch) {
  const base = `https://github.com/${repo}/blob/${branch}/docs`;
  return texto
    .replace(/\]\((\d{2}-[A-Z_-]+\.md)(#[^)\s]*)?\)/g, (_, arq, anc) => `](${base}/${arq}${anc ?? ''})`)
    .replace(/\]\((assets\/[^)\s]+)\)/g, (_, cam) => `](${base}/${cam})`);
}

function montarCorpo(issue, repo = null, branch = 'main') {
  const corpo = repo ? absolutizarLinks(issue.corpo, repo, branch) : issue.corpo;
  const base = repo ? `https://github.com/${repo}/blob/${branch}/docs` : '../blob/main/docs';

  const linhas = [corpo, '', '---', ''];

  const meta = [
    `**Milestone:** ${issue.milestone}`,
    `**Estimativa:** ${issue.pontos} pontos`,
  ];
  if (issue.requisitos && issue.requisitos !== '—') meta.push(`**Requisitos:** ${issue.requisitos}`);
  if (issue.depende.length) meta.push(`**Depende de:** ${issue.depende.map((n) => `#${n}`).join(', ')}`);

  linhas.push(meta.join(' · '));
  linhas.push('');
  linhas.push(
    `<sub>Especificação completa em [\`docs/07-ISSUES.md\`](${base}/07-ISSUES.md) ` +
      `(issue #${issue.numero} do documento). Esta issue herda a ` +
      `[Definição de Pronto](${base}/05-DEVELOPMENT.md#13-definição-de-pronto).</sub>`,
  );

  return linhas.join('\n');
}

// ─────────────────────────────── verificacoes ────────────────────────────────

function detectarRepositorio(op) {
  if (op.repo) return op.repo;
  const r = gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner'], {
    permitirFalha: true,
  });
  if (!r) {
    erro(
      'Nao foi possivel detectar o repositorio.\n' +
        '  Verifique se este diretorio e um repositorio Git com remoto no GitHub,\n' +
        '  ou informe explicitamente: --repo usuario/repositorio\n' +
        '  Consulte infra/github/README.md, secao "Pre-requisitos".',
    );
  }
  return r;
}

function verificarPreRequisitos(op) {
  passo('1. Verificando pre-requisitos');

  const versao = gh(['--version'], { permitirFalha: true });

  // Em simulacao, a ausencia do gh nao impede inspecionar o plano.
  if (!versao) {
    const msg = '`gh` (GitHub CLI) nao encontrado no PATH. Instale: https://cli.github.com';
    if (op.aplicar) erro(msg);
    aviso(msg);
    aviso('Prosseguindo em simulacao sem consultar o GitHub.');
    return { repo: op.repo ?? 'OWNER/REPOSITORIO', ghDisponivel: false };
  }
  detalhe(versao.split('\n')[0]);

  const auth = gh(['auth', 'status'], { permitirFalha: true });
  if (auth === null) {
    const msg = '`gh` nao autenticado. Execute: gh auth login';
    if (op.aplicar) erro(msg);
    aviso(msg);
    return { repo: op.repo ?? 'OWNER/REPOSITORIO', ghDisponivel: false };
  }
  ok('gh instalado e autenticado');

  const repo = detectarRepositorio(op);
  ok(`Repositorio alvo: ${c.neg}${repo}${c.reset}`);

  const habilitado = gh(
    ['repo', 'view', repo, '--json', 'hasIssuesEnabled', '--jq', '.hasIssuesEnabled'],
    { permitirFalha: true },
  );
  if (habilitado === 'false') {
    erro(`Issues estao desabilitadas em ${repo}. Habilite em Settings > Features > Issues.`);
  }

  return { repo, ghDisponivel: true };
}

/** Maior numero ja usado por issue OU pull request (compartilham a sequencia). */
function obterMaiorNumero(repo) {
  const saida = gh(
    [
      'api',
      `repos/${repo}/issues?state=all&per_page=1&sort=created&direction=desc`,
      '--jq',
      '.[0].number // 0',
    ],
    { permitirFalha: true },
  );
  return Number(saida ?? 0) || 0;
}

function verificarAlinhamento(repo, estado, op, issuesAImportar, totalIssues, ghDisponivel) {
  passo('2. Verificando alinhamento de numeracao');

  const jaCriadas = Object.keys(estado.issues).length;
  const maior = ghDisponivel ? obterMaiorNumero(repo) : 0;
  if (ghDisponivel) detalhe(`Maior numero em uso no repositorio: ${maior}`);
  else detalhe('Verificacao remota ignorada (gh indisponivel).');
  detalhe(`Issues ja importadas (estado local): ${jaCriadas}`);

  if (jaCriadas === 0 && maior !== 0) {
    const msg =
      `O repositorio ja possui issues ou pull requests (maior numero: ${maior}).\n\n` +
      `  No GitHub, issues e PRs compartilham a MESMA sequencia de numeros.\n` +
      `  Como as issues referenciam umas as outras por "Depende de: #N" usando a\n` +
      `  numeracao de docs/07-ISSUES.md (1 a 128), importar agora produziria\n` +
      `  referencias cruzadas apontando para os alvos errados.\n\n` +
      `  Opcoes:\n` +
      `    a) Use um repositorio novo e vazio (recomendado);\n` +
      `    b) Prossiga com --forcar e aceite que os "Depende de: #N" ficarao\n` +
      `       deslocados em ${maior} posicoes (o rodape de cada issue continua\n` +
      `       correto, pois cita o numero do documento).`;
    if (!op.forcar) erro(msg);
    aviso(msg);
  }

  // Coerencia do estado salvo
  const desalinhadas = Object.entries(estado.issues).filter(([doc, gh_]) => Number(doc) !== gh_);
  if (desalinhadas.length) {
    aviso(
      `${desalinhadas.length} issue(s) importada(s) com numero diferente do documento. ` +
        `Ex.: doc #${desalinhadas[0][0]} -> GitHub #${desalinhadas[0][1]}.`,
    );
  }

  if (totalIssues !== TOTAL_ESPERADO) {
    aviso(`Documento tem ${totalIssues} issues; o esperado sao ${TOTAL_ESPERADO}.`);
  } else {
    ok(`${TOTAL_ESPERADO} issues encontradas no documento`);
  }

  if (op.somente) {
    ok(`Filtro ativo: ${op.somente.join(', ')} (${issuesAImportar} issue(s) a importar)`);
  }
}

// ──────────────────────────────── operacoes ──────────────────────────────────

async function sincronizarRotulos(repo, rotulosUsados, op) {
  passo('3. Rotulos');

  const definicoes = JSON.parse(readFileSync(ARQUIVO_ROTULOS, 'utf8'));
  const semDefinicao = [...rotulosUsados].filter((r) => !definicoes[r]);
  if (semDefinicao.length) {
    aviso(`Sem definicao de cor (usarao cinza): ${semDefinicao.join(', ')}`);
  }

  let criados = 0;
  for (const rotulo of [...rotulosUsados].sort()) {
    const def = definicoes[rotulo] ?? { cor: '94A3B8', descricao: '' };
    if (!op.aplicar) {
      detalhe(`[simulacao] rotulo "${rotulo}" (#${def.cor})`);
      criados++;
      continue;
    }
    await ghComRetentativa([
      'label', 'create', rotulo,
      '--repo', repo,
      '--color', def.cor,
      '--description', def.descricao ?? '',
      '--force',
    ]);
    criados++;
    process.stdout.write(`\r  ${criados}/${rotulosUsados.size} rotulos...`);
    await dormir(Math.min(op.pausa, 400));
  }
  if (op.aplicar) process.stdout.write('\r');
  ok(`${criados} rotulo(s) ${op.aplicar ? 'criados/atualizados' : 'a criar'}`);
}

async function sincronizarMilestones(repo, milestones, estado, op) {
  passo('4. Milestones');

  const existentes = new Map();
  if (op.aplicar) {
    const bruto = gh([
      'api', `repos/${repo}/milestones?state=all&per_page=100`,
      '--jq', '.[] | "\\(.number)\\t\\(.title)"',
    ], { permitirFalha: true });
    for (const linha of (bruto ?? '').split('\n').filter(Boolean)) {
      const [num, titulo] = linha.split('\t');
      existentes.set(titulo, Number(num));
    }
  }

  for (const ms of milestones) {
    if (existentes.has(ms.titulo)) {
      estado.milestones[ms.chave] = { numero: existentes.get(ms.titulo), titulo: ms.titulo };
      gravarEstado(estado);
      detalhe(`${ms.chave} ja existe (numero ${existentes.get(ms.titulo)})`);
      continue;
    }
    if (!op.aplicar) {
      detalhe(`[simulacao] ${ms.titulo}`);
      continue;
    }
    const saida = await ghComRetentativa([
      'api', `repos/${repo}/milestones`,
      '-X', 'POST',
      '-f', `title=${ms.titulo}`,
      '-f', `description=${ms.descricao}`,
      '-f', 'state=open',
      '--jq', '.number',
    ]);
    estado.milestones[ms.chave] = { numero: Number(saida), titulo: ms.titulo };
    gravarEstado(estado);
    ok(`${ms.titulo} (numero ${saida})`);
    await dormir(Math.min(op.pausa, 500));
  }

  if (!op.aplicar) ok(`${milestones.length} Milestone(s) a criar`);
}

async function criarIssues(repo, issues, milestones, estado, op) {
  passo('5. Issues');

  // `gh issue create --milestone` resolve a Milestone pelo TITULO, nao pelo
  // numero. Preferimos o titulo confirmado no estado (que reflete o que existe
  // no GitHub) e caimos no titulo do documento como alternativa.
  const tituloDoDocumento = new Map(milestones.map((m) => [m.chave, m.titulo]));
  const tituloDaMilestone = (chave) =>
    estado.milestones[chave]?.titulo ?? tituloDoDocumento.get(chave) ?? null;

  const dirTmp = join(tmpdir(), 'pfm-import-issues');
  mkdirSync(dirTmp, { recursive: true });

  let criadas = 0;
  let puladas = 0;

  for (const issue of issues) {
    if (estado.issues[issue.numero]) {
      puladas++;
      continue;
    }

    const rotulo = `#${String(issue.numero).padStart(3, ' ')} ${issue.titulo}`;

    if (!op.aplicar) {
      detalhe(`[simulacao] ${rotulo}`);
      detalhe(
        `             ${issue.milestone} · ${issue.pontos} pts · ` +
          `${issue.rotulos.join(', ')}${issue.depende.length ? ` · dep ${issue.depende.map((n) => `#${n}`).join(',')}` : ''}`,
      );
      criadas++;
      continue;
    }

    const arquivoCorpo = join(dirTmp, `issue-${issue.numero}.md`);
    writeFileSync(arquivoCorpo, montarCorpo(issue, repo, op.branch), 'utf8');

    const args = [
      'issue', 'create',
      '--repo', repo,
      '--title', issue.titulo,
      '--body-file', arquivoCorpo,
    ];
    for (const r of issue.rotulos) args.push('--label', r);
    const tituloMs = tituloDaMilestone(issue.milestone);
    if (tituloMs) args.push('--milestone', tituloMs);

    let url;
    try {
      url = await ghComRetentativa(args);
    } catch (e) {
      rmSync(arquivoCorpo, { force: true });
      console.error(`\n${c.vermelho}✖ Falha ao criar a issue #${issue.numero}${c.reset}`);
      console.error(String(e.message));
      console.error(
        `\n${c.amarelo}O progresso foi salvo em ${ARQUIVO_ESTADO}.\n` +
          `Corrija a causa e execute o comando novamente: a importacao retoma daqui.${c.reset}`,
      );
      process.exit(1);
    }
    rmSync(arquivoCorpo, { force: true });

    const numeroGh = Number((/\/issues\/(\d+)\s*$/.exec(url) ?? [])[1]);
    estado.issues[issue.numero] = numeroGh || null;
    gravarEstado(estado);

    criadas++;
    const alerta = numeroGh && numeroGh !== issue.numero ? `${c.amarelo} (GitHub #${numeroGh})${c.reset}` : '';
    console.log(`  ${c.verde}✔${c.reset} ${rotulo}${alerta}`);

    await dormir(op.pausa);
  }

  rmSync(dirTmp, { recursive: true, force: true });

  if (puladas) info(`${puladas} issue(s) puladas (já importadas anteriormente)`);
  ok(`${criadas} issue(s) ${op.aplicar ? 'criadas' : 'a criar'}`);
}

// ─────────────────────────────────── main ────────────────────────────────────

async function principal() {
  const op = lerArgumentos(process.argv.slice(2));

  console.log(`${c.neg}Importacao de Milestones e issues — Gerenciador de Financas${c.reset}`);
  console.log(
    op.aplicar
      ? `${c.amarelo}MODO APLICAR: as escritas serao efetivadas no GitHub.${c.reset}`
      : `${c.azul}MODO SIMULACAO: nada sera criado. Use --aplicar para efetivar.${c.reset}`,
  );

  if (!existsSync(ARQUIVO_ISSUES)) erro(`Arquivo nao encontrado: ${ARQUIVO_ISSUES}`);

  const { milestones, issues } = analisarDocumento(readFileSync(ARQUIVO_ISSUES, 'utf8'));
  if (!issues.length) erro('Nenhuma issue reconhecida no documento. O formato pode ter mudado.');

  const { repo, ghDisponivel } = verificarPreRequisitos(op);
  const estado = lerEstado();

  if (estado.repo && estado.repo !== repo) {
    erro(
      `O estado salvo pertence ao repositorio "${estado.repo}", mas o alvo agora e "${repo}".\n` +
        `  Remova ${ARQUIVO_ESTADO} para importar em outro repositorio.`,
    );
  }
  estado.repo = repo;

  const msFiltradas = op.somente ? milestones.filter((m) => op.somente.includes(m.chave)) : milestones;
  const issFiltradas = op.somente ? issues.filter((i) => op.somente.includes(i.milestone)) : issues;

  if (op.somente && !issFiltradas.length) {
    erro(`Nenhuma issue nas Milestones informadas: ${op.somente.join(', ')}`);
  }

  verificarAlinhamento(repo, estado, op, issFiltradas.length, issues.length, ghDisponivel);

  const rotulosUsados = new Set(issFiltradas.flatMap((i) => i.rotulos));

  if (!op.semRotulos) await sincronizarRotulos(repo, rotulosUsados, op);
  else info('Rotulos ignorados (--sem-rotulos)');

  if (!op.semMilestones) await sincronizarMilestones(repo, msFiltradas, estado, op);
  else info('Milestones ignoradas (--sem-milestones)');

  await criarIssues(repo, issFiltradas, milestones, estado, op);

  if (op.aplicar) gravarEstado(estado);

  passo('Resumo');
  const pontos = issFiltradas.reduce((s, i) => s + i.pontos, 0);
  console.log(`  Milestones : ${msFiltradas.length}`);
  console.log(`  Issues     : ${issFiltradas.length}`);
  console.log(`  Rotulos    : ${rotulosUsados.size}`);
  console.log(`  Pontos     : ${pontos}`);

  if (op.aplicar) {
    console.log(`\n${c.verde}${c.neg}Importacao concluida.${c.reset}`);
    console.log(`  Issues:     https://github.com/${repo}/issues`);
    console.log(`  Milestones: https://github.com/${repo}/milestones`);
    console.log(`\n  Estado gravado em ${ARQUIVO_ESTADO} (nao versione este arquivo).`);
  } else {
    console.log(`\n${c.azul}Simulacao concluida. Para efetivar:${c.reset}`);
    console.log(`  node infra/github/importar-issues.mjs --aplicar${op.repo ? ` --repo ${op.repo}` : ''}`);
  }
}

// Executa apenas quando invocado diretamente, permitindo importar as funcoes
// de parsing em testes sem disparar chamadas ao `gh`.
const executadoDiretamente =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executadoDiretamente) {
  principal().catch((e) => erro(e.stack ?? String(e)));
}

export { analisarDocumento, analisarMetadados, montarCorpo, ARQUIVO_ISSUES };
