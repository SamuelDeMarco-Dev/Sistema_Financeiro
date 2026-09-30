import { formatarMoeda } from '@/utilitarios/formatadores';
import type { TotalizadoresMovimentacoes } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface CartaoTotalizadoresProps {
  totalizadores: TotalizadoresMovimentacoes;
}

/** RF-35: reflete o filtro inteiro, não a página atual — os valores vêm
 * prontos de `meta.totalizadores` (RN-25: já excluem transferências e
 * canceladas). */
export function CartaoTotalizadores({ totalizadores }: CartaoTotalizadoresProps): ReactElement {
  const resultadoNegativo = totalizadores.resultado.trim().startsWith('-');

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="rounded-md border border-borda bg-superficie p-4">
        <p className="text-sm text-textoSuave">Receitas</p>
        <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-sucesso">
          + {formatarMoeda(totalizadores.receitas)}
        </p>
      </div>
      <div className="rounded-md border border-borda bg-superficie p-4">
        <p className="text-sm text-textoSuave">Despesas</p>
        <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-perigo">
          − {formatarMoeda(totalizadores.despesas)}
        </p>
      </div>
      <div className="rounded-md border border-borda bg-superficie p-4">
        <p className="text-sm text-textoSuave">Resultado</p>
        <p
          className={`mt-1 font-mono text-lg font-semibold tabular-nums ${resultadoNegativo ? 'text-perigo' : 'text-sucesso'}`}
        >
          {resultadoNegativo ? '' : '+ '}
          {formatarMoeda(totalizadores.resultado)}
        </p>
      </div>
    </div>
  );
}
