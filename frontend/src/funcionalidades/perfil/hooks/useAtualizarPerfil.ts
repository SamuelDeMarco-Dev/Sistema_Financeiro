import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import { chavesPerfil } from '@/funcionalidades/perfil/hooks/usePerfil';
import { atualizarPerfil } from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { AtualizarPerfilPayload } from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import type { ErroApi } from '@/servicos/erro-api';
import type { UseMutationResult } from '@tanstack/react-query';

export function useAtualizarPerfil(): UseMutationResult<
  PerfilCompleto,
  ErroApi,
  AtualizarPerfilPayload
> {
  const clienteConsulta = useQueryClient();
  const { atualizarUsuario } = useSessao();

  return useMutation({
    mutationFn: atualizarPerfil,
    onSuccess: (perfilAtualizado) => {
      clienteConsulta.setQueryData(chavesPerfil.todas, perfilAtualizado);
      atualizarUsuario({
        nome: perfilAtualizado.nome,
        fotoUrl: perfilAtualizado.fotoUrl,
        moedaPadrao: perfilAtualizado.moedaPadrao,
        idioma: perfilAtualizado.idioma,
        tema: perfilAtualizado.tema,
        timezone: perfilAtualizado.timezone,
      });
    },
  });
}
