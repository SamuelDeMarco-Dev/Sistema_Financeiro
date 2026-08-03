import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CHAVES_CONSULTA } from '@/constantes/chaves-consulta';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import type { ErroApi } from '@/servicos/erro-api';
import { atualizarPerfil } from '@/servicos/perfil.servico';
import type { AtualizarPerfilPayload } from '@/servicos/perfil.servico';
import type { PerfilCompleto } from '@/tipos/perfil';
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
      clienteConsulta.setQueryData(CHAVES_CONSULTA.perfil, perfilAtualizado);
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
