import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { chavesConvites } from './useConvitesRecebidos';
import { aceitarConvite } from '../servicos/convite.servico';
import type { MembroAceito } from '../tipos/convite';
import type { UseMutationResult } from '@tanstack/react-query';

export function useAceitarConvite(): UseMutationResult<MembroAceito, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: aceitarConvite,
    onSuccess: (membro) => {
      // Aceitar muda tres coisas de uma vez: o convite sai dos pendentes, o
      // grupo entra na lista e o dashboard passa a somar mais um grupo.
      void clienteConsulta.invalidateQueries({ queryKey: chavesConvites.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso(`Você agora faz parte de "${membro.contaCompartilhada.nome}".`);
    },
  });
}
