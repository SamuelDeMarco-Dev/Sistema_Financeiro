import { Archive, ArchiveRestore, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { createElement } from 'react';
import { ItemMenuAcoes, MenuAcoes } from '@/componentes/ui/MenuAcoes';
import { resolverIconeConta } from '@/constantes/icones-conta';
import { ROTULO_TIPO_CONTA } from '@/constantes/tipos-conta';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { Conta } from '../tipos/conta';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import type { ReactElement } from 'react';

interface AtributosArrasto {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
}

interface CartaoContaProps {
  conta: Conta;
  arrasto?: AtributosArrasto;
  onEditar: () => void;
  onArquivar?: () => void;
  onDesarquivar?: () => void;
  onExcluir: () => void;
}

export function CartaoConta({
  conta,
  arrasto,
  onEditar,
  onArquivar = () => undefined,
  onDesarquivar = () => undefined,
  onExcluir,
}: CartaoContaProps): ReactElement {
  const saldoNegativo = paraCentavos(conta.saldoAtual) < 0;

  return (
    <article
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-borda bg-superficie p-4"
      aria-label={`Conta ${conta.nome}`}
    >
      <div className="flex items-center gap-2">
        {arrasto ? (
          <button
            type="button"
            aria-label={`Reordenar ${conta.nome}`}
            className="flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-md text-textoSuave hover:bg-borda hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria active:cursor-grabbing"
            {...arrasto.attributes}
            {...arrasto.listeners}
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}

        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${conta.cor}1A`, color: conta.cor }}
        >
          {/* resolverIconeConta escolhe entre icones ja existentes (Record
              estatico) segundo um dado em runtime (conta.icone) — nao ha
              como hospedar essa escolha fora do componente. createElement
              (em vez de <Icone/>) evita o falso-positivo de
              react-hooks/static-components para esse padrao. */}
          {createElement(resolverIconeConta(conta.icone), {
            className: 'h-5 w-5',
            'aria-hidden': true,
          })}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-texto">{conta.nome}</p>
          <p className="truncate text-sm text-textoSuave">{ROTULO_TIPO_CONTA[conta.tipo]}</p>
        </div>

        <MenuAcoes rotuloGatilho={`Ações de ${conta.nome}`}>
          <ItemMenuAcoes onSelect={onEditar}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar
          </ItemMenuAcoes>
          {conta.arquivada ? (
            <ItemMenuAcoes onSelect={onDesarquivar}>
              <ArchiveRestore className="h-4 w-4" aria-hidden="true" />
              Desarquivar
            </ItemMenuAcoes>
          ) : (
            <ItemMenuAcoes onSelect={onArquivar}>
              <Archive className="h-4 w-4" aria-hidden="true" />
              Arquivar
            </ItemMenuAcoes>
          )}
          <ItemMenuAcoes perigo onSelect={onExcluir}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Excluir
          </ItemMenuAcoes>
        </MenuAcoes>
      </div>

      <p
        className={
          saldoNegativo
            ? 'font-mono text-xl font-semibold tabular-nums text-perigo'
            : 'font-mono text-xl font-semibold tabular-nums text-texto'
        }
      >
        {formatarMoeda(conta.saldoAtual)}
      </p>
    </article>
  );
}
