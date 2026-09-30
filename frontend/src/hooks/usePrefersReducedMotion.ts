import { useEffect, useState } from 'react';

const CONSULTA = '(prefers-reduced-motion: reduce)';

function lerPreferencia(): boolean {
  return window.matchMedia(CONSULTA).matches;
}

// A11Y-07: graficos (Recharts) desligam a animacao de entrada quando o SO
// pede menos movimento — mesma tecnica de matchMedia do ContextoTema,
// mas sem precisar de contexto global (nao e uma escolha do usuario no
// app, e uma preferencia do sistema so consultada, nunca definida aqui).
export function usePrefersReducedMotion(): boolean {
  const [prefereReduzido, setPrefereReduzido] = useState<boolean>(lerPreferencia);

  useEffect(() => {
    const consulta = window.matchMedia(CONSULTA);
    const ouvirMudanca = (evento: MediaQueryListEvent): void => {
      setPrefereReduzido(evento.matches);
    };

    consulta.addEventListener('change', ouvirMudanca);
    return () => {
      consulta.removeEventListener('change', ouvirMudanca);
    };
  }, []);

  return prefereReduzido;
}
