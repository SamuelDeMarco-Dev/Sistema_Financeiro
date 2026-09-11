import type { Movimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface IndicadoresMovimentacaoProps {
  movimentacao: Movimentacao;
}

/** RF-27/RF-28/RF-38: recorrência, parcelamento e transferência sempre
 * com rótulo textual junto do símbolo — símbolo isolado falha A11Y-01
 * (cor/ícone nunca são o único indicador de significado). */
export function IndicadoresMovimentacao({
  movimentacao,
}: IndicadoresMovimentacaoProps): ReactElement | null {
  const indicadores: { chave: string; texto: string }[] = [];

  if (movimentacao.recorrencia) {
    indicadores.push({ chave: 'recorrencia', texto: '↻ Recorrente' });
  }
  if (movimentacao.parcelamento) {
    indicadores.push({ chave: 'parcelamento', texto: movimentacao.parcelamento.rotulo });
  }
  if (movimentacao.transferencia) {
    indicadores.push({ chave: 'transferencia', texto: '⇄ Transferência' });
  }
  if (movimentacao.quantidadeAnexos > 0) {
    indicadores.push({
      chave: 'anexos',
      texto: `📎 ${movimentacao.quantidadeAnexos} anexo${movimentacao.quantidadeAnexos === 1 ? '' : 's'}`,
    });
  }

  if (indicadores.length === 0) return null;

  return (
    <span className="flex flex-wrap items-center gap-1">
      {indicadores.map((indicador) => (
        <span
          key={indicador.chave}
          className="rounded-full bg-borda px-2 py-0.5 text-xs text-textoSuave"
        >
          {indicador.texto}
        </span>
      ))}
    </span>
  );
}
