import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { pagarMovimentacao } from '../servicos/movimentacao.servico';
import type { PagarMovimentacaoPayload } from '../servicos/movimentacao.servico';
import type { Movimentacao } from '../tipos/movimentacao';
import type { UseMutationResult } from '@tanstack/react-query';

export interface PagarMovimentacaoVariaveis {
  id: string;
  dados?: PagarMovimentacaoPayload | undefined;
}

export function usePagarMovimentacao(): UseMutationResult<
  Movimentacao,
  ErroApi,
  PagarMovimentacaoVariaveis
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: PagarMovimentacaoVariaveis) => pagarMovimentacao(id, dados),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      notificar.sucesso('Movimentação paga.');
    },
  });
}
