import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { armazenamentoToken } from '@/servicos/armazenamento-token';
import * as autenticacaoServico from '@/servicos/autenticacao.servico';
import { notificarSessaoExpirada } from '@/servicos/evento-sessao-expirada';
import * as perfilServico from '@/servicos/perfil.servico';
import * as renovarSessaoServico from '@/servicos/renovar-sessao';
import type { PerfilCompleto } from '@/tipos/perfil';
import { ProvedorAutenticacao, useSessao } from './ContextoAutenticacao';
import type { ReactNode } from 'react';

vi.mock('@/servicos/renovar-sessao');
vi.mock('@/servicos/perfil.servico');
vi.mock('@/servicos/autenticacao.servico');

function Wrapper({ children }: { children: ReactNode }): ReturnType<typeof ProvedorAutenticacao> {
  return <ProvedorAutenticacao>{children}</ProvedorAutenticacao>;
}

const PERFIL_FAKE: PerfilCompleto = {
  id: 'usuario-1',
  nome: 'Samuel De Marco',
  email: 'samuel@exemplo.com',
  emailVerificado: true,
  fotoUrl: null,
  moedaPadrao: 'BRL',
  idioma: 'pt-BR',
  tema: 'SISTEMA',
  timezone: 'America/Sao_Paulo',
  formatoData: 'dd/MM/yyyy',
  primeiroDiaSemana: 0,
  notificacoesApp: true,
  notificacoesEmail: true,
  criadoEm: '2026-01-01T00:00:00.000Z',
};

describe('ProvedorAutenticacao / useSessao', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    armazenamentoToken.definir(null);
  });

  it('restaura a sessao no boot quando ha cookie de refresh valido', async () => {
    vi.mocked(renovarSessaoServico.renovarSessao).mockResolvedValue({
      accessToken: 'token-1',
      expiraEm: 900,
    });
    vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(PERFIL_FAKE);

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });

    expect(result.current.carregando).toBe(true);
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.estaAutenticado).toBe(true);
    expect(result.current.usuario?.nome).toBe('Samuel De Marco');
    expect(armazenamentoToken.obter()).toBe('token-1');
  });

  it('sem cookie valido, permanece deslogado apos o boot (nao e um erro)', async () => {
    vi.mocked(renovarSessaoServico.renovarSessao).mockRejectedValue(new Error('sem cookie'));

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    expect(result.current.estaAutenticado).toBe(false);
    expect(result.current.usuario).toBeNull();
    expect(armazenamentoToken.obter()).toBeNull();
    expect(perfilServico.consultarPerfil).not.toHaveBeenCalled();
  });

  it('entrar() autentica com a resposta de /autenticacao/entrar direto, sem GET /perfil extra', async () => {
    vi.mocked(renovarSessaoServico.renovarSessao).mockRejectedValue(new Error('sem cookie'));
    vi.mocked(autenticacaoServico.entrar).mockResolvedValue({
      accessToken: 'token-2',
      expiraEm: 900,
      usuario: {
        id: 'usuario-1',
        nome: 'Samuel De Marco',
        email: 'samuel@exemplo.com',
        perfil: {
          fotoUrl: null,
          moedaPadrao: 'BRL',
          idioma: 'pt-BR',
          tema: 'SISTEMA',
          timezone: 'America/Sao_Paulo',
        },
      },
    });

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.carregando).toBe(false);
    });

    await act(async () => {
      await result.current.entrar({ email: 'samuel@exemplo.com', senha: 'SenhaForte@2026' });
    });

    expect(result.current.estaAutenticado).toBe(true);
    expect(result.current.usuario?.id).toBe('usuario-1');
    expect(armazenamentoToken.obter()).toBe('token-2');
    expect(perfilServico.consultarPerfil).not.toHaveBeenCalled();
  });

  it('sair() limpa o estado local mesmo quando a chamada a API falha', async () => {
    vi.mocked(renovarSessaoServico.renovarSessao).mockResolvedValue({
      accessToken: 'token-1',
      expiraEm: 900,
    });
    vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(PERFIL_FAKE);
    vi.mocked(autenticacaoServico.sair).mockRejectedValue(new Error('rede caiu'));

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.estaAutenticado).toBe(true);
    });

    await act(async () => {
      await expect(result.current.sair()).rejects.toThrow('rede caiu');
    });

    expect(result.current.estaAutenticado).toBe(false);
    expect(result.current.usuario).toBeNull();
    expect(armazenamentoToken.obter()).toBeNull();
  });

  it('reage ao evento sessao-expirada limpando o usuario (renovacao reativa falhou em pleno uso)', async () => {
    vi.mocked(renovarSessaoServico.renovarSessao).mockResolvedValue({
      accessToken: 'token-1',
      expiraEm: 900,
    });
    vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(PERFIL_FAKE);

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.estaAutenticado).toBe(true);
    });

    act(() => {
      notificarSessaoExpirada();
    });

    await waitFor(() => {
      expect(result.current.estaAutenticado).toBe(false);
    });
  });

  it('atualizarUsuario() mescla campos alterados na pagina de configuracoes (issue #21) sem sobrescrever o resto', async () => {
    vi.mocked(renovarSessaoServico.renovarSessao).mockResolvedValue({
      accessToken: 'token-1',
      expiraEm: 900,
    });
    vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(PERFIL_FAKE);

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });
    await waitFor(() => {
      expect(result.current.estaAutenticado).toBe(true);
    });

    act(() => {
      result.current.atualizarUsuario({ fotoUrl: 'https://exemplo.com/nova.webp' });
    });

    expect(result.current.usuario?.perfil.fotoUrl).toBe('https://exemplo.com/nova.webp');
    expect(result.current.usuario?.nome).toBe('Samuel De Marco');
    expect(result.current.usuario?.perfil.moedaPadrao).toBe('BRL');
  });

  it('atualizarUsuario() nao faz nada quando ainda nao ha usuario (evita criar sessao "fantasma")', () => {
    vi.mocked(renovarSessaoServico.renovarSessao).mockRejectedValue(new Error('sem cookie'));

    const { result } = renderHook(() => useSessao(), { wrapper: Wrapper });

    act(() => {
      result.current.atualizarUsuario({ fotoUrl: 'https://exemplo.com/nova.webp' });
    });

    expect(result.current.usuario).toBeNull();
  });

  it('lanca erro quando useSessao e usado fora de <ProvedorAutenticacao>', () => {
    expect(() => renderHook(() => useSessao())).toThrow(
      'useSessao deve ser usado dentro de <ProvedorAutenticacao>.',
    );
  });
});
