import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesCompartilhadas } from '@/funcionalidades/compartilhadas/hooks/useContasCompartilhadas';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { duplicarMovimentacao } from '../servicos/movimentacao.servico';
import type { Movimentacao } from '../tipos/movimentacao';
import type { UseMutationResult } from '@tanstack/react-query';

export function useDuplicarMovimentacao(): UseMutationResult<Movimentacao, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: duplicarMovimentacao,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      // Escopo de grupo: o saldo do grupo e das contas dele vem no detalhe da
      // conta compartilhada (§16.3), consulta separada da de contas pessoais
      // — sem isto o cabecalho do grupo fica com saldo velho.
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Movimentação duplicada.');
    },
  });
}
