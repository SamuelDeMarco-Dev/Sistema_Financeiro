import { Esqueleto } from '@/componentes/feedback';
import type { ReactElement } from 'react';

interface EsqueletoSecaoProps {
  altura?: string;
}

/** Checklist #53: esqueleto POR SEÇÃO, nunca um spinner de página inteira
 * — cada seção carrega (e falha) de forma independente. */
export function EsqueletoSecao({ altura = 'h-40' }: EsqueletoSecaoProps): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-3 rounded-lg border border-borda bg-superficie p-4"
    >
      <Esqueleto className="h-4 w-32" />
      <Esqueleto className={`w-full ${altura}`} />
    </div>
  );
}
