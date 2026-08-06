import { useQuery } from '@tanstack/react-query';
import { listarMovimentacoes } from '../servicos/movimentacao.servico';
import type {
  FiltrosListarMovimentacoes,
  RespostaListarMovimentacoes,
} from '../servicos/movimentacao.servico';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara.
export const chavesMovimentacoes = {
  todas: ['movimentacoes'] as const,
  lista: (filtros: FiltrosListarMovimentacoes) => ['movimentacoes', 'lista', filtros] as const,
};

export function useMovimentacoes(
  filtros: FiltrosListarMovimentacoes,
): UseQueryResult<RespostaListarMovimentacoes> {
  return useQuery({
    queryKey: chavesMovimentacoes.lista(filtros),
    queryFn: () => listarMovimentacoes(filtros),
    staleTime: 30_000,
  });
}
