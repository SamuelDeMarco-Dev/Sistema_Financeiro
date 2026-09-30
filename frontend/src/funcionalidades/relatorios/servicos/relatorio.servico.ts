import { api } from '@/servicos/api';
import type {
  GranularidadeFluxoCaixa,
  RelatorioAnual,
  RelatorioFluxoCaixa,
  RelatorioMensal,
  RelatorioPorCategoria,
  RelatorioPorConta,
  TipoRelatorioPorCategoria,
} from '../tipos/relatorio';

export async function obterRelatorioMensal(ano: number, mes: number): Promise<RelatorioMensal> {
  const resposta = await api.get<{ data: RelatorioMensal }>('/relatorios/mensal', {
    params: { ano, mes },
  });
  return resposta.data.data;
}

export async function obterRelatorioAnual(ano: number): Promise<RelatorioAnual> {
  const resposta = await api.get<{ data: RelatorioAnual }>('/relatorios/anual', {
    params: { ano },
  });
  return resposta.data.data;
}

export interface FiltrosRelatorioPorCategoria {
  dataInicio: string;
  dataFim: string;
  tipo?: TipoRelatorioPorCategoria;
  incluirSubcategorias?: boolean;
}

export async function obterRelatorioPorCategoria(
  filtros: FiltrosRelatorioPorCategoria,
): Promise<RelatorioPorCategoria> {
  const resposta = await api.get<{ data: RelatorioPorCategoria }>('/relatorios/por-categoria', {
    params: filtros,
  });
  return resposta.data.data;
}

export interface FiltrosRelatorioPorConta {
  dataInicio: string;
  dataFim: string;
}

export async function obterRelatorioPorConta(
  filtros: FiltrosRelatorioPorConta,
): Promise<RelatorioPorConta> {
  const resposta = await api.get<{ data: RelatorioPorConta }>('/relatorios/por-conta', {
    params: filtros,
  });
  return resposta.data.data;
}

export interface FiltrosRelatorioFluxoCaixa {
  dataInicio: string;
  dataFim: string;
  granularidade?: GranularidadeFluxoCaixa;
}

export async function obterRelatorioFluxoCaixa(
  filtros: FiltrosRelatorioFluxoCaixa,
): Promise<RelatorioFluxoCaixa> {
  const resposta = await api.get<{ data: RelatorioFluxoCaixa }>('/relatorios/fluxo-caixa', {
    params: filtros,
  });
  return resposta.data.data;
}
