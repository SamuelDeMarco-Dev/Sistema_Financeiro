import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
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
      notificar.sucesso('Transferência realizada com sucesso.');
    },
  });
}
