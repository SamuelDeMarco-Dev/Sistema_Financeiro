import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chavesSessoes } from '@/funcionalidades/autenticacao/hooks/useSessoesAtivas';
import { revogarSessao } from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useRevogarSessao(): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: revogarSessao,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesSessoes.todas });
    },
  });
}
