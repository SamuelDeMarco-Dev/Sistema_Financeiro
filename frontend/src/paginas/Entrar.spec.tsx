import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import type { CredenciaisLogin } from '@/servicos/autenticacao.servico';
import { Entrar } from './Entrar';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

type EntrarMock = (credenciais: CredenciaisLogin) => Promise<void>;

function mockarEntrar(entrarFake: EntrarMock): void {
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: null,
    estaAutenticado: false,
    carregando: false,
    entrar: entrarFake,
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });
}

function renderizarEmRota(caminhoInicial: string, estado?: unknown): void {
  render(
    <Wrapper>
      <MemoryRouter initialEntries={[{ pathname: caminhoInicial, state: estado }]}>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/" element={<div>Pagina inicial</div>} />
          <Route path="/movimentacoes" element={<div>Movimentacoes</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

describe('Entrar', () => {
  it('apos login bem-sucedido sem destino salvo, vai para a pagina inicial', async () => {
    mockarEntrar(vi.fn<EntrarMock>().mockResolvedValue(undefined));
    renderizarEmRota('/entrar');

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Pagina inicial')).toBeTruthy();
  });

  it('apos login bem-sucedido, volta ao destino original preservado por RotaProtegida', async () => {
    mockarEntrar(vi.fn<EntrarMock>().mockResolvedValue(undefined));
    renderizarEmRota('/entrar', { de: { pathname: '/movimentacoes', search: '' } });

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Movimentacoes')).toBeTruthy();
  });

  it('EMAIL_NAO_VERIFICADO troca para a tela dedicada e "Voltar" retorna ao formulario', async () => {
    const entrarFake = vi.fn<EntrarMock>().mockRejectedValue({
      name: 'ErroApi',
      codigo: 'EMAIL_NAO_VERIFICADO',
      message: 'Confirme seu e-mail antes de entrar.',
    });
    mockarEntrar(entrarFake);
    renderizarEmRota('/entrar');

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'nao-verificado@exemplo.com' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(screen.getByText('Confirme seu e-mail')).toBeTruthy();
    });
    expect(screen.getByText('nao-verificado@exemplo.com')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
  });

  it('tem link para a pagina de cadastro', () => {
    mockarEntrar(vi.fn<EntrarMock>());
    renderizarEmRota('/entrar');

    expect(screen.getByRole('link', { name: 'Criar conta' })).toBeTruthy();
  });
});
