import { useQuery } from '@tanstack/react-query';
import { listarEtiquetas } from '../servicos/etiqueta.servico';
import type { Etiqueta } from '../tipos/etiqueta';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara.
export const chavesEtiquetas = { todas: ['etiquetas'] as const };

export function useEtiquetas(): UseQueryResult<Etiqueta[]> {
  return useQuery({
    queryKey: chavesEtiquetas.todas,
    queryFn: listarEtiquetas,
    staleTime: 30_000,
  });
}
