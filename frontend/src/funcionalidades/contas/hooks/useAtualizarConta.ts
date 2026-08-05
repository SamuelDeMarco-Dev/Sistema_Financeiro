import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesContas } from './useContas';
import { atualizarConta } from '../servicos/conta.servico';
import type { AtualizarContaPayload } from '../servicos/conta.servico';
import type { Conta } from '../tipos/conta';
import type { UseMutationResult } from '@tanstack/react-query';

export function useAtualizarConta(): UseMutationResult<
  Conta,
  ErroApi,
  { id: string; dados: AtualizarContaPayload }
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }) => atualizarConta(id, dados),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      notificar.sucesso('Conta atualizada com sucesso.');
    },
  });
}
