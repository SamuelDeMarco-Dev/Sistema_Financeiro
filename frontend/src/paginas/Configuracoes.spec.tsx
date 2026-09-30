import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { ProvedorTema } from '@/contextos/ContextoTema';
import * as autenticacaoServico from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { Configuracoes } from './Configuracoes';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');
vi.mock('@/funcionalidades/autenticacao/servicos/autenticacao.servico');
vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: null,
    estaAutenticado: false,
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });
  // AbaPreferencias usa ContextoTema, que chama matchMedia no mount.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

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

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <ProvedorTema>
      <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
    </ProvedorTema>
  );
}

function renderizar(): void {
  render(<Configuracoes />, { wrapper: Wrapper });
}

describe('Configuracoes', () => {
  it('mostra carregando e depois a aba Perfil por padrao', async () => {
    vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(PERFIL_FAKE);
    renderizar();

    expect(screen.getByText('Carregando configurações...')).toBeTruthy();
    expect(await screen.findByLabelText('Nome')).toBeTruthy();
  });

  it('mostra estado de erro com acao de tentar novamente', async () => {
    vi.mocked(perfilServico.consultarPerfil).mockRejectedValue(
      Object.assign(new Error('falhou'), { codigo: 'ERRO_REDE' }),
    );
    renderizar();

    expect(await screen.findByText('Não foi possível carregar suas configurações.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeTruthy();
  });

  it('as tres abas tem os atributos ARIA corretos e trocam de painel ao clicar', async () => {
    vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(PERFIL_FAKE);
    vi.mocked(autenticacaoServico.listarSessoes).mockResolvedValue([]);
    renderizar();

    await screen.findByLabelText('Nome');

    const abaPerfil = screen.getByRole('tab', { name: 'Perfil' });
    const abaPreferencias = screen.getByRole('tab', { name: 'Preferências' });
    const abaSeguranca = screen.getByRole('tab', { name: 'Segurança' });

    expect(abaPerfil.getAttribute('aria-selected')).toBe('true');
    expect(abaPreferencias.getAttribute('aria-selected')).toBe('false');

    fireEvent.click(abaPreferencias);
    expect(abaPreferencias.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByLabelText('Tema')).toBeTruthy();

    fireEvent.click(abaSeguranca);
    expect(abaSeguranca.getAttribute('aria-selected')).toBe('true');
    // "Alterar senha" aparece duas vezes (titulo da secao e o botao) —
    // getByRole('heading') desambigua.
    expect(await screen.findByRole('heading', { name: 'Alterar senha' })).toBeTruthy();
  });

  it('seta direita move a selecao para a proxima aba (navegacao por teclado, A11Y-02)', async () => {
    vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(PERFIL_FAKE);
    renderizar();

    await screen.findByLabelText('Nome');
    const abaPerfil = screen.getByRole('tab', { name: 'Perfil' });
    const abaPreferencias = screen.getByRole('tab', { name: 'Preferências' });
    const tablist = abaPerfil.parentElement;
    if (!tablist) throw new Error('tablist nao encontrada');

    fireEvent.keyDown(tablist, { key: 'ArrowRight' });

    await waitFor(() => {
      expect(abaPreferencias.getAttribute('aria-selected')).toBe('true');
    });
  });
});
