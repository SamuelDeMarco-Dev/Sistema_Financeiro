import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { criarContaCompartilhada } from '../servicos/conta-compartilhada.servico';
import type { CriarGrupoPayload } from '../servicos/conta-compartilhada.servico';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { UseMutationResult } from '@tanstack/react-query';

export function useCriarGrupo(): UseMutationResult<
  ContaCompartilhadaDetalhe,
  ErroApi,
  CriarGrupoPayload
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: criarContaCompartilhada,
    onSuccess: (grupo) => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      // O dashboard traz `contasCompartilhadas` (04-API.md §22) — sem esta
      // invalidacao a tela inicial ficaria sem o grupo recem-criado.
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso(`Grupo "${grupo.nome}" criado. Você é o administrador.`);
    },
  });
}
