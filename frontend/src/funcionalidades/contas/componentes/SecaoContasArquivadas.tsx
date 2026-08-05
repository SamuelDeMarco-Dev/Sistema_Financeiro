import { CartaoConta } from './CartaoConta';
import type { Conta } from '../tipos/conta';
import type { ReactElement } from 'react';

interface SecaoContasArquivadasProps {
  contas: Conta[];
  onEditar: (conta: Conta) => void;
  onDesarquivar: (id: string) => void;
  onExcluir: (conta: Conta) => void;
}

/** `<details>` nativo: recolhivel, acessivel por teclado e sem estado
 * proprio para gerenciar (01-SPECIFICATION.md §8.5 — nao reinventa o que o
 * HTML ja resolve). */
export function SecaoContasArquivadas({
  contas,
  onEditar,
  onDesarquivar,
  onExcluir,
}: SecaoContasArquivadasProps): ReactElement | null {
  if (contas.length === 0) return null;

  return (
    <details className="rounded-lg border border-borda">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-texto">
        Contas arquivadas ({contas.length})
      </summary>
      <div className="grid min-w-0 grid-cols-1 gap-4 p-4 pt-0 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {contas.map((conta) => (
          <CartaoConta
            key={conta.id}
            conta={conta}
            onEditar={() => {
              onEditar(conta);
            }}
            onDesarquivar={() => {
              onDesarquivar(conta.id);
            }}
            onExcluir={() => {
              onExcluir(conta);
            }}
          />
        ))}
      </div>
    </details>
  );
}
