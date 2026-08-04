import { useMutation } from '@tanstack/react-query';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import type { CredenciaisLogin } from '@/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

/** Fina camada de useMutation sobre `ContextoAutenticacao.entrar` — da ao
 * formulario de login (issue #19) `isPending`/`error` no padrao React Query
 * do resto do app, enquanto o estado de sessao em si (usuario, token)
 * continua vivendo so no contexto. */
export function useLogin(): UseMutationResult<void, ErroApi, CredenciaisLogin> {
  const { entrar } = useSessao();
  return useMutation({ mutationFn: entrar });
}
