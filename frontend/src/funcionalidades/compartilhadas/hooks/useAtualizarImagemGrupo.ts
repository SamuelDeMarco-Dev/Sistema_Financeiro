import { useMutation, useQueryClient } from '@tanstack/react-query';
import { chavesDashboard } from '@/funcionalidades/dashboard/hooks/useDashboard';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCompartilhadas } from './useContasCompartilhadas';
import { atualizarImagemGrupo } from '../servicos/conta-compartilhada.servico';
import type { UseMutationResult } from '@tanstack/react-query';

interface VariaveisImagemGrupo {
  id: string;
  imagem: Blob;
}

export function useAtualizarImagemGrupo(): UseMutationResult<
  string,
  ErroApi,
  VariaveisImagemGrupo
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, imagem }: VariaveisImagemGrupo) => atualizarImagemGrupo(id, imagem),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCompartilhadas.todas });
      void clienteConsulta.invalidateQueries({ queryKey: chavesDashboard.todas });
    },
  });
}
