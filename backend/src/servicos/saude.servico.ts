import { constants as constantesFs, readFileSync } from 'node:fs';
import { access, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ambiente } from '@/configuracao/ambiente';
import * as saudeRepositorio from '@/repositorios/saude.repositorio';

const DIRETORIO_MIGRATIONS = path.resolve(process.cwd(), 'prisma', 'migrations');

function obterMensagemErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : 'Erro desconhecido.';
}

function obterVersaoPacote(): string {
  const conteudo = readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8');
  return (JSON.parse(conteudo) as { version: string }).version;
}

const VERSAO_PACOTE = obterVersaoPacote();

export interface StatusLiveness {
  status: 'ok';
  versao: string;
  ambiente: string;
  tempoAtivoSegundos: number;
}

export function obterStatusLiveness(): StatusLiveness {
  return {
    status: 'ok',
    versao: VERSAO_PACOTE,
    ambiente: ambiente.NODE_ENV,
    tempoAtivoSegundos: Math.floor(process.uptime()),
  };
}

type VerificacaoBanco = { status: 'ok'; latenciaMs: number } | { status: 'erro'; mensagem: string };
type VerificacaoMigrations =
  { status: 'ok'; pendentes: number } | { status: 'erro'; mensagem: string };
type VerificacaoArmazenamento =
  { status: 'ok'; gravavel: true } | { status: 'erro'; mensagem: string };

export interface VerificacoesProntidao {
  banco: VerificacaoBanco;
  migrations: VerificacaoMigrations;
  armazenamento: VerificacaoArmazenamento;
}

export interface StatusProntidao {
  status: 'pronto' | 'indisponivel';
  verificacoes: VerificacoesProntidao;
}

async function verificarBanco(): Promise<VerificacoesProntidao['banco']> {
  const inicio = process.hrtime.bigint();

  try {
    await saudeRepositorio.verificarConexaoBanco();
    const latenciaMs = Number(process.hrtime.bigint() - inicio) / 1_000_000;
    return { status: 'ok', latenciaMs: Math.round(latenciaMs) };
  } catch (erro) {
    return { status: 'erro', mensagem: obterMensagemErro(erro) };
  }
}

async function listarMigrationsNoDisco(): Promise<string[]> {
  try {
    const entradas = await readdir(DIRETORIO_MIGRATIONS, { withFileTypes: true });
    return entradas.filter((entrada) => entrada.isDirectory()).map((entrada) => entrada.name);
  } catch {
    // Nenhuma migration foi criada ainda (schema ainda vazio, issue #10) —
    // nao ha o que estar pendente.
    return [];
  }
}

async function verificarMigrations(): Promise<VerificacoesProntidao['migrations']> {
  try {
    const noDisco = await listarMigrationsNoDisco();

    if (noDisco.length === 0) {
      return { status: 'ok', pendentes: 0 };
    }

    const aplicadas = new Set(await saudeRepositorio.buscarMigrationsAplicadas());
    const pendentes = noDisco.filter((nome) => !aplicadas.has(nome)).length;

    return { status: 'ok', pendentes };
  } catch (erro) {
    return { status: 'erro', mensagem: obterMensagemErro(erro) };
  }
}

async function verificarArmazenamento(): Promise<VerificacoesProntidao['armazenamento']> {
  try {
    await mkdir(ambiente.DIRETORIO_UPLOADS, { recursive: true });
    await access(ambiente.DIRETORIO_UPLOADS, constantesFs.W_OK);
    return { status: 'ok', gravavel: true };
  } catch (erro) {
    return { status: 'erro', mensagem: obterMensagemErro(erro) };
  }
}

export async function obterStatusProntidao(): Promise<StatusProntidao> {
  const [banco, migrations, armazenamento] = await Promise.all([
    verificarBanco(),
    verificarMigrations(),
    verificarArmazenamento(),
  ]);

  const verificacoes: VerificacoesProntidao = { banco, migrations, armazenamento };
  const indisponivel = [banco, migrations, armazenamento].some((v) => v.status === 'erro');

  return { status: indisponivel ? 'indisponivel' : 'pronto', verificacoes };
}
