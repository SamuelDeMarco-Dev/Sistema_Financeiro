import { Outlet } from 'react-router-dom';
import type { ReactElement } from 'react';

// TODO(#autenticacao): redirecionar para /entrar quando nao houver sessao.
// Placeholder deliberado — M0 nao inclui autenticacao real (issue #7,
// "sem auth real ainda"); a verificacao chega com M1.
export function RotaProtegida(): ReactElement {
  return <Outlet />;
}
