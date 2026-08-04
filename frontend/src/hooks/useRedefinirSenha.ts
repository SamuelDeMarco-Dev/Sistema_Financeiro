import { useMutation } from '@tanstack/react-query';
import { redefinirSenha } from '@/servicos/autenticacao.servico';
import type { DadosRedefinicaoSenha } from '@/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useRedefinirSenha(): UseMutationResult<void, ErroApi, DadosRedefinicaoSenha> {
  return useMutation({ mutationFn: redefinirSenha });
}
