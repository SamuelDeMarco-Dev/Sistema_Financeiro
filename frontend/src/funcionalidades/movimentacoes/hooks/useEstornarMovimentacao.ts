import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { estornarMovimentacao } from '../servicos/movimentacao.servico';
import type { Movimentacao } from '../tipos/movimentacao';
import type { UseMutationResult } from '@tanstack/react-query';

export function useEstornarMovimentacao(): UseMutationResult<Movimentacao, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: estornarMovimentacao,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      notificar.sucesso('Pagamento estornado.');
    },
  });
}
