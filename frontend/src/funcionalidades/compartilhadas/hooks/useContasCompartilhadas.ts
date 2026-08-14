import { useQuery } from '@tanstack/react-query';
import { listarContasCompartilhadas } from '../servicos/conta-compartilhada.servico';
import type { ContaCompartilhadaListaItem } from '../tipos/conta-compartilhada';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara. `detalhe` e consumido pela tela do grupo (issue #75).
export const chavesCompartilhadas = {
  todas: ['contas-compartilhadas'] as const,
  lista: ['contas-compartilhadas', 'lista'] as const,
  detalhe: (id: string) => ['contas-compartilhadas', 'detalhe', id] as const,
};

export function useContasCompartilhadas(): UseQueryResult<ContaCompartilhadaListaItem[]> {
  return useQuery({
    queryKey: chavesCompartilhadas.lista,
    queryFn: listarContasCompartilhadas,
    staleTime: 30_000,
  });
}
