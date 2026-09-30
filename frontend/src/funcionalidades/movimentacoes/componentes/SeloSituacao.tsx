import { cn } from '@/utilitarios/cn';
import { ROTULO_SITUACAO_MOVIMENTACAO } from '../tipos/movimentacao';
import type { SituacaoMovimentacao } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface SeloSituacaoProps {
  situacao: SituacaoMovimentacao;
}

const CORES: Record<SituacaoMovimentacao, string> = {
  PENDENTE: 'bg-borda text-textoSuave',
  PAGA: 'bg-sucesso/10 text-sucesso',
  PAGA_PARCIALMENTE: 'bg-atencao/10 text-atencao',
  ATRASADA: 'bg-perigo/10 text-perigo',
  CANCELADA: 'bg-borda text-textoSuave line-through',
};

export function SeloSituacao({ situacao }: SeloSituacaoProps): ReactElement {
  return (
    <span
      className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', CORES[situacao])}
    >
      {ROTULO_SITUACAO_MOVIMENTACAO[situacao]}
    </span>
  );
}
