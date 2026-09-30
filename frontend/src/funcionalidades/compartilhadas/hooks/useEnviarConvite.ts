import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesConvites } from './useConvitesRecebidos';
import { enviarConvite } from '../servicos/convite.servico';
import type { EnviarConvitePayload } from '../servicos/convite.servico';
import type { ConviteEnviado } from '../tipos/convite';
import type { UseMutationResult } from '@tanstack/react-query';

export function useEnviarConvite(
  contaCompartilhadaId: string,
): UseMutationResult<ConviteEnviado, ErroApi, EnviarConvitePayload> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: (dados: EnviarConvitePayload) => enviarConvite(contaCompartilhadaId, dados),
    onSuccess: (convite) => {
      void clienteConsulta.invalidateQueries({
        queryKey: chavesConvites.doGrupo(contaCompartilhadaId),
      });
      // RN-37: convidar quem ainda nao tem cadastro e' permitido, mas quem
      // convidou precisa saber — senao fica esperando um aceite que
      // depende de um cadastro que ninguem pediu.
      notificar.sucesso(
        convite.usuarioJaCadastrado
          ? `Convite enviado para ${convite.email}.`
          : `Convite enviado para ${convite.email}. Como esse e-mail ainda não tem cadastro, o convite fica esperando: ao se cadastrar, a pessoa encontra o convite pendente.`,
      );
    },
  });
}
