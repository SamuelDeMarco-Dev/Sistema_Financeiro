import { Prisma } from '@prisma/client';
import type { ContaComSaldo } from '@/repositorios/conta.repositorio';
import type { LinhaFluxoCaixa, LinhaPorCategoria } from '@/repositorios/dashboard.repositorio';
import { paraDataIso, paraMesIso } from '@/utilitarios/data';
import { distribuirPercentuais } from '@/utilitarios/percentual';
import type { Periodo } from '@/utilitarios/periodo';
import { rotuloMesAbreviado, rotuloMesCompleto } from '@/utilitarios/rotulos-data';

export const SEM_CATEGORIA_ID = 'sem-categoria';

export interface PeriodoDTO {
  dataInicio: string;
  dataFim: string;
  rotulo: string;
}

export interface IndicadoresDTO {
  saldoAtual: Prisma.Decimal;
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
  resultado: Prisma.Decimal;
  saldoPrevisto: Prisma.Decimal;
  variacaoReceitas: number;
  variacaoDespesas: number;
  taxaPoupanca: number;
}

export function mapearPeriodo(periodo: Periodo): PeriodoDTO {
  return {
    dataInicio: paraDataIso(periodo.dataInicio),
    dataFim: paraDataIso(periodo.dataFim),
    rotulo: rotuloMesCompleto(periodo.dataInicio),
  };
}

export interface FluxoCaixaPontoDTO {
  mes: string;
  rotulo: string;
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
  resultado: Prisma.Decimal;
}

export function mapearFluxoCaixa(linhas: LinhaFluxoCaixa[]): FluxoCaixaPontoDTO[] {
  return linhas.map((linha) => ({
    mes: paraMesIso(linha.mes),
    rotulo: rotuloMesAbreviado(linha.mes),
    receitas: linha.receitas,
    despesas: linha.despesas,
    resultado: linha.receitas.minus(linha.despesas),
  }));
}

export interface PorCategoriaItemDTO {
  categoria: { id: string; nome: string; cor: string; icone: string };
  total: Prisma.Decimal;
  percentual: number;
  quantidade: number;
}

/** RF-42: cada `total`/`quantidade` vem pronto da consulta (issue #49); o
 * `percentual` vem de `distribuirPercentuais` (soma sempre exata 100,00,
 * absorvendo o erro de arredondamento no ultimo item — por isso a lista
 * ja precisa vir ordenada por total decrescente, como o repositorio faz). */
export function mapearPorCategoria(linhas: LinhaPorCategoria[]): PorCategoriaItemDTO[] {
  const percentuais = distribuirPercentuais(linhas.map((linha) => linha.total));

  return linhas.map((linha, indice) => ({
    categoria: {
      id: linha.categoria_id ?? SEM_CATEGORIA_ID,
      nome: linha.categoria_nome ?? 'Sem categoria',
      cor: linha.categoria_cor ?? '#64748B',
      icone: linha.categoria_icone ?? 'tag',
    },
    total: linha.total,
    percentual: percentuais[indice] ?? 0,
    quantidade: linha.quantidade,
  }));
}

export interface ContaResumoDashboardDTO {
  id: string;
  nome: string;
  tipo: ContaComSaldo['tipo'];
  saldoAtual: Prisma.Decimal;
  cor: string;
  icone: string;
}

export function mapearContasComSaldo(contas: ContaComSaldo[]): ContaResumoDashboardDTO[] {
  return contas.map((conta) => ({
    id: conta.id,
    nome: conta.nome,
    tipo: conta.tipo,
    saldoAtual: conta.saldoAtual,
    cor: conta.cor,
    icone: conta.icone,
  }));
}

export interface AlertaDTO {
  tipo: 'DESPESA_A_VENCER';
  severidade: 'INFORMACAO' | 'ATENCAO' | 'CRITICO';
  titulo: string;
  urlAcao: string;
}
