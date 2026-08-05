import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesContas } from './useContas';
import { arquivarConta } from '../servicos/conta.servico';
import type { Conta } from '../tipos/conta';
import type { UseMutationResult } from '@tanstack/react-query';

export function useArquivarConta(): UseMutationResult<Conta, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: arquivarConta,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      notificar.sucesso('Conta arquivada.');
    },
  });
}
