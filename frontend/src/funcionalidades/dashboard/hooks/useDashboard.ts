import { useQuery } from '@tanstack/react-query';
import { obterDashboard } from '../servicos/dashboard.servico';
import type { FiltrosPeriodoDashboard } from '../servicos/dashboard.servico';
import type { Dashboard } from '../tipos/dashboard';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara. Toda mutacao que afeta saldo/movimentacoes/contas invalida
// `todas` (regra 10, CLAUDE.md) — ver useCriarMovimentacao e afins.
export const chavesDashboard = {
  todas: ['dashboard'] as const,
  periodo: (filtros: FiltrosPeriodoDashboard) => ['dashboard', filtros] as const,
};

const STALE_TIME_MS = 60_000;

export function useDashboard(filtros: FiltrosPeriodoDashboard = {}): UseQueryResult<Dashboard> {
  return useQuery({
    queryKey: chavesDashboard.periodo(filtros),
    queryFn: () => obterDashboard(filtros),
    staleTime: STALE_TIME_MS,
  });
}
