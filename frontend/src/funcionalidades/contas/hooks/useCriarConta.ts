import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesContas } from './useContas';
import { criarConta } from '../servicos/conta.servico';
import type { CriarContaPayload } from '../servicos/conta.servico';
import type { Conta } from '../tipos/conta';
import type { UseMutationResult } from '@tanstack/react-query';

export function useCriarConta(): UseMutationResult<Conta, ErroApi, CriarContaPayload> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: criarConta,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Conta criada com sucesso.');
    },
  });
}
