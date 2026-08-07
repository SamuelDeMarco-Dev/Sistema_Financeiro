import { paraDataIso } from '@/utilitarios/data';
import type { Periodo } from '@/utilitarios/periodo';
import { rotuloMesCompleto } from '@/utilitarios/rotulos-data';
import type { Prisma } from '@prisma/client';

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
