import { api } from '@/servicos/api';
import type { Dashboard } from '../tipos/dashboard';

export interface FiltrosPeriodoDashboard {
  dataInicio?: string;
  dataFim?: string;
}

export async function obterDashboard(filtros: FiltrosPeriodoDashboard = {}): Promise<Dashboard> {
  const resposta = await api.get<{ data: Dashboard }>('/dashboard', { params: filtros });
  return resposta.data.data;
}
