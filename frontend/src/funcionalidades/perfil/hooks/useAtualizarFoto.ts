import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import { chavesPerfil } from '@/funcionalidades/perfil/hooks/usePerfil';
import { atualizarFoto } from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useAtualizarFoto(): UseMutationResult<string, ErroApi, Blob> {
  const clienteConsulta = useQueryClient();
  const { atualizarUsuario } = useSessao();

  return useMutation({
    mutationFn: atualizarFoto,
    onSuccess: (fotoUrl) => {
      clienteConsulta.setQueryData<PerfilCompleto>(chavesPerfil.todas, (atual) =>
        atual ? { ...atual, fotoUrl } : atual,
      );
      atualizarUsuario({ fotoUrl });
    },
  });
}
