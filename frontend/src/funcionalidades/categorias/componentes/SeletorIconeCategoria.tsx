import { Search } from 'lucide-react';
import { useId, useState } from 'react';
import { ICONES } from '@/constantes/icones';
import { cn } from '@/utilitarios/cn';
import type { ReactElement } from 'react';

interface SeletorIconeCategoriaProps {
  valor: string;
  aoAlterar: (icone: string) => void;
}

/** RF-20: seletor com busca sobre um conjunto curado da biblioteca Lucide
 * (constantes/icones.ts) — nao a biblioteca inteira, mas genuinamente
 * pesquisavel. */
export function SeletorIconeCategoria({
  valor,
  aoAlterar,
}: SeletorIconeCategoriaProps): ReactElement {
  const [busca, setBusca] = useState('');
  const idBusca = useId();
  const termoNormalizado = busca.trim().toLowerCase();
  const nomes = Object.keys(ICONES).filter((nome) => nome.includes(termoNormalizado));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-texto">Ícone</legend>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textoSuave"
          aria-hidden="true"
        />
        <label htmlFor={idBusca} className="sr-only">
          Buscar ícone
        </label>
        <input
          id={idBusca}
          type="search"
          value={busca}
          placeholder="Buscar ícone..."
          onChange={(evento) => {
            setBusca(evento.target.value);
          }}
          className="w-full rounded-md border border-borda bg-superficie py-2 pl-9 pr-3 text-texto placeholder:text-textoSuave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
        />
      </div>

      <div
        role="radiogroup"
        aria-label="Ícone"
        className="sm:grid-cols-8 grid max-h-48 grid-cols-6 gap-2 overflow-y-auto"
      >
        {nomes.map((nome) => {
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

      {nomes.length === 0 ? (
        <p className="text-sm text-textoSuave">Nenhum ícone encontrado.</p>
      ) : null}
    </fieldset>
  );
}
