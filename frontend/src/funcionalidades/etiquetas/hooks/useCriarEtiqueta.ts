import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesEtiquetas } from './useEtiquetas';
import { criarEtiqueta } from '../servicos/etiqueta.servico';
import type { CriarEtiquetaPayload } from '../servicos/etiqueta.servico';
import type { Etiqueta } from '../tipos/etiqueta';
import type { UseMutationResult } from '@tanstack/react-query';

export function useCriarEtiqueta(): UseMutationResult<Etiqueta, ErroApi, CriarEtiquetaPayload> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: criarEtiqueta,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesEtiquetas.todas });
    },
  });
}
