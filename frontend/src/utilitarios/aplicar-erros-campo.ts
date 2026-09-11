import type { ErroApi } from '@/servicos/erro-api';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';

/** 04-API.md §3.1: qualquer 422/400 pode vir com `errors: [{campo, mensagem}]`
 * — destaca o campo certo do formulario em vez de so um banner generico no
 * topo (ex.: RN-10/`CATEGORIA_INCOMPATIVEL` aponta para `categoriaId`). */
export function aplicarErrosDeCampo<T extends FieldValues>(
  erro: ErroApi,
  setError: UseFormSetError<T>,
): void {
  for (const detalhe of erro.errors ?? []) {
    setError(detalhe.campo as FieldPath<T>, { type: 'server', message: detalhe.mensagem });
  }
}
