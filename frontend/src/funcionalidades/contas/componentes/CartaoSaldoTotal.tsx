import { paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { ReactElement } from 'react';

interface CartaoSaldoTotalProps {
  saldoTotal: string;
  quantidadeContas: number;
}

export function CartaoSaldoTotal({
  saldoTotal,
  quantidadeContas,
}: CartaoSaldoTotalProps): ReactElement {
  const negativo = paraCentavos(saldoTotal) < 0;

  return (
    <section
      aria-label="Saldo total"
      className="flex flex-col gap-1 rounded-lg border border-borda bg-superficie p-6"
    >
      <span className="text-sm text-textoSuave">Saldo total</span>
      <span
        className={
          negativo
            ? 'font-mono text-3xl font-semibold tabular-nums text-perigo'
            : 'font-mono text-3xl font-semibold tabular-nums text-texto'
        }
      >
        {formatarMoeda(saldoTotal)}
      </span>
      <span className="text-sm text-textoSuave">
        {quantidadeContas} {quantidadeContas === 1 ? 'conta' : 'contas'} no saldo total
      </span>
    </section>
  );
}
