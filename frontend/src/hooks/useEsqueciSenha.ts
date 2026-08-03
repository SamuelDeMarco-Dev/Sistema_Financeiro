import { useMutation } from '@tanstack/react-query';
import { esqueciSenha } from '@/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useEsqueciSenha(): UseMutationResult<void, ErroApi, string> {
  return useMutation({ mutationFn: esqueciSenha });
}
