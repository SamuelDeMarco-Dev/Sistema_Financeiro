import { Link } from 'react-router-dom';
import { EstadoVazio } from '@/componentes/feedback';
import { SeloSituacao } from '@/funcionalidades/movimentacoes/componentes/SeloSituacao';
import type { Movimentacao } from '@/funcionalidades/movimentacoes/tipos/movimentacao';
import { formatarDataBr } from '@/utilitarios/data';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { ReactElement } from 'react';

interface SecaoUltimasMovimentacoesProps {
  movimentacoes: Movimentacao[];
}

/** RF-43: previsualização (10 itens, já resolvidos pelo backend) com um
 * link para a listagem completa — não duplica edição/exclusão aqui. */
export function SecaoUltimasMovimentacoes({
  movimentacoes,
}: SecaoUltimasMovimentacoesProps): ReactElement {
  return (
    <section
      aria-label="Últimas movimentações"
      className="rounded-lg border border-borda bg-superficie p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-texto">Últimas movimentações</h2>
        <Link to="/movimentacoes" className="text-sm font-medium text-primaria hover:underline">
          Ver todas
        </Link>
      </div>
      {movimentacoes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma movimentação ainda"
          descricao="Registre sua primeira receita ou despesa para começar."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-borda">
          {movimentacoes.map((movimentacao) => {
            const ehReceita = movimentacao.tipo === 'RECEITA';
            const ehDespesa = movimentacao.tipo === 'DESPESA';
            const cor = ehReceita ? 'text-sucesso' : ehDespesa ? 'text-perigo' : 'text-texto';
            const sinal = ehReceita ? '+ ' : ehDespesa ? '− ' : '';

            return (
              <li key={movimentacao.id} className="flex items-center gap-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-texto">{movimentacao.descricao}</p>
                  <p className="truncate text-xs text-textoSuave">
                    {formatarDataBr(movimentacao.dataCompetencia)} ·{' '}
                    {movimentacao.conta?.nome ?? '—'}
                  </p>
                </div>
                <SeloSituacao situacao={movimentacao.situacao} />
                <span className={`w-24 shrink-0 text-right font-mono tabular-nums ${cor}`}>
                  {sinal}
                  {formatarMoeda(movimentacao.valor)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
