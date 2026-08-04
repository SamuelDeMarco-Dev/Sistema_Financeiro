import { useMutation } from '@tanstack/react-query';
import { cadastrar } from '@/servicos/autenticacao.servico';
import type { DadosCadastro, UsuarioCadastrado } from '@/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

// Cadastro nao autentica (backend nao devolve accessToken nem cookie ate o
// e-mail ser verificado) — por isso nao toca o ContextoAutenticacao, so
// expoe estado de carregamento/erro da chamada para o formulario (issue #19).
export function useCadastro(): UseMutationResult<UsuarioCadastrado, ErroApi, DadosCadastro> {
  return useMutation({ mutationFn: cadastrar });
}
