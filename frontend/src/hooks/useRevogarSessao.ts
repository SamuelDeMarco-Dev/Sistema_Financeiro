import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CHAVES_CONSULTA } from '@/constantes/chaves-consulta';
import { revogarSessao } from '@/servicos/autenticacao.servico';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useRevogarSessao(): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: revogarSessao,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: CHAVES_CONSULTA.sessoes });
    },
  });
}
