import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { atualizarContaCompartilhada } from '../servicos/conta-compartilhada.servico';
import type { AtualizarGrupoPayload } from '../servicos/conta-compartilhada.servico';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { UseMutationResult } from '@tanstack/react-query';

/** `permiteParticipanteEditarProprias` reescreve a matriz RN-31 de todos os
 * participantes, então a invalidação em cascata aqui não é só cosmética:
 * sem ela um participante seguiria vendo ações que o servidor passou a
 * recusar. */
export function useAtualizarGrupo(
  contaCompartilhadaId: string,
): UseMutationResult<ContaCompartilhadaDetalhe, ErroApi, AtualizarGrupoPayload> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: (dados: AtualizarGrupoPayload) =>
      atualizarContaCompartilhada(contaCompartilhadaId, dados),
    onSuccess: (grupo) => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso(`Grupo "${grupo.nome}" atualizado.`);
    },
  });
}
