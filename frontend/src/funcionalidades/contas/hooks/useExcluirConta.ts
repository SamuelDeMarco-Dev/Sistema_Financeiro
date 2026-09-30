import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesContas } from './useContas';
import { excluirConta } from '../servicos/conta.servico';
import type { UseMutationResult } from '@tanstack/react-query';

// Sem onError aqui de proposito: RECURSO_EM_USO (409) tem tratamento
// proprio no dialogo de exclusao (oferece arquivar), nao um toast generico.
export function useExcluirConta(): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: excluirConta,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Conta excluída.');
    },
  });
}
