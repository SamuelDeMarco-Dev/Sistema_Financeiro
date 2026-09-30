import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCategorias } from './useCategorias';
import { criarCategoria } from '../servicos/categoria.servico';
import type { CriarCategoriaPayload } from '../servicos/categoria.servico';
import type { Categoria } from '../tipos/categoria';
import type { UseMutationResult } from '@tanstack/react-query';

export function useCriarCategoria(): UseMutationResult<Categoria, ErroApi, CriarCategoriaPayload> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: criarCategoria,
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCategorias.todas });
      notificar.sucesso('Categoria criada com sucesso.');
    },
  });
}
