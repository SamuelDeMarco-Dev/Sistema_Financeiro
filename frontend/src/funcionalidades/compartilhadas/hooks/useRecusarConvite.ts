import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesConvites } from './useConvitesRecebidos';
import { recusarConvite } from '../servicos/convite.servico';
import type { UseMutationResult } from '@tanstack/react-query';

export function useRecusarConvite(): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: recusarConvite,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesConvites.todas });
      notificar.sucesso('Convite recusado.');
    },
  });
}
