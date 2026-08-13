import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { removerMembro } from '../servicos/conta-compartilhada.servico';
import type { UseMutationResult } from '@tanstack/react-query';

export function useRemoverMembro(
  contaCompartilhadaId: string,
): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: (membroId: string) => removerMembro(contaCompartilhadaId, membroId),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      // RN-34 outra vez, agora na confirmacao: o saldo do grupo nao muda ao
      // remover alguem, e dizer isso evita a suspeita de que o dinheiro
      // dele "saiu junto".
      notificar.sucesso('Membro removido. Os lançamentos dele continuam no grupo.');
    },
  });
}
