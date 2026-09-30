import { NavLink } from 'react-router-dom';
import { cn } from '@/utilitarios/cn';
import { DistintivoConvites } from './DistintivoConvites';
import { ITENS_NAVEGACAO } from './itens-navegacao';
import type { ReactElement } from 'react';

// So aparece abaixo de lg (01-SPECIFICATION.md §8.4) — MenuLateral cobre
// o mesmo papel em telas maiores. Fixa no rodape, area de toque >= 44px
// (A11Y-08).
//
// A 320 px os rotulos nao cabem todos (soma ~535 px), entao a barra rola
// na horizontal em vez de recortar os ultimos itens — a pagina em si
// continua sem scroll horizontal, porque a barra e' `fixed` e a rolagem
// acontece dentro dela. `min-w-full justify-around` mantem os itens
// distribuidos quando ha espaco sobrando.
export function NavegacaoInferior(): ReactElement {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 overflow-x-auto border-t border-borda bg-superficie lg:hidden print:hidden"
    >
      <div className="flex min-w-full justify-around">
        {ITENS_NAVEGACAO.map((item) => (
          <NavLink
            key={item.para}
            to={item.para}
            end={item.fim ?? false}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] shrink-0 items-center justify-center gap-1 whitespace-nowrap px-3 text-sm font-medium text-textoSuave transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                isActive && 'font-semibold text-primaria',
              )
            }
          >
            {item.rotulo}
            {item.mostrarConvitesPendentes ? <DistintivoConvites /> : null}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
