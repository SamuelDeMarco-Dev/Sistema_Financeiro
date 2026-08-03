import { Navigate, Outlet } from 'react-router-dom';
import { EsqueletoPagina } from '@/componentes/feedback';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import type { ReactElement } from 'react';

/** Guarda o inverso de RotaProtegida: paginas exclusivas de visitante
 * (login, cadastro, recuperar senha — issues #19/#20). Um usuario ja
 * autenticado que caia aqui (aba antiga, back do navegador) e mandado de
 * volta para a area logada em vez de ver o formulario de novo. */
export function RotaPublica(): ReactElement {
  const { estaAutenticado, carregando } = useSessao();

  if (carregando) {
    return <EsqueletoPagina />;
  }

  if (estaAutenticado) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
