import { Check } from 'lucide-react';
import { PALETA_CORES } from '@/constantes/cores';
import { cn } from '@/utilitarios/cn';
import type { ReactElement } from 'react';

interface SeletorCorProps {
  rotulo: string;
  valor: string;
  aoAlterar: (cor: string) => void;
}

/** Paleta pre-definida (03-DATABASE.md §10.1) — sem entrada hex livre por
 * enquanto, para manter o conjunto de cores previsivel no Design System. */
export function SeletorCor({ rotulo, valor, aoAlterar }: SeletorCorProps): ReactElement {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-texto">{rotulo}</legend>
      <div role="radiogroup" aria-label={rotulo} className="flex flex-wrap gap-2">
        {PALETA_CORES.map((cor) => {
          const selecionada = cor.toLowerCase() === valor.toLowerCase();
          return (
            <button
              key={cor}
              type="button"
              role="radio"
              aria-checked={selecionada}
              aria-label={cor}
              onClick={() => {
                aoAlterar(cor);
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                selecionada ? 'border-texto' : 'border-transparent',
              )}
              style={{ backgroundColor: cor }}
            >
              {selecionada ? <Check className="h-4 w-4 text-white" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
