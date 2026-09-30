import { useQuery } from '@tanstack/react-query';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { buscarContaCompartilhada } from '../servicos/conta-compartilhada.servico';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { UseQueryResult } from '@tanstack/react-query';

/** Traz o detalhe do grupo, incluindo `minhasPermissoes` — a fonte única
 * das decisões de permissão na interface (04-API.md §16.3). Grupo de que
 * o usuário não é membro responde 404 (RN-51), então `isError` aqui
 * significa "não existe ou não é seu", sem distinção — de propósito. */
export function useContaCompartilhada(id: string): UseQueryResult<ContaCompartilhadaDetalhe> {
  return useQuery({
    queryKey: chavesCompartilhadas.detalhe(id),
    queryFn: () => buscarContaCompartilhada(id),
    staleTime: 30_000,
  });
}
