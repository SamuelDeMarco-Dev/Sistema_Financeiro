import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { transferirAdministracao } from '../servicos/conta-compartilhada.servico';
import type { ResultadoTransferencia } from '../servicos/conta-compartilhada.servico';
import type { UseMutationResult } from '@tanstack/react-query';

/** RF-57: transferir rebaixa quem transferiu a PARTICIPANTE na mesma
 * transacao (RN-28 nao admite dois administradores nem zero). Quem executa
 * perde o acesso as abas de administracao no mesmo instante, e a
 * invalidacao do detalhe e' o que faz a interface refletir isso. */
export function useTransferirAdministracao(
  contaCompartilhadaId: string,
): UseMutationResult<ResultadoTransferencia, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: (novoAdministradorMembroId: string) =>
      transferirAdministracao(contaCompartilhadaId, novoAdministradorMembroId),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Administração transferida. Você agora é participante do grupo.');
    },
  });
}
