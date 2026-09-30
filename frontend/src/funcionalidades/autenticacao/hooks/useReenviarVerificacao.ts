import { useMutation } from '@tanstack/react-query';
import { reenviarVerificacao } from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useReenviarVerificacao(): UseMutationResult<void, ErroApi, string> {
  return useMutation({ mutationFn: reenviarVerificacao });
}
