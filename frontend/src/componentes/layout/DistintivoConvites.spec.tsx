import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as conviteServico from '@/funcionalidades/compartilhadas/servicos/convite.servico';
import type { ConviteRecebido } from '@/funcionalidades/compartilhadas/tipos/convite';
import { DistintivoConvites } from './DistintivoConvites';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/compartilhadas/servicos/convite.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function fabricarConvite(sobrescritas: Partial<ConviteRecebido> = {}): ConviteRecebido {
  return {
    id: 'conv-1',
    papel: 'PARTICIPANTE',
    situacao: 'PENDENTE',
    mensagem: null,
    expiraEm: '2099-01-01T12:00:00.000Z',
    contaCompartilhada: { id: 'grupo-1', nome: 'Casa', imagemUrl: null, quantidadeMembros: 2 },
    enviadoPor: { id: 'usuario-2', nome: 'Ana Souza' },
    criadoEm: '2026-07-29T12:00:00.000Z',
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DistintivoConvites', () => {
  it('nao renderiza nada sem convite pendente', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([]);

    const { container } = render(<DistintivoConvites />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(vi.mocked(conviteServico.listarConvitesRecebidos)).toHaveBeenCalled();
    });
    expect(container.textContent).toBe('');
  });

  it('mostra a contagem com rotulo acessivel no singular', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([fabricarConvite()]);

    render(<DistintivoConvites />, { wrapper: Wrapper });

    expect(await screen.findByLabelText('1 convite pendente')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
  });

  it('mostra a contagem com rotulo acessivel no plural', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([
      fabricarConvite(),
      fabricarConvite({ id: 'conv-2' }),
    ]);

    render(<DistintivoConvites />, { wrapper: Wrapper });

    expect(await screen.findByLabelText('2 convites pendentes')).toBeTruthy();
  });

  it('nao conta convite que ja foi respondido', async () => {
    vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([
      fabricarConvite(),
      fabricarConvite({ id: 'conv-2', situacao: 'RECUSADO' }),
      fabricarConvite({ id: 'conv-3', situacao: 'EXPIRADO' }),
    ]);

    render(<DistintivoConvites />, { wrapper: Wrapper });

    expect(await screen.findByLabelText('1 convite pendente')).toBeTruthy();
  });
});
