import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { EsqueletoPagina } from '@/componentes/feedback';
import { useSessao } from '@/contextos/ContextoAutenticacao';
import type { ReactElement } from 'react';

/** Guarda de rotas autenticadas: sem sessao valida, redireciona a /entrar
 * preservando o destino original em `state.de` (issue #19 le isso apos o
 * login para voltar aqui). Durante a checagem de boot, mostra um skeleton
 * em vez do conteudo protegido OU de um redirecionamento prematuro. */
export function RotaProtegida(): ReactElement {
  const { estaAutenticado, carregando } = useSessao();
  const localizacao = useLocation();

  if (carregando) {
    return <EsqueletoPagina />;
  }

  if (!estaAutenticado) {
    return <Navigate to="/entrar" state={{ de: localizacao }} replace />;
  }

  return <Outlet />;
}
