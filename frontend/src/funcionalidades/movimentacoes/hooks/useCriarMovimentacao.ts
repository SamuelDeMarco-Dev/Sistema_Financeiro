import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesContas } from '@/funcionalidades/contas/hooks/useContas';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { criarMovimentacao } from '../servicos/movimentacao.servico';
import type { CriarMovimentacaoPayload } from '../servicos/movimentacao.servico';
import type { Movimentacao } from '../tipos/movimentacao';
import type { UseMutationResult } from '@tanstack/react-query';

// RN-01/regra 10 (CLAUDE.md): toda mutacao que pode afetar saldo invalida
// tambem o cache de contas — saldo velho na tela e defeito grave.
export function useCriarMovimentacao(): UseMutationResult<
  Movimentacao,
  ErroApi,
  CriarMovimentacaoPayload
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: criarMovimentacao,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      notificar.sucesso('Movimentação criada com sucesso.');
    },
  });
}
