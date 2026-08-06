import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { Popover, PopoverConteudo, PopoverGatilho } from '@/componentes/ui/Popover';
import { cn } from '@/utilitarios/cn';
import type { ReactElement } from 'react';

export interface OpcaoSeletorMultiplo {
  valor: string;
  rotulo: string;
}

interface SeletorMultiploProps {
  rotulo: string;
  opcoes: OpcaoSeletorMultiplo[];
  valor: string[];
  aoAlterar: (valores: string[]) => void;
  id?: string;
}

/** Filtro multi-valor generico (tipo, situação, conta, categoria,
 * etiqueta na barra de filtros de movimentações) — lista de caixas de
 * marcação num popover, sem a decoração de ícone/cor dos seletores de
 * formulário (`SelecionadorConta`/`SelecionadorCategoria`), que servem a
 * um valor único. */
export function SeletorMultiplo({
  rotulo,
  opcoes,
  valor,
  aoAlterar,
  id,
}: SeletorMultiploProps): ReactElement {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const [aberto, setAberto] = useState(false);

  function alternar(opcaoValor: string): void {
    if (valor.includes(opcaoValor)) {
      aoAlterar(valor.filter((item) => item !== opcaoValor));
    } else {
      aoAlterar([...valor, opcaoValor]);
    }
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverGatilho asChild>
        <button
          type="button"
          id={idCampo}
          className={cn(
            'flex min-h-[40px] items-center gap-2 rounded-md border border-borda bg-superficie px-3 py-1.5 text-sm text-texto',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
            valor.length > 0 && 'border-primaria',
          )}
        >
          {rotulo}
          {valor.length > 0 ? (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primaria px-1 text-xs font-semibold text-fundo">
              {valor.length}
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4 text-textoSuave" aria-hidden="true" />
        </button>
      </PopoverGatilho>

      <PopoverConteudo align="start" className="w-56 p-2">
        <div
          role="listbox"
          aria-multiselectable="true"
          aria-label={rotulo}
          className="max-h-64 overflow-y-auto"
        >
          {opcoes.length === 0 ? (
            <p className="px-2 py-2 text-sm text-textoSuave">Nenhuma opção disponível.</p>
          ) : null}
          {opcoes.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              role="option"
              aria-selected={valor.includes(opcao.valor)}
              onClick={() => {
                alternar(opcao.valor);
              }}
              className={cn(
                'flex min-h-[40px] w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-borda',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                valor.includes(opcao.valor) && 'bg-primaria/10',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-borda',
                  valor.includes(opcao.valor) && 'border-primaria bg-primaria',
                )}
              />
              <span className="min-w-0 flex-1 truncate">{opcao.rotulo}</span>
            </button>
          ))}
        </div>
      </PopoverConteudo>
    </Popover>
  );
}
