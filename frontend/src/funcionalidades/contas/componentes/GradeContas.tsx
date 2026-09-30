import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CartaoConta } from './CartaoConta';
import type { Conta } from '../tipos/conta';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ReactElement } from 'react';

interface GradeContasProps {
  contas: Conta[];
  onReordenar: (ordens: { id: string; ordem: number }[]) => void;
  onEditar: (conta: Conta) => void;
  onArquivar: (id: string) => void;
  onDesarquivar: (id: string) => void;
  onExcluir: (conta: Conta) => void;
}

interface ItemContaArrastavelProps {
  conta: Conta;
  onEditar: (conta: Conta) => void;
  onArquivar: (id: string) => void;
  onDesarquivar: (id: string) => void;
  onExcluir: (conta: Conta) => void;
}

function ItemContaArrastavel({
  conta,
  onEditar,
  onArquivar,
  onDesarquivar,
  onExcluir,
}: ItemContaArrastavelProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: conta.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="min-w-0"
    >
      <CartaoConta
        conta={conta}
        arrasto={{ attributes, listeners }}
        onEditar={() => {
          onEditar(conta);
        }}
        onArquivar={() => {
          onArquivar(conta.id);
        }}
        onDesarquivar={() => {
          onDesarquivar(conta.id);
        }}
        onExcluir={() => {
          onExcluir(conta);
        }}
      />
    </div>
  );
}

/** RF-18: reordenacao por arrastar com alternativa acessivel por teclado —
 * o KeyboardSensor do dnd-kit ja cobre setas + espaco para pegar/mover/soltar. */
export function GradeContas({
  contas,
  onReordenar,
  onEditar,
  onArquivar,
  onDesarquivar,
  onExcluir,
}: GradeContasProps): ReactElement {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function aoTerminarArrasto(evento: DragEndEvent): void {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;

    const indiceAntigo = contas.findIndex((conta) => conta.id === active.id);
    const indiceNovo = contas.findIndex((conta) => conta.id === over.id);
    if (indiceAntigo === -1 || indiceNovo === -1) return;

    const reordenadas = arrayMove(contas, indiceAntigo, indiceNovo);
    onReordenar(reordenadas.map((conta, indice) => ({ id: conta.id, ordem: indice })));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={aoTerminarArrasto}>
      <SortableContext items={contas.map((conta) => conta.id)} strategy={rectSortingStrategy}>
        <div
          className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          aria-label="Contas"
        >
          {contas.map((conta) => (
            <ItemContaArrastavel
              key={conta.id}
              conta={conta}
              onEditar={onEditar}
              onArquivar={onArquivar}
              onDesarquivar={onDesarquivar}
              onExcluir={onExcluir}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
