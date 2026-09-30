import { Search } from 'lucide-react';
import { createElement, useId, useState } from 'react';
import { Popover, PopoverConteudo, PopoverGatilho } from '@/componentes/ui/Popover';
import { resolverIcone } from '@/constantes/icones';
import { cn } from '@/utilitarios/cn';
import type { Categoria, TipoCategoria } from '../tipos/categoria';
import type { ChangeEvent, ReactElement } from 'react';

interface SelecionadorCategoriaProps {
  rotulo: string;
  categorias: Categoria[];
  tipo?: TipoCategoria;
  valor: string;
  aoAlterar: (categoriaId: string) => void;
  erro?: string | undefined;
  id?: string;
}

interface ItemPlano {
  categoria: Categoria;
  nivel: 1 | 2;
}

function combina(nome: string, termo: string): boolean {
  return nome.toLowerCase().includes(termo.trim().toLowerCase());
}

// "Agrupamento por pai": cada raiz aparece como um item selecionavel
// seguido de suas subcategorias indentadas — a busca filtra por nome em
// qualquer nivel, mas preserva o pai como contexto quando um filho
// corresponde ao termo buscado.
function achatarComBusca(raizes: Categoria[], termo: string): ItemPlano[] {
  const semTermo = termo.trim() === '';
  const itens: ItemPlano[] = [];

  for (const raiz of raizes) {
    const filhosCorrespondentes = raiz.subcategorias.filter((sub) => combina(sub.nome, termo));
    const raizCorresponde = combina(raiz.nome, termo);
    if (!semTermo && !raizCorresponde && filhosCorrespondentes.length === 0) continue;

    itens.push({ categoria: raiz, nivel: 1 });
    for (const sub of semTermo ? raiz.subcategorias : filhosCorrespondentes) {
      itens.push({ categoria: sub, nivel: 2 });
    }
  }

  return itens;
}

function ConteudoItemCategoria({ categoria }: { categoria: Categoria }): ReactElement {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${categoria.cor}1A`, color: categoria.cor }}
      >
        {/* resolverIcone + createElement: mesmo motivo de ItemCategoria —
            evita o falso-positivo de react-hooks/static-components. */}
        {createElement(resolverIcone(categoria.icone), {
          className: 'h-3.5 w-3.5',
          'aria-hidden': true,
        })}
      </span>
      <span className="min-w-0 flex-1 truncate">{categoria.nome}</span>
    </span>
  );
}

/** #30: seletor de categoria reutilizavel para os formularios de
 * movimentacao (M3+). `tipo`, quando informado, restringe as opcoes as
 * categorias compativeis (RN-10: exata ou AMBOS) — espelha o filtro ja
 * usado por `SeletorCategoriaPai` (issue #29). */
export function SelecionadorCategoria({
  rotulo,
  categorias,
  tipo,
  valor,
  aoAlterar,
  erro,
  id,
}: SelecionadorCategoriaProps): ReactElement {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;
  const idBusca = `${idCampo}-busca`;

  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');

  const raizesCompativeis = tipo
    ? categorias.filter((categoria) => categoria.tipo === tipo || categoria.tipo === 'AMBOS')
    : categorias;
  const itens = achatarComBusca(raizesCompativeis, busca);
  const categoriaSelecionada = raizesCompativeis
    .flatMap((raiz) => [raiz, ...raiz.subcategorias])
    .find((categoria) => categoria.id === valor);

  function selecionar(categoriaId: string): void {
    aoAlterar(categoriaId);
    setAberto(false);
    setBusca('');
  }

  function aoBuscar(evento: ChangeEvent<HTMLInputElement>): void {
    setBusca(evento.target.value);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverGatilho asChild>
          <button
            type="button"
            id={idCampo}
            role="combobox"
            aria-expanded={aberto}
            aria-controls={`${idCampo}-lista`}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            className={cn(
              'flex min-h-[44px] w-full items-center justify-between gap-2 rounded-md border border-borda bg-superficie px-3 py-2 text-left text-texto',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
              erro && 'border-perigo',
            )}
          >
            {categoriaSelecionada ? (
              <ConteudoItemCategoria categoria={categoriaSelecionada} />
            ) : (
              <span className="text-textoSuave">Selecione uma categoria</span>
            )}
          </button>
        </PopoverGatilho>

        <PopoverConteudo align="start" className="w-80 p-2">
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textoSuave"
              aria-hidden="true"
            />
            <label htmlFor={idBusca} className="sr-only">
              Buscar categoria
            </label>
            <input
              id={idBusca}
              type="search"
              value={busca}
              placeholder="Buscar categoria..."
              onChange={aoBuscar}
              className="w-full rounded-md border border-borda bg-superficie py-2 pl-9 pr-3 text-texto placeholder:text-textoSuave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
            />
          </div>

          <div
            id={`${idCampo}-lista`}
            role="listbox"
            aria-label={rotulo}
            className="max-h-64 overflow-y-auto"
          >
            {itens.length === 0 ? (
              <p className="px-2 py-2 text-sm text-textoSuave">Nenhuma categoria encontrada.</p>
            ) : null}
            {itens.map(({ categoria, nivel }) => (
              <button
                key={categoria.id}
                type="button"
                role="option"
                aria-selected={categoria.id === valor}
                onClick={() => {
                  selecionar(categoria.id);
                }}
                className={cn(
                  'flex min-h-[44px] w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-borda',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                  nivel === 2 && 'ml-6',
                  categoria.id === valor && 'bg-primaria/10',
                )}
              >
                <ConteudoItemCategoria categoria={categoria} />
              </button>
            ))}
          </div>
        </PopoverConteudo>
      </Popover>
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
