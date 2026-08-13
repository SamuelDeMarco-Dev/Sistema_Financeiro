import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesCompartilhadas } from '@/funcionalidades/compartilhadas/hooks/useContasCompartilhadas';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import { chavesMovimentacoes } from '@/funcionalidades/movimentacoes/hooks/useMovimentacoes';
import type { ErroApi } from '@/servicos/erro-api';
import { criarTransferencia } from '../servicos/transferencia.servico';
import type { CriarTransferenciaPayload } from '../servicos/transferencia.servico';
import type { Transferencia } from '../tipos/transferencia';
import type { UseMutationResult } from '@tanstack/react-query';

export function useCriarTransferencia(): UseMutationResult<
  Transferencia,
  ErroApi,
  CriarTransferenciaPayload
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: criarTransferencia,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      // Transferência entre conta pessoal e de grupo (issue #73) move os dois
      // lados: o saldo do grupo vem do detalhe da conta compartilhada
      // (§16.3), consulta separada da de contas pessoais.
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Transferência realizada com sucesso.');
    },
  });
}
