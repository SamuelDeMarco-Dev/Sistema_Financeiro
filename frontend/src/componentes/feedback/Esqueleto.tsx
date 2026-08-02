import { cn } from '@/utilitarios/cn';
import type { ReactElement } from 'react';

interface EsqueletoProps {
  className?: string;
}

/** Bloco de carregamento generico — nunca um spinner de pagina inteira
 * (01-SPECIFICATION.md §8.5). Componha varios para montar o formato da
 * tela real (ex.: uma lista de cartoes). */
export function Esqueleto({ className }: EsqueletoProps): ReactElement {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-md bg-borda', className)} />;
}
