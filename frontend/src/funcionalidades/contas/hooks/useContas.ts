import { useQuery } from '@tanstack/react-query';
import { listarContas } from '../servicos/conta.servico';
import type { FiltrosListarContas, RespostaListarContas } from '../servicos/conta.servico';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara. `resumo` e usado pelos seletores (issue #30).
export const chavesContas = {
  todas: ['contas'] as const,
  lista: (filtros: FiltrosListarContas) => ['contas', 'lista', filtros] as const,
  resumo: ['contas', 'resumo'] as const,
};

export function useContas(
  filtros: FiltrosListarContas = { incluirArquivadas: true },
): UseQueryResult<RespostaListarContas> {
  return useQuery({
    queryKey: chavesContas.lista(filtros),
    queryFn: () => listarContas(filtros),
    staleTime: 30_000,
  });
}
