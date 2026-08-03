import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/servicos/api';
import { armazenamentoToken } from '@/servicos/armazenamento-token';
import * as autenticacaoServico from '@/servicos/autenticacao.servico';
import type { CredenciaisLogin } from '@/servicos/autenticacao.servico';
import { inscreverSessaoExpirada } from '@/servicos/evento-sessao-expirada';
import { consultarPerfil } from '@/servicos/perfil.servico';
import { renovarSessao } from '@/servicos/renovar-sessao';
import type { Usuario } from '@/tipos/usuario';
import { mapearPerfilParaUsuario } from '@/utilitarios/mapear-usuario';
import type { ReactElement, ReactNode } from 'react';

interface ContextoAutenticacaoValor {
  usuario: Usuario | null;
  estaAutenticado: boolean;
  /** true apenas durante a tentativa de restauracao de sessao no boot. */
  carregando: boolean;
  entrar: (credenciais: CredenciaisLogin) => Promise<void>;
  sair: () => Promise<void>;
}

const ContextoAutenticacao = createContext<ContextoAutenticacaoValor | null>(null);

interface ProvedorAutenticacaoProps {
  children: ReactNode;
}

export function ProvedorAutenticacao({ children }: ProvedorAutenticacaoProps): ReactElement {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Boot: uma unica tentativa silenciosa de POST /renovar a partir do
  // cookie httpOnly. Sem cookie valido, a chamada falha (401) e o usuario
  // segue deslogado — nao e um erro a reportar, e o caminho normal de um
  // visitante sem sessao.
  useEffect(() => {
    let cancelado = false;

    async function restaurarSessao(): Promise<void> {
      try {
        const { accessToken } = await renovarSessao(api.defaults.baseURL ?? '');
        armazenamentoToken.definir(accessToken);
        const perfil = await consultarPerfil();
        if (!cancelado) {
          setUsuario(mapearPerfilParaUsuario(perfil));
        }
      } catch {
        armazenamentoToken.definir(null);
        if (!cancelado) {
          setUsuario(null);
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    void restaurarSessao();
    return () => {
      cancelado = true;
    };
  }, []);

  // Sessao morrendo em pleno uso (refresh token expirado/revogado): o
  // interceptor de renovacao ja limpou o token, aqui so limpamos o usuario
  // — RotaProtegida cuida do redirecionamento a partir de estaAutenticado.
  useEffect(() => {
    return inscreverSessaoExpirada(() => {
      setUsuario(null);
    });
  }, []);

  const entrar = useCallback(async (credenciais: CredenciaisLogin): Promise<void> => {
    const resposta = await autenticacaoServico.entrar(credenciais);
    armazenamentoToken.definir(resposta.accessToken);
    setUsuario(resposta.usuario);
  }, []);

  const sair = useCallback(async (): Promise<void> => {
    try {
      await autenticacaoServico.sair();
    } finally {
      armazenamentoToken.definir(null);
      setUsuario(null);
    }
  }, []);

  const valor = useMemo<ContextoAutenticacaoValor>(
    () => ({ usuario, estaAutenticado: usuario !== null, carregando, entrar, sair }),
    [usuario, carregando, entrar, sair],
  );

  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}

// Nome em ingles (nao `usarSessao`): eslint-plugin-react-hooks reconhece
// Hooks customizados pelo prefixo fixo `use`, sem opcao de configuracao
// (05-DEVELOPMENT.md §4.1).
export function useSessao(): ContextoAutenticacaoValor {
  const contexto = useContext(ContextoAutenticacao);
  if (!contexto) {
    throw new Error('useSessao deve ser usado dentro de <ProvedorAutenticacao>.');
  }
  return contexto;
}
