import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroApi } from '@/servicos/erro-api';
import { DialogoConvite } from './DialogoConvite';
import * as conviteServico from '../servicos/convite.servico';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/convite.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function renderizar(aoFechar = vi.fn()): { aoFechar: ReturnType<typeof vi.fn> } {
  render(<DialogoConvite grupoId="grupo-1" nomeGrupo="Casa" aberto aoFechar={aoFechar} />, {
    wrapper: Wrapper,
  });
  return { aoFechar };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DialogoConvite', () => {
  it('explica cada papel convidável e não oferece administrador (RN-28)', () => {
    renderizar();

    const papel = screen.getByLabelText('Papel no grupo');
    const opcoes = Array.from(papel.querySelectorAll('option')).map((opcao) => opcao.value);
    expect(opcoes).toEqual(['PARTICIPANTE', 'OBSERVADOR']);

    expect(screen.getByText(/Registra movimentações e contas do grupo/)).toBeTruthy();
    expect(screen.getByText(/Apenas visualiza/)).toBeTruthy();
  });

  it('envia e-mail, papel e mensagem e fecha ao concluir', async () => {
    const usuario = userEvent.setup();
    vi.mocked(conviteServico.enviarConvite).mockResolvedValue({
      id: 'conv-1',
      email: 'ana@exemplo.com',
      papel: 'OBSERVADOR',
      situacao: 'PENDENTE',
      expiraEm: '2099-01-01T12:00:00.000Z',
      usuarioJaCadastrado: true,
    });
    const { aoFechar } = renderizar();

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.selectOptions(screen.getByLabelText('Papel no grupo'), 'OBSERVADOR');
    await usuario.type(screen.getByLabelText(/Mensagem/), 'Vem!');
    await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() => {
      expect(vi.mocked(conviteServico.enviarConvite)).toHaveBeenCalledWith('grupo-1', {
        email: 'ana@exemplo.com',
        papel: 'OBSERVADOR',
        mensagem: 'Vem!',
      });
    });
    expect(aoFechar).toHaveBeenCalled();
  });

  it('mensagem vazia vai como undefined, nao como string vazia', async () => {
    const usuario = userEvent.setup();
    vi.mocked(conviteServico.enviarConvite).mockResolvedValue({
      id: 'conv-1',
      email: 'ana@exemplo.com',
      papel: 'PARTICIPANTE',
      situacao: 'PENDENTE',
      expiraEm: '2099-01-01T12:00:00.000Z',
      usuarioJaCadastrado: true,
    });
    renderizar();

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

    await waitFor(() => {
      expect(vi.mocked(conviteServico.enviarConvite)).toHaveBeenCalledWith('grupo-1', {
        email: 'ana@exemplo.com',
        papel: 'PARTICIPANTE',
        mensagem: undefined,
      });
    });
  });

  it('valida o e-mail antes de chamar a API', async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.type(screen.getByLabelText('E-mail'), 'nao-e-email');
    await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

    expect(await screen.findByText('E-mail invalido.')).toBeTruthy();
    expect(vi.mocked(conviteServico.enviarConvite)).not.toHaveBeenCalled();
  });

  it('409 CONVITE_DUPLICADO aponta o cancelamento, sem erro genérico (RN-36)', async () => {
    const usuario = userEvent.setup();
    vi.mocked(conviteServico.enviarConvite).mockRejectedValue(
      new ErroApi('Ja existe convite pendente.', 'CONVITE_DUPLICADO', 409),
    );
    const { aoFechar } = renderizar();

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Cancele o convite anterior');
    // O diálogo fica aberto: o usuário precisa poder corrigir o e-mail.
    expect(aoFechar).not.toHaveBeenCalled();
  });

  it('409 JA_E_MEMBRO manda alterar o papel do membro (RN-38)', async () => {
    const usuario = userEvent.setup();
    vi.mocked(conviteServico.enviarConvite).mockRejectedValue(
      new ErroApi('Ja e membro.', 'JA_E_MEMBRO', 409),
    );
    renderizar();

    await usuario.type(screen.getByLabelText('E-mail'), 'ana@exemplo.com');
    await usuario.click(screen.getByRole('button', { name: 'Enviar convite' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('já faz parte do grupo');
  });
});
