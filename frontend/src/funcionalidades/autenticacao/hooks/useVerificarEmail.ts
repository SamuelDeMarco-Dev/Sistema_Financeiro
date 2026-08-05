import { useMutation } from '@tanstack/react-query';
import { verificarEmail } from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useVerificarEmail(): UseMutationResult<void, ErroApi, string> {
  return useMutation({ mutationFn: verificarEmail });
}
