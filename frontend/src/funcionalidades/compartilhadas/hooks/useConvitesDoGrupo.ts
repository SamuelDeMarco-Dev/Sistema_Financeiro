import { useQuery } from '@tanstack/react-query';
import { chavesConvites } from './useConvitesRecebidos';
import { listarConvitesDoGrupo } from '../servicos/convite.servico';
import type { ConviteDoGrupo } from '../tipos/convite';
import type { UseQueryResult } from '@tanstack/react-query';

/** Convites que o grupo enviou. A rota exige ADMINISTRADOR (RN-30), então
 * `habilitado` evita disparar um 404 previsível para quem não administra —
 * a permissão real continua sendo a do servidor. */
export function useConvitesDoGrupo(
  contaCompartilhadaId: string,
  habilitado: boolean,
): UseQueryResult<ConviteDoGrupo[]> {
  return useQuery({
    queryKey: chavesConvites.doGrupo(contaCompartilhadaId),
    queryFn: () => listarConvitesDoGrupo(contaCompartilhadaId),
    enabled: habilitado && contaCompartilhadaId !== '',
    staleTime: 30_000,
  });
}
