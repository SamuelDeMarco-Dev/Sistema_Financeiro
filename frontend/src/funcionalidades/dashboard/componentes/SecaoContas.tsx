import { createElement } from 'react';
import { EstadoVazio } from '@/componentes/feedback';
import { resolverIcone } from '@/constantes/icones';
import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { ContaResumoDashboard } from '../tipos/dashboard';
import type { ReactElement } from 'react';

interface SecaoContasProps {
  contas: ContaResumoDashboard[];
}

export function SecaoContas({ contas }: SecaoContasProps): ReactElement {
  return (
    <section aria-label="Contas" className="rounded-lg border border-borda bg-superficie p-4">
      <h2 className="mb-3 text-sm font-semibold text-texto">Contas</h2>
      {contas.length === 0 ? (
        <EstadoVazio titulo="Nenhuma conta cadastrada" />
      ) : (
        <ul className="sm:grid-cols-2 grid grid-cols-1 gap-3">
          {contas.map((conta) => {
            const saldoNegativo = paraCentavos(conta.saldoAtual) < 0;
            return (
              <li
                key={conta.id}
                className="flex items-center gap-3 rounded-md border border-borda p-3"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${conta.cor}1A`, color: conta.cor }}
                >
                  {createElement(resolverIcone(conta.icone), {
                    className: 'h-5 w-5',
                    'aria-hidden': true,
                  })}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{conta.nome}</p>
                  <p
                    className={
                      saldoNegativo
                        ? 'font-mono text-sm tabular-nums text-perigo'
                        : 'font-mono text-sm tabular-nums text-texto'
                    }
                  >
                    {formatarMoeda(conta.saldoAtual)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
