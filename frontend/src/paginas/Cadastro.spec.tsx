import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/servicos/autenticacao.servico';
import { Cadastro } from './Cadastro';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/servicos/autenticacao.servico');

beforeEach(() => {
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function renderizar(): void {
  render(
    <Wrapper>
      <MemoryRouter initialEntries={['/cadastrar']}>
        <Routes>
          <Route path="/cadastrar" element={<Cadastro />} />
          <Route path="/entrar" element={<div>Tela de login</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  );
}

describe('Cadastro', () => {
  it('apos cadastro bem-sucedido, mostra a tela de confirmacao com o e-mail usado', async () => {
    vi.mocked(autenticacaoServico.cadastrar).mockResolvedValue({
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: false,
      criadoEm: '2026-01-01T00:00:00.000Z',
    });
    renderizar();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Samuel De Marco' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'samuel@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'SenhaForte@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(screen.getByText('samuel@exemplo.com')).toBeTruthy();
    });
  });

  it('"Voltar" na tela de confirmacao leva para /entrar', async () => {
    vi.mocked(autenticacaoServico.cadastrar).mockResolvedValue({
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: false,
      criadoEm: '2026-01-01T00:00:00.000Z',
    });
    renderizar();

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Samuel De Marco' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'samuel@exemplo.com' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte@2026' } });
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'SenhaForte@2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Tela de login')).toBeTruthy();
  });

  it('tem link para a pagina de login', () => {
    renderizar();
    expect(screen.getByRole('link', { name: 'Entrar' })).toBeTruthy();
  });
});
