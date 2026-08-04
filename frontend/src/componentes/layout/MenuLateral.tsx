import { NavLink } from 'react-router-dom';
import { cn } from '@/utilitarios/cn';
import { ITENS_NAVEGACAO } from './itens-navegacao';
import type { ReactElement } from 'react';

// So aparece em telas >= lg (01-SPECIFICATION.md §8.4) — em mobile a
// navegacao equivalente e' NavegacaoInferior.
export function MenuLateral(): ReactElement {
  return (
    <nav
      aria-label="Navegação principal"
      className="hidden w-56 shrink-0 border-r border-borda bg-superficie p-4 lg:block"
    >
      <ul className="flex flex-col gap-1">
        {ITENS_NAVEGACAO.map((item) => (
          <li key={item.para}>
            <NavLink
              to={item.para}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm font-medium text-texto transition-colors hover:bg-borda',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                  isActive && 'bg-primaria/10 font-semibold text-primaria',
                )
              }
            >
              {item.rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
