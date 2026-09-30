import { useQuery } from '@tanstack/react-query';
import {
  obterRelatorioAnual,
  obterRelatorioFluxoCaixa,
  obterRelatorioMensal,
  obterRelatorioPorCategoria,
  obterRelatorioPorConta,
} from '../servicos/relatorio.servico';
import type {
  FiltrosRelatorioFluxoCaixa,
  FiltrosRelatorioPorCategoria,
  FiltrosRelatorioPorConta,
} from '../servicos/relatorio.servico';
import type {
  RelatorioAnual,
  RelatorioFluxoCaixa,
  RelatorioMensal,
  RelatorioPorCategoria,
  RelatorioPorConta,
} from '../tipos/relatorio';
import type { UseQueryResult } from '@tanstack/react-query';

export const chavesRelatorios = {
  todas: ['relatorios'] as const,
  mensal: (ano: number, mes: number) => ['relatorios', 'mensal', ano, mes] as const,
  anual: (ano: number) => ['relatorios', 'anual', ano] as const,
  porCategoria: (filtros: FiltrosRelatorioPorCategoria) =>
    ['relatorios', 'por-categoria', filtros] as const,
  porConta: (filtros: FiltrosRelatorioPorConta) => ['relatorios', 'por-conta', filtros] as const,
  fluxoCaixa: (filtros: FiltrosRelatorioFluxoCaixa) =>
    ['relatorios', 'fluxo-caixa', filtros] as const,
};

export function useRelatorioMensal(ano: number, mes: number): UseQueryResult<RelatorioMensal> {
  return useQuery({
    queryKey: chavesRelatorios.mensal(ano, mes),
    queryFn: () => obterRelatorioMensal(ano, mes),
  });
}

export function useRelatorioAnual(ano: number): UseQueryResult<RelatorioAnual> {
  return useQuery({
    queryKey: chavesRelatorios.anual(ano),
    queryFn: () => obterRelatorioAnual(ano),
  });
}

export function useRelatorioPorCategoria(
  filtros: FiltrosRelatorioPorCategoria,
): UseQueryResult<RelatorioPorCategoria> {
  return useQuery({
    queryKey: chavesRelatorios.porCategoria(filtros),
    queryFn: () => obterRelatorioPorCategoria(filtros),
  });
}

export function useRelatorioPorConta(
  filtros: FiltrosRelatorioPorConta,
): UseQueryResult<RelatorioPorConta> {
  return useQuery({
    queryKey: chavesRelatorios.porConta(filtros),
    queryFn: () => obterRelatorioPorConta(filtros),
  });
}

export function useRelatorioFluxoCaixa(
  filtros: FiltrosRelatorioFluxoCaixa,
): UseQueryResult<RelatorioFluxoCaixa> {
  return useQuery({
    queryKey: chavesRelatorios.fluxoCaixa(filtros),
    queryFn: () => obterRelatorioFluxoCaixa(filtros),
  });
}
