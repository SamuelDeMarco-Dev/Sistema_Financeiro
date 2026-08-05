import { ICONES } from '@/constantes/icones';
import { cn } from '@/utilitarios/cn';
import type { ReactElement } from 'react';

interface SeletorIconeContaProps {
  valor: string;
  aoAlterar: (icone: string) => void;
}

// Subconjunto sugerido para contas — o registro completo (com busca) e da
// issue #29, usado para categorias, onde a variedade importa mais.
const ICONES_SUGERIDOS = [
  'wallet',
  'landmark',
  'banknote',
  'credit-card',
  'piggy-bank',
  'trending-up',
  'coins',
  'building-2',
  'smartphone',
  'briefcase',
] as const;

export function SeletorIconeConta({ valor, aoAlterar }: SeletorIconeContaProps): ReactElement {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-texto">Ícone</legend>
      <div role="radiogroup" aria-label="Ícone" className="flex flex-wrap gap-2">
        {ICONES_SUGERIDOS.map((nome) => {
          const Icone = ICONES[nome];
          if (!Icone) return null;
          const selecionado = nome === valor;
          return (
            <button
              key={nome}
              type="button"
              role="radio"
              aria-checked={selecionado}
              aria-label={nome}
              onClick={() => {
                aoAlterar(nome);
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-md border transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                selecionado
                  ? 'border-primaria bg-primaria/10 text-primaria'
                  : 'border-borda bg-superficie text-texto hover:bg-borda',
              )}
            >
              <Icone className="h-5 w-5" aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
