import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { excluirAnexo } from '../servicos/anexo.servico';
import type { UseMutationResult } from '@tanstack/react-query';

export function useExcluirAnexo(): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: excluirAnexo,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
      notificar.sucesso('Anexo excluído.');
    },
  });
}
