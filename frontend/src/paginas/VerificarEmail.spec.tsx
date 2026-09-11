import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as autenticacaoServico from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import { VerificarEmail } from './VerificarEmail';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/autenticacao/servicos/autenticacao.servico');

beforeEach(() => {
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function renderizarComToken(token: string | null, estrito = false): void {
  const busca = token ? `?token=${token}` : '';
  const conteudo = (
    <Wrapper>
      <MemoryRouter initialEntries={[`/verificar-email${busca}`]}>
        <VerificarEmail />
      </MemoryRouter>
    </Wrapper>
  );

  render(estrito ? <StrictMode>{conteudo}</StrictMode> : conteudo);
}

describe('VerificarEmail', () => {
  it('sem token na URL, mostra link invalido e o formulario de reenvio', () => {
    renderizarComToken(null);

    expect(screen.getByText('Link inválido')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(autenticacaoServico.verificarEmail).not.toHaveBeenCalled();
  });

  it('com token valido, verifica e mostra sucesso com link para /entrar', async () => {
    vi.mocked(autenticacaoServico.verificarEmail).mockResolvedValue(undefined);
    renderizarComToken('token-valido');

    expect(await screen.findByText('E-mail verificado!')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toBeTruthy();
    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui.
    expect(vi.mocked(autenticacaoServico.verificarEmail).mock.calls[0]?.[0]).toBe('token-valido');
  });

  it('com token invalido/expirado, mostra erro e o formulario de reenvio', async () => {
    vi.mocked(autenticacaoServico.verificarEmail).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'VALIDACAO',
      message: 'Token invalido.',
    });
    renderizarComToken('token-expirado');

    expect(await screen.findByText('Link expirado ou inválido')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
  });

  it('so chama verificarEmail uma vez mesmo com re-renders (nao reenvia a cada render)', async () => {
    vi.mocked(autenticacaoServico.verificarEmail).mockResolvedValue(undefined);
    renderizarComToken('token-valido');

    await screen.findByText('E-mail verificado!');
    expect(autenticacaoServico.verificarEmail).toHaveBeenCalledTimes(1);
  });

  // O StrictMode invoca o efeito duas vezes e, no meio, simula um desmonte.
  // Com o resultado vindo de um observador de mutation, a resolucao que
  // chegava nessa janela se perdia e a tela ficava presa em "Verificando seu
  // e-mail..." — com a API tendo respondido 200. E o modo em que o projeto
  // roda em desenvolvimento, entao o defeito aparecia em toda validacao
  // local.
  it('sob StrictMode, ainda mostra o sucesso e chama a API uma unica vez', async () => {
    vi.mocked(autenticacaoServico.verificarEmail).mockResolvedValue(undefined);
    renderizarComToken('token-valido', true);

    expect(await screen.findByText('E-mail verificado!')).toBeTruthy();
    expect(autenticacaoServico.verificarEmail).toHaveBeenCalledTimes(1);
  });

  it('sob StrictMode, token invalido mostra o erro (nao fica preso carregando)', async () => {
    vi.mocked(autenticacaoServico.verificarEmail).mockRejectedValue({
      name: 'ErroApi',
      codigo: 'VALIDACAO',
      message: 'Token invalido.',
    });
    renderizarComToken('token-expirado', true);

    expect(await screen.findByText('Link expirado ou inválido')).toBeTruthy();
    expect(autenticacaoServico.verificarEmail).toHaveBeenCalledTimes(1);
  });

  it('formulario de reenvio (sem token) envia e confirma', async () => {
    vi.mocked(autenticacaoServico.reenviarVerificacao).mockResolvedValue(undefined);
    renderizarComToken(null);

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'samuel@exemplo.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar novo link' }));

    // React Query v5 chama mutationFn com (variaveis, contexto) — so as
    // variaveis importam aqui.
    await waitFor(() => {
      expect(vi.mocked(autenticacaoServico.reenviarVerificacao).mock.calls[0]?.[0]).toBe(
        'samuel@exemplo.com',
      );
    });
    expect(await screen.findByText(/novo link foi enviado/)).toBeTruthy();
  });
});
