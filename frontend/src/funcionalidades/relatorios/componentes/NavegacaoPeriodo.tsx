import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactElement } from 'react';

interface NavegacaoPeriodoProps {
  rotulo: string;
  rotuloAnterior: string;
  rotuloProximo: string;
  onAnterior: () => void;
  onProximo: () => void;
}

/** RF-72 (issue #55): setas de navegação — mês a mês na aba Mensal, ano a
 * ano na Anual (quem monta o rótulo/callback decide a unidade; este
 * componente só sabe desenhar "anterior · rótulo · próximo"). */
export function NavegacaoPeriodo({
  rotulo,
  rotuloAnterior,
  rotuloProximo,
  onAnterior,
  onProximo,
}: NavegacaoPeriodoProps): ReactElement {
  return (
    <div className="flex items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={onAnterior}
        aria-label={rotuloAnterior}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-borda text-texto hover:bg-borda focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <span className="min-w-[10ch] text-center text-sm font-medium text-texto">{rotulo}</span>
      <button
        type="button"
        onClick={onProximo}
        aria-label={rotuloProximo}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-borda text-texto hover:bg-borda focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
