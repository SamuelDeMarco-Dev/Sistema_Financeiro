import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { atualizarMovimentacao } from '../servicos/movimentacao.servico';
import type { AtualizarMovimentacaoPayload } from '../servicos/movimentacao.servico';
import type { Movimentacao } from '../tipos/movimentacao';
import type { UseMutationResult } from '@tanstack/react-query';

export interface AtualizarMovimentacaoVariaveis {
  id: string;
  dados: AtualizarMovimentacaoPayload;
}

export function useAtualizarMovimentacao(): UseMutationResult<
  Movimentacao,
  ErroApi,
  AtualizarMovimentacaoVariaveis
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }: AtualizarMovimentacaoVariaveis) => atualizarMovimentacao(id, dados),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Movimentação atualizada com sucesso.');
    },
  });
}
