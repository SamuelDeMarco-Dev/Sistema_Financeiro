import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { sairDoGrupo } from '../servicos/conta-compartilhada.servico';
import type { UseMutationResult } from '@tanstack/react-query';

export function useSairDoGrupo(): UseMutationResult<void, ErroApi, string> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: sairDoGrupo,
    onSuccess: (_dados, contaCompartilhadaId) => {
      // Remove o detalhe em vez de so invalidar: quem saiu deixou de ser
      // membro e a rota passa a responder 404 (RN-51) — refazer a consulta
      // renderizaria um erro na tela que o usuario esta abandonando.
      clienteConsulta.removeQueries({
        queryKey: chavesCompartilhadas.detalhe(contaCompartilhadaId),
      });
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.lista });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
      notificar.sucesso('Você saiu do grupo. Seus lançamentos continuam lá.');
    },
  });
}
