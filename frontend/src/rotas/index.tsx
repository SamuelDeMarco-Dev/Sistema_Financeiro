import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { EsqueletoPagina } from '@/componentes/feedback';
import { LayoutAutenticado } from '@/layouts/LayoutAutenticado';
import { LayoutPublico } from '@/layouts/LayoutPublico';
import { RotaProtegida } from './RotaProtegida';
import { RotaPublica } from './RotaPublica';
import type { ReactElement, ReactNode } from 'react';

// React.lazy: cada pagina vira um chunk separado, carregado sob demanda na
// navegacao (nunca no bundle inicial).
const Inicio = lazy(() =>
  import('@/paginas/Inicio').then((modulo) => ({ default: modulo.Inicio })),
);
const Entrar = lazy(() =>
  import('@/paginas/Entrar').then((modulo) => ({ default: modulo.Entrar })),
);
const Cadastro = lazy(() =>
  import('@/paginas/Cadastro').then((modulo) => ({ default: modulo.Cadastro })),
);
const VerificarEmail = lazy(() =>
  import('@/paginas/VerificarEmail').then((modulo) => ({ default: modulo.VerificarEmail })),
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
      {
        // Acessivel independente de sessao: o link do e-mail pode ser aberto
        // deslogado (caso comum) ou logado, e verificar precisa funcionar
        // nos dois casos — por isso fora de RotaPublica.
        path: 'verificar-email',
        element: (
          <ComSuspense>
            <VerificarEmail />
          </ComSuspense>
        ),
      },
      {
        element: <RotaPublica />,
        children: [
          {
            path: 'entrar',
            element: (
              <ComSuspense>
                <Entrar />
              </ComSuspense>
            ),
          },
          {
            path: 'cadastrar',
            element: (
              <ComSuspense>
                <Cadastro />
              </ComSuspense>
            ),
          },
        ],
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
