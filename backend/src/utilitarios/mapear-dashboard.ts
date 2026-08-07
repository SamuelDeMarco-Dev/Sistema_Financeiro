import { Prisma } from '@prisma/client';
import type { LinhaFluxoCaixa, LinhaPorCategoria } from '@/repositorios/dashboard.repositorio';
import { paraDataIso, paraMesIso } from '@/utilitarios/data';
import type { Periodo } from '@/utilitarios/periodo';
import { rotuloMesAbreviado, rotuloMesCompleto } from '@/utilitarios/rotulos-data';

const CASAS_PERCENTUAL = 2;
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

/** RF-42: cada `total`/`quantidade` vem pronto da consulta (issue #49);
 * so o `percentual` precisa de pos-processamento — arredondar cada item
 * para 2 casas e depois somar tudo quase nunca da exatamente 100,00 (erro
 * de arredondamento). Em vez disso, calcula todos os itens exceto o
 * ultimo (a lista vem ordenada por total decrescente) e da ao ultimo o
 * que falta para fechar 100,00 — a soma dos percentuais e SEMPRE exata. */
export function mapearPorCategoria(linhas: LinhaPorCategoria[]): PorCategoriaItemDTO[] {
  if (linhas.length === 0) return [];

  const somaTotal = linhas.reduce((soma, linha) => soma.plus(linha.total), new Prisma.Decimal(0));

  const itens = linhas.map((linha) => ({
    categoria: {
      id: linha.categoria_id ?? SEM_CATEGORIA_ID,
      nome: linha.categoria_nome ?? 'Sem categoria',
      cor: linha.categoria_cor ?? '#64748B',
      icone: linha.categoria_icone ?? 'tag',
    },
    total: linha.total,
    percentual: 0,
    quantidade: linha.quantidade,
  }));

  let somaPercentuais = 0;
  for (let indice = 0; indice < itens.length - 1; indice += 1) {
    const item = itens[indice];
    if (!item) continue;
    item.percentual = somaTotal.isZero()
      ? 0
      : Number(item.total.dividedBy(somaTotal).times(100).toDecimalPlaces(CASAS_PERCENTUAL));
    somaPercentuais += item.percentual;
  }
  const ultimo = itens[itens.length - 1];
  if (ultimo) {
    ultimo.percentual = somaTotal.isZero()
      ? 0
      : Number((100 - somaPercentuais).toFixed(CASAS_PERCENTUAL));
  }

  return itens;
}
