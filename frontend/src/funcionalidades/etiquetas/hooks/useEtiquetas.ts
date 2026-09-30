import { useQuery } from '@tanstack/react-query';
import { listarEtiquetas } from '../servicos/etiqueta.servico';
import type { FiltrosListarEtiquetas } from '../servicos/etiqueta.servico';
import type { Etiqueta } from '../tipos/etiqueta';
import type { UseQueryResult } from '@tanstack/react-query';

// 02-ARCHITECTURE.md §6.3: chaves de query moram junto do hook que as
// declara. `lista` inclui os filtros na chave para as etiquetas de um
// grupo nunca serem servidas do cache das pessoais.
export const chavesEtiquetas = {
  todas: ['etiquetas'] as const,
  lista: (filtros: FiltrosListarEtiquetas) => ['etiquetas', 'lista', filtros] as const,
};

export function useEtiquetas(filtros: FiltrosListarEtiquetas = {}): UseQueryResult<Etiqueta[]> {
  return useQuery({
    queryKey: chavesEtiquetas.lista(filtros),
    queryFn: () => listarEtiquetas(filtros),
    staleTime: 30_000,
  });
}
