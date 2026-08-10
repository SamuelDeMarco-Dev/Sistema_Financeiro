import { Outlet } from 'react-router-dom';
import { BannerHomologacao } from '@/componentes/layout/BannerHomologacao';
import { Cabecalho } from '@/componentes/layout/Cabecalho';
import { MenuLateral } from '@/componentes/layout/MenuLateral';
import { NavegacaoInferior } from '@/componentes/layout/NavegacaoInferior';
import type { ReactElement } from 'react';

export function LayoutAutenticado(): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-fundo text-texto">
      <BannerHomologacao />
      <Cabecalho />
      <div className="flex flex-1">
        <MenuLateral />
        {/* pb-16 no mobile: espaco para a NavegacaoInferior fixa nao cobrir o
            fim do conteudo. */}
        <main className="min-w-0 flex-1 p-4 pb-20 md:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <NavegacaoInferior />
    </div>
  );
}
