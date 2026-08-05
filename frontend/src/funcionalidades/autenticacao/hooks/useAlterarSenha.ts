import { useMutation } from '@tanstack/react-query';
import { alterarSenha } from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import type { DadosAlterarSenha } from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useAlterarSenha(): UseMutationResult<void, ErroApi, DadosAlterarSenha> {
  return useMutation({ mutationFn: alterarSenha });
}
