import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { excluirMovimentacao } from '../servicos/movimentacao.servico';
import type { EscopoRecorrencia } from '../tipos/movimentacao';
import type { UseMutationResult } from '@tanstack/react-query';

export interface ExcluirMovimentacaoVariaveis {
  id: string;
  escopoExclusao?: EscopoRecorrencia | undefined;
}

export function useExcluirMovimentacao(): UseMutationResult<
  void,
  ErroApi,
  ExcluirMovimentacaoVariaveis
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, escopoExclusao }: ExcluirMovimentacaoVariaveis) =>
      excluirMovimentacao(id, escopoExclusao),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Movimentação excluída.');
    },
  });
}
