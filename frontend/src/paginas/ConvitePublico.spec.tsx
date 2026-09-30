import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import * as conviteServico from '@/funcionalidades/compartilhadas/servicos/convite.servico';
import type { ConvitePrevia } from '@/funcionalidades/compartilhadas/tipos/convite';
import { ConvitePublico } from './ConvitePublico';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/compartilhadas/servicos/convite.servico');
vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/convites/tok-abc']}>
        <Routes>
          <Route path="/convites/:token" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function fabricarPrevia(sobrescritas: Partial<ConvitePrevia> = {}): ConvitePrevia {
  return {
    situacao: 'PENDENTE',
    papel: 'PARTICIPANTE',
    expiraEm: '2099-01-01T12:00:00.000Z',
    contaCompartilhada: { nome: 'Casa' },
    enviadoPor: { nome: 'Samuel De Marco' },
    emailConvidado: 'an***@exemplo.com',
    requerCadastro: false,
    ...sobrescritas,
  };
}

function definirSessao(estaAutenticado: boolean): void {
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: estaAutenticado
      ? {
          id: 'usuario-1',
          nome: 'Ana Souza',
          email: 'ana@exemplo.com',
          perfil: {
            fotoUrl: null,
            moedaPadrao: 'BRL',
            idioma: 'pt-BR',
            tema: 'CLARO',
            timezone: 'America/Sao_Paulo',
          },
        }
      : null,
    estaAutenticado,
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  definirSessao(false);
});

describe('ConvitePublico', () => {
  it('busca a previa pelo token da URL', async () => {
    vi.mocked(conviteServico.buscarPreviaConvite).mockResolvedValue(fabricarPrevia());

    render(<ConvitePublico />, { wrapper: Wrapper });

    expect(await screen.findByText('Casa')).toBeTruthy();
    expect(vi.mocked(conviteServico.buscarPreviaConvite)).toHaveBeenCalledWith('tok-abc');
  });

  it('mostra grupo, quem convidou, papel e validade — e nenhum dado financeiro', async () => {
    vi.mocked(conviteServico.buscarPreviaConvite).mockResolvedValue(fabricarPrevia());

    render(<ConvitePublico />, { wrapper: Wrapper });

    expect(await screen.findByRole('heading', { name: 'Casa' })).toBeTruthy();
    expect(screen.getByText(/Samuel De Marco/)).toBeTruthy();
    expect(screen.getByText('Participante')).toBeTruthy();
    expect(screen.getByText(/Expira em/)).toBeTruthy();
    // A rota publica nao devolve saldo nem membros (§17.3); a pagina nao
    // pode inventar nem um rotulo que sugira isso.
    expect(document.body.textContent).not.toMatch(/saldo|R\$|membros/i);
  });

  it('mostra o e-mail mascarado como veio do servidor, sem completar nada', async () => {
    vi.mocked(conviteServico.buscarPreviaConvite).mockResolvedValue(fabricarPrevia());

    render(<ConvitePublico />, { wrapper: Wrapper });

    expect(await screen.findByText('an***@exemplo.com')).toBeTruthy();
  });

  it('sem cadastro, encaminha para criar conta (RN-37)', async () => {
    vi.mocked(conviteServico.buscarPreviaConvite).mockResolvedValue(
      fabricarPrevia({ requerCadastro: true }),
    );

    render(<ConvitePublico />, { wrapper: Wrapper });

    const link = await screen.findByRole('link', { name: 'Criar minha conta' });
    expect(link.getAttribute('href')).toBe('/cadastrar');
  });

  it('com cadastro e sem sessao, encaminha para entrar', async () => {
    vi.mocked(conviteServico.buscarPreviaConvite).mockResolvedValue(fabricarPrevia());

    render(<ConvitePublico />, { wrapper: Wrapper });

    const link = await screen.findByRole('link', { name: 'Entrar para aceitar' });
    expect(link.getAttribute('href')).toBe('/entrar');
  });

  it('com sessao aberta, manda direto para Compartilhadas', async () => {
    definirSessao(true);
    vi.mocked(conviteServico.buscarPreviaConvite).mockResolvedValue(fabricarPrevia());

    render(<ConvitePublico />, { wrapper: Wrapper });

    const link = await screen.findByRole('link', { name: 'Ver meus convites' });
    expect(link.getAttribute('href')).toBe('/compartilhadas');
  });

  it('convite ja respondido nao oferece caminho de aceite', async () => {
    vi.mocked(conviteServico.buscarPreviaConvite).mockResolvedValue(
      fabricarPrevia({ situacao: 'CANCELADO' }),
    );

    render(<ConvitePublico />, { wrapper: Wrapper });

    expect(await screen.findByText(/cancelado e não pode mais ser aceito/)).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Entrar para aceitar' })).toBeNull();
  });

  it('token invalido ou expirado nao distingue os casos', async () => {
    vi.mocked(conviteServico.buscarPreviaConvite).mockRejectedValue(new Error('404'));

    render(<ConvitePublico />, { wrapper: Wrapper });

    expect(await screen.findByText('Convite indisponível')).toBeTruthy();
    expect(screen.getByText(/não é mais válido/)).toBeTruthy();
    // Nada de nome de grupo ou de quem convidou num token que nao resolve.
    expect(screen.queryByText('Casa')).toBeNull();
  });
});
