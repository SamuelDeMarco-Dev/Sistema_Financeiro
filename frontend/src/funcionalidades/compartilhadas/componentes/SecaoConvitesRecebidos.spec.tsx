import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecaoConvitesRecebidos } from './SecaoConvitesRecebidos';
import * as conviteServico from '../servicos/convite.servico';
import type { ConviteRecebido } from '../tipos/convite';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/convite.servico');

beforeEach(() => {
  vi.clearAllMocks();
});

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function fabricarConvite(sobrescritas: Partial<ConviteRecebido> = {}): ConviteRecebido {
  return {
    id: 'conv-1',
    papel: 'PARTICIPANTE',
    situacao: 'PENDENTE',
    mensagem: 'Vem organizar as contas da casa!',
    // Bem no futuro: o rotulo de validade e' calculado com a data real, e
    // um convite fixo no passado tornaria o teste dependente do calendario.
    expiraEm: '2099-01-01T12:00:00.000Z',
    contaCompartilhada: { id: 'grupo-1', nome: 'Casa', imagemUrl: null, quantidadeMembros: 2 },
    enviadoPor: { id: 'usuario-2', nome: 'Ana Souza' },
    criadoEm: '2026-07-29T12:00:00.000Z',
    ...sobrescritas,
  };
}

describe('SecaoConvitesRecebidos', () => {
  it('nao renderiza nada quando nao ha convite pendente', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([]);

    render(<SecaoConvitesRecebidos />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(vi.mocked(conviteServico.listarConvitesRecebidos)).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText('Convites recebidos')).toBeNull();
  });

  it('mostra grupo, quem convidou, papel e validade do convite', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([fabricarConvite()]);

    render(<SecaoConvitesRecebidos />, { wrapper: Wrapper });

    expect(await screen.findByText('Casa')).toBeTruthy();
    expect(screen.getByText(/Ana Souza te convidou/)).toBeTruthy();
    expect(screen.getByText('Participante')).toBeTruthy();
    expect(screen.getByText(/Expira em/)).toBeTruthy();
    expect(screen.getByText('Você tem 1 convite')).toBeTruthy();
  });

  it('ignora convite que nao esta pendente', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([
      fabricarConvite({ id: 'conv-2', situacao: 'RECUSADO' }),
    ]);

    render(<SecaoConvitesRecebidos />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(vi.mocked(conviteServico.listarConvitesRecebidos)).toHaveBeenCalled();
    });
    expect(screen.queryByText('Casa')).toBeNull();
  });

  it('aceitar chama a API com o id do convite', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([fabricarConvite()]);
    vi.mocked(conviteServico.aceitarConvite).mockResolvedValue({
      id: 'mem-1',
      papel: 'PARTICIPANTE',
      situacao: 'ATIVO',
      contaCompartilhada: { id: 'grupo-1', nome: 'Casa' },
    });

    render(<SecaoConvitesRecebidos />, { wrapper: Wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Aceitar' }));

    await waitFor(() => {
      expect(vi.mocked(conviteServico.aceitarConvite)).toHaveBeenCalledWith(
        'conv-1',
        expect.anything(),
      );
    });
  });

  it('recusar chama a API com o id do convite', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([fabricarConvite()]);
    vi.mocked(conviteServico.recusarConvite).mockResolvedValue(undefined);

    render(<SecaoConvitesRecebidos />, { wrapper: Wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Recusar' }));

    await waitFor(() => {
      expect(vi.mocked(conviteServico.recusarConvite)).toHaveBeenCalledWith(
        'conv-1',
        expect.anything(),
      );
    });
  });

  it('pluraliza o titulo com mais de um convite', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([
      fabricarConvite(),
      fabricarConvite({ id: 'conv-2' }),
    ]);

    render(<SecaoConvitesRecebidos />, { wrapper: Wrapper });

    expect(await screen.findByText('Você tem 2 convites')).toBeTruthy();
  });
});
