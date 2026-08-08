import { EstadoVazio } from '@/componentes/feedback';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { PorCategoriaItem } from '../tipos/dashboard';
import type { ReactElement } from 'react';

interface SecaoPorCategoriaProps {
  itens: PorCategoriaItem[];
}

/** Representação simples (lista + barra de percentual) — a issue #54
 * substitui isto por um `GraficoPizza` acessível, com a mesma paleta
 * determinística por categoria usada aqui na borda de cada barra. */
export function SecaoPorCategoria({ itens }: SecaoPorCategoriaProps): ReactElement {
  return (
    <section
      aria-label="Despesas por categoria"
      className="rounded-lg border border-borda bg-superficie p-4"
    >
      <h2 className="mb-3 text-sm font-semibold text-texto">Despesas por categoria</h2>
      {itens.length === 0 ? (
        <EstadoVazio titulo="Sem despesas no período analisado" />
      ) : (
        <ul className="flex flex-col gap-3">
          {itens.map((item) => (
            <li key={item.categoria.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-texto">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.categoria.cor }}
                  />
                  {item.categoria.nome}
                </span>
                <span className="font-mono tabular-nums text-textoSuave">
                  {formatarMoeda(item.total)} ({item.percentual.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full rounded bg-fundo">
                <div
                  aria-hidden="true"
                  className="h-2 rounded"
                  style={{ width: `${item.percentual}%`, backgroundColor: item.categoria.cor }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
