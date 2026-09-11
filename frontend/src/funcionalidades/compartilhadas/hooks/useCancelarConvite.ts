import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesConvites } from './useConvitesRecebidos';
import { cancelarConvite } from '../servicos/convite.servico';
import type { UseMutationResult } from '@tanstack/react-query';

export function useCancelarConvite(
  contaCompartilhadaId: string,
): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: cancelarConvite,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({
        queryKey: chavesConvites.doGrupo(contaCompartilhadaId),
      });
      notificar.sucesso('Convite cancelado. O link enviado não pode mais ser aceito.');
    },
  });
}
