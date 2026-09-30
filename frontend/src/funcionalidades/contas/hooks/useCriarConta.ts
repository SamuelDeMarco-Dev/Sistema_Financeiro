import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesCompartilhadas } from '@/funcionalidades/compartilhadas/hooks/useContasCompartilhadas';
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
    onSuccess: (_conta, variaveis) => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      // Conta de grupo aparece no detalhe do grupo (§16.3), que traz as
      // contas junto do saldo — sem esta invalidacao a aba Contas do grupo
      // continuaria vazia depois de criar a primeira conta.
      if (variaveis.contaCompartilhadaId !== undefined) {
        void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      }
      notificar.sucesso('Conta criada com sucesso.');
    },
  });
}
