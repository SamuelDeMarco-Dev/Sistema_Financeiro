import { useQuery } from '@tanstack/react-query';
import { chavesConvites } from './useConvitesRecebidos';
import { buscarPreviaConvite } from '../servicos/convite.servico';
import type { ConvitePrevia } from '../tipos/convite';
import type { UseQueryResult } from '@tanstack/react-query';

/** Prévia pública do convite (04-API.md §17.3). `retry: false` porque a
 * rota é limitada por IP: repetir uma tentativa que já falhou gastaria a
 * cota de quem só abriu um link velho. */
export function useConvitePrevia(token: string): UseQueryResult<ConvitePrevia> {
  return useQuery({
    queryKey: chavesConvites.previa(token),
    queryFn: () => buscarPreviaConvite(token),
    enabled: token !== '',
    retry: false,
    staleTime: 60_000,
  });
}
