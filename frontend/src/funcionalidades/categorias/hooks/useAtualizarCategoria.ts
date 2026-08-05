import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCategorias } from './useCategorias';
import { atualizarCategoria } from '../servicos/categoria.servico';
import type { AtualizarCategoriaPayload } from '../servicos/categoria.servico';
import type { Categoria } from '../tipos/categoria';
import type { UseMutationResult } from '@tanstack/react-query';

export function useAtualizarCategoria(): UseMutationResult<
  Categoria,
  ErroApi,
  { id: string; dados: AtualizarCategoriaPayload }
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dados }) => atualizarCategoria(id, dados),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCategorias.todas });
      notificar.sucesso('Categoria atualizada com sucesso.');
    },
  });
}
