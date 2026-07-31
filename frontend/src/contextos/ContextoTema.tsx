import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export const TEMAS = ['CLARO', 'ESCURO', 'SISTEMA'] as const;
export type Tema = (typeof TEMAS)[number];
type TemaEfetivo = Extract<Tema, 'CLARO' | 'ESCURO'>;

const CHAVE_ARMAZENAMENTO = 'pfm:tema';

interface ContextoTemaValor {
  tema: Tema;
  temaEfetivo: TemaEfetivo;
  definirTema: (tema: Tema) => void;
}

const ContextoTema = createContext<ContextoTemaValor | null>(null);

function ehTema(valor: unknown): valor is Tema {
  return valor === 'CLARO' || valor === 'ESCURO' || valor === 'SISTEMA';
}

function lerTemaArmazenado(): Tema {
  const armazenado = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
  return ehTema(armazenado) ? armazenado : 'SISTEMA';
}

function obterPreferenciaSistema(): TemaEfetivo {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'ESCURO' : 'CLARO';
}

interface ProvedorTemaProps {
  children: ReactNode;
}

export function ProvedorTema({ children }: ProvedorTemaProps): JSX.Element {
  const [tema, setTema] = useState<Tema>(lerTemaArmazenado);
  const [preferenciaSistema, setPreferenciaSistema] = useState<TemaEfetivo>(obterPreferenciaSistema);

  // Acompanha a preferencia do SO em tempo real quando o tema escolhido e SISTEMA.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const ouvirMudanca = (evento: MediaQueryListEvent): void => {
      setPreferenciaSistema(evento.matches ? 'ESCURO' : 'CLARO');
    };

    consulta.addEventListener('change', ouvirMudanca);
    return () => consulta.removeEventListener('change', ouvirMudanca);
  }, []);

  const temaEfetivo: TemaEfetivo = tema === 'SISTEMA' ? preferenciaSistema : tema;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', temaEfetivo === 'ESCURO');
  }, [temaEfetivo]);

  const definirTema = useCallback((novoTema: Tema): void => {
    setTema(novoTema);
    window.localStorage.setItem(CHAVE_ARMAZENAMENTO, novoTema);
  }, []);

  const valor = useMemo<ContextoTemaValor>(
    () => ({ tema, temaEfetivo, definirTema }),
    [tema, temaEfetivo, definirTema],
  );

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function usarTema(): ContextoTemaValor {
  const contexto = useContext(ContextoTema);
  if (!contexto) {
    throw new Error('usarTema deve ser usado dentro de <ProvedorTema>.');
  }
  return contexto;
}
