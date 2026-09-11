import { Esqueleto } from './Esqueleto';
import type { ReactElement } from 'react';

/** Placeholder de pagina inteira — usado enquanto um chunk lazy carrega ou
 * enquanto uma rota aguarda a checagem de sessao no boot. Skeleton, nunca
 * spinner de pagina inteira (01-SPECIFICATION.md §8.5). */
export function EsqueletoPagina(): ReactElement {
  return (
    <div className="flex min-h-screen flex-col gap-4 bg-fundo p-8">
      <Esqueleto className="h-8 w-48" />
      <Esqueleto className="h-4 w-full max-w-md" />
      <Esqueleto className="h-40 w-full" />
    </div>
  );
}
