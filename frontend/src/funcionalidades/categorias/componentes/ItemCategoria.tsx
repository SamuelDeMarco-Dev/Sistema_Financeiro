import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { createElement } from 'react';
import { ItemMenuAcoes, MenuAcoes } from '@/componentes/ui/MenuAcoes';
import { resolverIcone } from '@/constantes/icones';
import { cn } from '@/utilitarios/cn';
import type { Categoria } from '../tipos/categoria';
import type { KeyboardEvent, ReactElement } from 'react';

interface ItemCategoriaProps {
  categoria: Categoria;
  nivel: 1 | 2;
  expandido: boolean;
  temFilhos: boolean;
  onAlternarExpandido: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onNovaSubcategoria?: (() => void) | undefined;
  onTeclado: (evento: KeyboardEvent<HTMLDivElement>) => void;
  foco: boolean;
  onFoco: () => void;
}

export function ItemCategoria({
  categoria,
  nivel,
  expandido,
  temFilhos,
  onAlternarExpandido,
  onEditar,
  onExcluir,
  onNovaSubcategoria,
  onTeclado,
  foco,
  onFoco,
}: ItemCategoriaProps): ReactElement {
  return (
    <div
      id={`categoria-${categoria.id}`}
      role="treeitem"
      aria-level={nivel}
      aria-expanded={temFilhos ? expandido : undefined}
      aria-selected={foco}
      tabIndex={foco ? 0 : -1}
      onFocus={onFoco}
      onKeyDown={onTeclado}
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-2 outline-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
        'hover:bg-borda',
        nivel === 2 && 'ml-6',
      )}
    >
      {temFilhos ? (
        <button
          type="button"
          aria-label={expandido ? `Recolher ${categoria.nome}` : `Expandir ${categoria.nome}`}
          tabIndex={-1}
          onClick={onAlternarExpandido}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-textoSuave hover:bg-borda"
        >
          <ChevronRight
            className={cn('h-4 w-4 transition-transform', expandido && 'rotate-90')}
            aria-hidden="true"
          />
        </button>
      ) : (
        <span className="h-6 w-6 shrink-0" aria-hidden="true" />
      )}

      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: `${categoria.cor}1A`, color: categoria.cor }}
      >
        {/* resolverIcone escolhe entre icones estaticos por um dado em
            runtime — createElement evita o falso-positivo de
            react-hooks/static-components (mesma razao do CartaoConta). */}
        {createElement(resolverIcone(categoria.icone), {
          className: 'h-4 w-4',
          'aria-hidden': true,
        })}
      </span>

      <span className="min-w-0 flex-1 truncate text-texto">{categoria.nome}</span>

      <span className="shrink-0 text-sm text-textoSuave">
        {categoria.quantidadeMovimentacoes}{' '}
        {categoria.quantidadeMovimentacoes === 1 ? 'lançamento' : 'lançamentos'}
      </span>

      <MenuAcoes rotuloGatilho={`Ações de ${categoria.nome}`}>
        <ItemMenuAcoes onSelect={onEditar}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Editar
        </ItemMenuAcoes>
        {nivel === 1 && onNovaSubcategoria ? (
          <ItemMenuAcoes onSelect={onNovaSubcategoria}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova subcategoria
          </ItemMenuAcoes>
        ) : null}
        <ItemMenuAcoes perigo onSelect={onExcluir}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Excluir
        </ItemMenuAcoes>
      </MenuAcoes>
    </div>
  );
}
