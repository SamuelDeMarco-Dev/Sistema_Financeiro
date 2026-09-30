import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesMovimentacoes } from './useMovimentacoes';
import { enviarAnexo } from '../servicos/anexo.servico';
import type { AnexoResumo } from '../tipos/movimentacao';
import type { UseMutationResult } from '@tanstack/react-query';

export interface EnviarAnexoVariaveis {
  movimentacaoId: string;
  arquivo: File;
  aoProgredir?: (percentual: number) => void;
}

export function useEnviarAnexo(): UseMutationResult<AnexoResumo, ErroApi, EnviarAnexoVariaveis> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ movimentacaoId, arquivo, aoProgredir }: EnviarAnexoVariaveis) =>
      enviarAnexo(movimentacaoId, arquivo, aoProgredir),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesMovimentacoes.todas });
    },
  });
}
