import type { Conta, Prisma } from '@prisma/client';

export interface ContaDTO {
  id: string;
  nome: string;
  tipo: Conta['tipo'];
  instituicao: string | null;
  saldoInicial: Prisma.Decimal;
  saldoAtual: Prisma.Decimal;
  saldoPrevisto: Prisma.Decimal;
  moeda: string;
  cor: string;
  icone: string;
  incluirNoSaldoTotal: boolean;
  ordem: number;
  arquivada: boolean;
  quantidadeMovimentacoes: number;
  escopo:
    { tipo: 'PESSOAL'; id: string; nome: string } | { tipo: 'GRUPO'; id: string; nome: string };
  criadoEm: Date;
}

/** 04-API.md §9.1: mistura campos persistidos com saldos derivados
 * (RN-06 — nunca uma coluna gravada) e o escopo de quem consultou —
 * `escopo` reflete o DONO real da conta (issue #72), nao quem esta
 * consultando: um membro visualizando a conta de um grupo ve
 * `{ tipo: 'GRUPO', ... }`, nunca `PESSOAL`. */
export function mapearConta(
  conta: Conta,
  escopo: { tipo: 'PESSOAL' | 'GRUPO'; id: string; nome: string },
  saldoAtual: Prisma.Decimal,
  saldoPrevisto: Prisma.Decimal,
  quantidadeMovimentacoes: number,
): ContaDTO {
  return {
    id: conta.id,
    nome: conta.nome,
    tipo: conta.tipo,
    instituicao: conta.instituicao,
    saldoInicial: conta.saldoInicial,
    saldoAtual,
    saldoPrevisto,
    moeda: conta.moeda,
    cor: conta.cor,
    icone: conta.icone,
    incluirNoSaldoTotal: conta.incluirNoSaldoTotal,
    ordem: conta.ordem,
    arquivada: conta.arquivadaEm !== null,
    quantidadeMovimentacoes,
    escopo,
    criadoEm: conta.criadoEm,
  };
}
