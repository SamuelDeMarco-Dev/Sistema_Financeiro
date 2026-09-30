import { useQuery } from '@tanstack/react-query';
import { listarCategorias } from '../servicos/categoria.servico';
import type { FiltrosListarCategorias } from '../servicos/categoria.servico';
import type { Categoria } from '../tipos/categoria';
import type { UseQueryResult } from '@tanstack/react-query';

export const chavesCategorias = {
  todas: ['categorias'] as const,
  lista: (filtros: FiltrosListarCategorias) => ['categorias', 'lista', filtros] as const,
};

export function useCategorias(filtros: FiltrosListarCategorias = {}): UseQueryResult<Categoria[]> {
  return useQuery({
    queryKey: chavesCategorias.lista(filtros),
    queryFn: () => listarCategorias(filtros),
    staleTime: 30_000,
  });
}
