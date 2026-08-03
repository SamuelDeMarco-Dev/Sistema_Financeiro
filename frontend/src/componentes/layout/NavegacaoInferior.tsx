import { NavLink } from 'react-router-dom';
import { cn } from '@/utilitarios/cn';
import { ITENS_NAVEGACAO } from './itens-navegacao';
import type { ReactElement } from 'react';

// So aparece abaixo de lg (01-SPECIFICATION.md §8.4) — MenuLateral cobre
// o mesmo papel em telas maiores. Fixa no rodape, area de toque >= 44px
// (A11Y-08).
export function NavegacaoInferior(): ReactElement {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-borda bg-superficie lg:hidden"
    >
      {ITENS_NAVEGACAO.map((item) => (
        <NavLink
          key={item.para}
          to={item.para}
          className={({ isActive }) =>
            cn(
              'flex min-h-[44px] flex-1 items-center justify-center text-sm font-medium text-textoSuave transition-colors',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
              isActive && 'font-semibold text-primaria',
            )
          }
        >
          {item.rotulo}
        </NavLink>
      ))}
    </nav>
  );
}
