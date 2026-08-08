import { Prisma } from '@prisma/client';
import type {
  LinhaMaiorDespesa,
  LinhaPorCategoria,
  LinhaPorConta,
  LinhaPorDia,
  LinhaPorMes,
} from '@/repositorios/relatorio.repositorio';
import { paraDataIso } from '@/utilitarios/data';
import { distribuirPercentuais } from '@/utilitarios/percentual';
import { rotuloMesSemAno } from '@/utilitarios/rotulos-data';

export interface PorCategoriaSimplesDTO {
  categoria: { nome: string; cor: string };
  total: Prisma.Decimal;
  percentual: number;
  quantidade: number;
}

export function mapearPorCategoriaSimples(linhas: LinhaPorCategoria[]): PorCategoriaSimplesDTO[] {
  const percentuais = distribuirPercentuais(linhas.map((linha) => linha.total));

  return linhas.map((linha, indice) => ({
    categoria: {
      nome: linha.categoria_nome ?? 'Sem categoria',
      cor: linha.categoria_cor ?? '#64748B',
    },
    total: linha.total,
    percentual: percentuais[indice] ?? 0,
    quantidade: linha.quantidade,
  }));
}

export interface PorContaDTO {
  conta: { nome: string };
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
  resultado: Prisma.Decimal;
}

export function mapearPorConta(linhas: LinhaPorConta[]): PorContaDTO[] {
  return linhas.map((linha) => ({
    conta: { nome: linha.conta_nome },
    receitas: linha.receitas,
    despesas: linha.despesas,
    resultado: linha.receitas.minus(linha.despesas),
  }));
}

export interface PorDiaDTO {
  data: string;
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
  resultado: Prisma.Decimal;
}

export function mapearPorDia(linhas: LinhaPorDia[]): PorDiaDTO[] {
  return linhas.map((linha) => ({
    data: paraDataIso(linha.dia),
    receitas: linha.receitas,
    despesas: linha.despesas,
    resultado: linha.receitas.minus(linha.despesas),
  }));
}

export interface MaiorDespesaDTO {
  id: string;
  descricao: string;
  valor: Prisma.Decimal;
  data: string;
  categoria: { nome: string };
}

export function mapearMaioresDespesas(linhas: LinhaMaiorDespesa[]): MaiorDespesaDTO[] {
  return linhas.map((linha) => ({
    id: linha.id,
    descricao: linha.descricao,
    valor: linha.valor_pago,
    data: paraDataIso(linha.data_efetivacao),
    categoria: { nome: linha.categoria_nome ?? 'Sem categoria' },
  }));
}

export interface PorMesDTO {
  mes: number;
  rotulo: string;
  receitas: Prisma.Decimal;
  despesas: Prisma.Decimal;
  resultado: Prisma.Decimal;
}

export function mapearPorMes(linhas: LinhaPorMes[]): PorMesDTO[] {
  return linhas.map((linha) => ({
    mes: linha.mes.getUTCMonth() + 1,
    rotulo: rotuloMesSemAno(linha.mes),
    receitas: linha.receitas,
    despesas: linha.despesas,
    resultado: linha.receitas.minus(linha.despesas),
  }));
}
