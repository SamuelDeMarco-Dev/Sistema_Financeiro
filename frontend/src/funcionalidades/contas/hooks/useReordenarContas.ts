import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesContas } from './useContas';
import { reordenarContas } from '../servicos/conta.servico';
import type { UseMutationResult } from '@tanstack/react-query';

export function useReordenarContas(): UseMutationResult<
  void,
  ErroApi,
  { id: string; ordem: number }[]
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: reordenarContas,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesContas.todas });
    },
  });
}
