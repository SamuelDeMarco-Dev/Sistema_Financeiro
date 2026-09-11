import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notificar } from '@/componentes/feedback';
import type { ErroApi } from '@/servicos/erro-api';
import { chavesCategorias } from './useCategorias';
import { excluirCategoria } from '../servicos/categoria.servico';
import type { UseMutationResult } from '@tanstack/react-query';

// Sem onError aqui de proposito: RECURSO_EM_USO (409) e "tem subcategorias"
// (422) tem tratamento proprio no dialogo de exclusao, nao um toast generico.
export function useExcluirCategoria(): UseMutationResult<
  void,
  ErroApi,
  { id: string; recategorizarPara?: string | undefined }
> {
  const clienteConsulta = useQueryClient();

  return useMutation({
    mutationFn: ({ id, recategorizarPara }) => excluirCategoria(id, recategorizarPara),
    onSuccess: () => {
      void clienteConsulta.invalidateQueries({ queryKey: chavesCategorias.todas });
      notificar.sucesso('Categoria excluída.');
    },
  });
}
