import {
  ATALHOS_PERIODO,
  periodoDoAtalho,
  ROTULO_ATALHO_PERIODO,
} from '@/funcionalidades/movimentacoes/utilitarios/periodo';
import type { AtalhoPeriodo } from '@/funcionalidades/movimentacoes/utilitarios/periodo';
import { cn } from '@/utilitarios/cn';
import type { FiltroPeriodoUrl } from '../hooks/useFiltroPeriodoUrl';
import type { ReactElement } from 'react';

interface SelecionadorPeriodoProps {
  periodo: FiltroPeriodoUrl;
  timezone: string;
  aoAlterar: (periodo: FiltroPeriodoUrl) => void;
}

/** RF-47: atalhos comuns em vez de um seletor de data livre — "este mês"
 * cobre a maior parte do uso real do dashboard. "Este mês" limpa os
 * parâmetros da URL (deixa o backend decidir com base no timezone do
 * perfil) em vez de recalcular a mesma coisa aqui. */
export function SelecionadorPeriodo({
  periodo,
  timezone,
  aoAlterar,
}: SelecionadorPeriodoProps): ReactElement {
  const atalhoAtivo = periodo.dataInicio === null && periodo.dataFim === null;

  function selecionarAtalho(atalho: AtalhoPeriodo): void {
    if (atalho === 'ESTE_MES') {
      aoAlterar({ dataInicio: null, dataFim: null });
      return;
    }
    const { dataInicio, dataFim } = periodoDoAtalho(atalho, timezone);
    aoAlterar({ dataInicio, dataFim });
  }

  return (
    <div role="group" aria-label="Selecionar período do dashboard" className="flex flex-wrap gap-2">
      {ATALHOS_PERIODO.map((atalho) => {
        const ativo =
          atalho === 'ESTE_MES' ? atalhoAtivo : verificarAtalhoAtivo(atalho, periodo, timezone);
        return (
          <button
            key={atalho}
            type="button"
            aria-pressed={ativo}
            onClick={() => {
              selecionarAtalho(atalho);
            }}
            className={cn(
              'min-h-[36px] rounded-md border px-3 py-1.5 text-sm transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
              ativo
                ? 'border-primaria bg-primaria/10 font-semibold text-primaria'
                : 'border-borda bg-superficie font-medium text-texto hover:bg-borda',
            )}
          >
            {ROTULO_ATALHO_PERIODO[atalho]}
          </button>
        );
      })}
    </div>
  );
}

function verificarAtalhoAtivo(
  atalho: AtalhoPeriodo,
  periodo: FiltroPeriodoUrl,
  timezone: string,
): boolean {
  if (periodo.dataInicio === null || periodo.dataFim === null) return false;
  const calculado = periodoDoAtalho(atalho, timezone);
  return calculado.dataInicio === periodo.dataInicio && calculado.dataFim === periodo.dataFim;
}
