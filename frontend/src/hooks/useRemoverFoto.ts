import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CHAVES_CONSULTA } from '@/constantes/chaves-consulta';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import type { ErroApi } from '@/servicos/erro-api';
import { removerFoto } from '@/servicos/perfil.servico';
import type { PerfilCompleto } from '@/tipos/perfil';
import type { UseMutationResult } from '@tanstack/react-query';

export function useRemoverFoto(): UseMutationResult<void, ErroApi, void> {
  const clienteConsulta = useQueryClient();
  const { atualizarUsuario } = useSessao();

  return useMutation({
    mutationFn: removerFoto,
    onSuccess: () => {
      clienteConsulta.setQueryData<PerfilCompleto>(CHAVES_CONSULTA.perfil, (atual) =>
        atual ? { ...atual, fotoUrl: null } : atual,
      );
      atualizarUsuario({ fotoUrl: null });
    },
  });
}
