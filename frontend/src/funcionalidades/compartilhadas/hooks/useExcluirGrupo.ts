import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { excluirContaCompartilhada } from '../servicos/conta-compartilhada.servico';
import type { UseMutationResult } from '@tanstack/react-query';

interface VariaveisExcluirGrupo {
  id: string;
  confirmacao: string;
}

export function useExcluirGrupo(): UseMutationResult<void, ErroApi, VariaveisExcluirGrupo> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, confirmacao }: VariaveisExcluirGrupo) =>
      excluirContaCompartilhada(id, confirmacao),
    onSuccess: (_dados, { id }) => {
      clienteConsulta.removeQueries({ queryKey: chavesCompartilhadas.detalhe(id) });
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.lista });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      // RN-33: exclusao logica — o historico fica para a auditoria, so nao
      // aparece mais para os membros.
      notificar.sucesso('Grupo excluído.');
    },
  });
}
