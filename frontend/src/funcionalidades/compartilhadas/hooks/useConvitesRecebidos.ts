import { useQuery } from '@tanstack/react-query';
import { listarConvitesRecebidos } from '../servicos/convite.servico';
import type { ConviteRecebido } from '../tipos/convite';
import type { UseQueryResult } from '@tanstack/react-query';

export const chavesConvites = {
  todas: ['convites'] as const,
  recebidos: ['convites', 'recebidos'] as const,
};

export function useConvitesRecebidos(): UseQueryResult<ConviteRecebido[]> {
  return useQuery({
    queryKey: chavesConvites.recebidos,
    queryFn: listarConvitesRecebidos,
    staleTime: 30_000,
  });
}

/** Contagem usada pelo distintivo da navegacao. `GET /convites/recebidos`
 * ja devolve apenas os pendentes e nao-expirados (04-API.md §17.2), mas o
 * filtro por situacao fica explicito para o distintivo nunca contar um
 * convite ja respondido que porventura apareca na lista. */
export function useQuantidadeConvitesPendentes(): number {
  const { data } = useConvitesRecebidos();
  return (data ?? []).filter((convite) => convite.situacao === 'PENDENTE').length;
}
