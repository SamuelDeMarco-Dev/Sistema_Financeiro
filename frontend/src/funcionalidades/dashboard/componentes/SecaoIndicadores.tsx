import { CalendarClock, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { formatarMoeda } from '@/utilitarios/formatadores';
import { CartaoIndicador } from './CartaoIndicador';
import type { Indicadores } from '../tipos/dashboard';
import type { ReactElement } from 'react';

interface SecaoIndicadoresProps {
  indicadores: Indicadores;
}

const TAMANHO_ICONE = 20;

/** RF-40/RF-47: 1 coluna no mobile, 2 a partir de `md`, 4 a partir de
 * `xl` — nunca gera rolagem horizontal em 320px (grid, nao flex). */
export function SecaoIndicadores({ indicadores }: SecaoIndicadoresProps): ReactElement {
  return (
    <section
      aria-label="Indicadores do período"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      <CartaoIndicador
        rotulo="Saldo atual"
        valorFormatado={formatarMoeda(indicadores.saldoAtual)}
        icone={<Wallet size={TAMANHO_ICONE} />}
      />
      <CartaoIndicador
        rotulo="Receitas"
        valorFormatado={formatarMoeda(indicadores.receitas)}
        icone={<TrendingUp size={TAMANHO_ICONE} />}
        variacao={indicadores.variacaoReceitas}
        direcaoFavoravel="ALTA"
      />
      <CartaoIndicador
        rotulo="Despesas"
        valorFormatado={formatarMoeda(indicadores.despesas)}
        icone={<TrendingDown size={TAMANHO_ICONE} />}
        variacao={indicadores.variacaoDespesas}
        direcaoFavoravel="BAIXA"
      />
      <CartaoIndicador
        rotulo="Saldo previsto"
        valorFormatado={formatarMoeda(indicadores.saldoPrevisto)}
        icone={<CalendarClock size={TAMANHO_ICONE} />}
      />
    </section>
  );
}
