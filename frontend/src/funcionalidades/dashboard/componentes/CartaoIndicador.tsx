import { cn } from '@/utilitarios/cn';
import type { ReactElement } from 'react';

interface CartaoIndicadorProps {
  rotulo: string;
  valorFormatado: string;
  icone: ReactElement;
  variacao?: number | undefined;
  /** RN: para despesas, uma alta é desfavorável (vermelha) — o inverso de
   * receitas/saldo. A11Y-01: a seta e o sinal numérico sempre acompanham
   * a cor, nunca só ela. */
  direcaoFavoravel?: 'ALTA' | 'BAIXA';
}

export function CartaoIndicador({
  rotulo,
  valorFormatado,
  icone,
  variacao,
  direcaoFavoravel = 'ALTA',
}: CartaoIndicadorProps): ReactElement {
  const temVariacao = variacao !== undefined && Number.isFinite(variacao);
  const subiu = temVariacao && variacao > 0;
  const desceu = temVariacao && variacao < 0;
  const favoravel = subiu
    ? direcaoFavoravel === 'ALTA'
    : desceu
      ? direcaoFavoravel === 'BAIXA'
      : true;

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-4">
      <div className="flex items-center gap-2 text-textoSuave">
        <span aria-hidden="true">{icone}</span>
        <span className="text-sm">{rotulo}</span>
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums text-texto">{valorFormatado}</p>
      {temVariacao ? (
        <p
          className={cn(
            'flex items-center gap-1 text-sm font-medium',
            favoravel ? 'text-sucesso' : 'text-perigo',
          )}
        >
          <span aria-hidden="true">{subiu ? '▲' : desceu ? '▼' : '—'}</span>
          <span>
            {variacao > 0 ? '+' : ''}
            {variacao.toFixed(1)}% vs. período anterior
          </span>
        </p>
      ) : null}
    </article>
  );
}
