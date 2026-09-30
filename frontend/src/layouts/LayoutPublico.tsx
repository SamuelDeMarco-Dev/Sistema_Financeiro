import { Outlet } from 'react-router-dom';
import { BannerHomologacao } from '@/componentes/layout/BannerHomologacao';
import type { ReactElement } from 'react';

export function LayoutPublico(): ReactElement {
  return (
    <div className="min-h-screen bg-fundo text-texto">
      <BannerHomologacao />
      <Outlet />
    </div>
  );
}
