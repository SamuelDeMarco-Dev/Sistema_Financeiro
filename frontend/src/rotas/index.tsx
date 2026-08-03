import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { EsqueletoPagina } from '@/componentes/feedback';
import { LayoutAutenticado } from '@/layouts/LayoutAutenticado';
import { LayoutPublico } from '@/layouts/LayoutPublico';
import { RotaProtegida } from './RotaProtegida';
import type { ReactElement, ReactNode } from 'react';

// React.lazy: cada pagina vira um chunk separado, carregado sob demanda na
// navegacao (nunca no bundle inicial).
const Inicio = lazy(() =>
  import('@/paginas/Inicio').then((modulo) => ({ default: modulo.Inicio })),
);
const NaoEncontrada = lazy(() =>
  import('@/paginas/NaoEncontrada').then((modulo) => ({ default: modulo.NaoEncontrada })),
);

function ComSuspense({ children }: { children: ReactNode }): ReactElement {
  return <Suspense fallback={<EsqueletoPagina />}>{children}</Suspense>;
}

export const rotas = createBrowserRouter([
  {
    element: <LayoutPublico />,
    children: [
      {
        index: true,
        element: (
          <ComSuspense>
            <Inicio />
          </ComSuspense>
        ),
      },
    ],
  },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <LayoutAutenticado />,
        // Paginas autenticadas (Dashboard, Movimentacoes, ...) entram aqui
        // conforme cada funcionalidade chega, uma issue por vez.
        children: [],
      },
    ],
  },
  {
    path: '*',
    element: (
      <ComSuspense>
        <NaoEncontrada />
      </ComSuspense>
    ),
  },
]);
