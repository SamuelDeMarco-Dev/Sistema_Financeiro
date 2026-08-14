import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ListaConvitesEnviados } from './ListaConvitesEnviados';
import * as conviteServico from '../servicos/convite.servico';
import type { ConviteDoGrupo } from '../tipos/convite';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/convite.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function fabricarConvite(sobrescritas: Partial<ConviteDoGrupo> = {}): ConviteDoGrupo {
  return {
    id: 'conv-1',
    email: 'ana@exemplo.com',
    papel: 'PARTICIPANTE',
    situacao: 'PENDENTE',
    mensagem: null,
    // Data no futuro distante: o rótulo de validade sai da data real, e uma
    // data fixa no passado deixaria o teste dependente do calendário.
    expiraEm: '2099-01-01T12:00:00.000Z',
    criadoEm: '2026-08-01T12:00:00.000Z',
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ListaConvitesEnviados', () => {
  it('nao consulta nada sem permissao de administrar', () => {
    render(<ListaConvitesEnviados grupoId="grupo-1" podeAdministrar={false} />, {
      wrapper: Wrapper,
    });

    expect(vi.mocked(conviteServico.listarConvitesDoGrupo)).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Convites enviados')).toBeNull();
  });

  it('lista o e-mail, o papel e a validade de cada convite pendente (RN-35)', async () => {
    vi.mocked(conviteServico.listarConvitesDoGrupo).mockResolvedValue([fabricarConvite()]);

    render(<ListaConvitesEnviados grupoId="grupo-1" podeAdministrar />, { wrapper: Wrapper });

    expect(await screen.findByText('ana@exemplo.com')).toBeTruthy();
    expect(screen.getByText('Participante')).toBeTruthy();
    expect(screen.getByText(/Expira em/)).toBeTruthy();
    expect(screen.getByText('1 convite aguardando resposta')).toBeTruthy();
  });

  it('marca o convite vencido e orienta o reenvio', async () => {
    vi.mocked(conviteServico.listarConvitesDoGrupo).mockResolvedValue([
      fabricarConvite({ expiraEm: '2020-01-01T12:00:00.000Z' }),
    ]);

    render(<ListaConvitesEnviados grupoId="grupo-1" podeAdministrar />, { wrapper: Wrapper });

    expect(await screen.findByText('Expirado')).toBeTruthy();
    expect(screen.getByText(/envie um novo convite/)).toBeTruthy();
  });

  it('esconde convites que nao estao pendentes', async () => {
    vi.mocked(conviteServico.listarConvitesDoGrupo).mockResolvedValue([
      fabricarConvite({ situacao: 'ACEITO' }),
      fabricarConvite({ id: 'conv-2', situacao: 'CANCELADO', email: 'x@exemplo.com' }),
    ]);

    render(<ListaConvitesEnviados grupoId="grupo-1" podeAdministrar />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(vi.mocked(conviteServico.listarConvitesDoGrupo)).toHaveBeenCalled();
    });
    expect(screen.queryByLabelText('Convites enviados')).toBeNull();
  });

  it('cancelar pede confirmacao e chama o DELETE do convite', async () => {
    const usuario = userEvent.setup();
    vi.mocked(conviteServico.listarConvitesDoGrupo).mockResolvedValue([fabricarConvite()]);
    vi.mocked(conviteServico.cancelarConvite).mockResolvedValue(undefined);

    render(<ListaConvitesEnviados grupoId="grupo-1" podeAdministrar />, { wrapper: Wrapper });
    await usuario.click(await screen.findByRole('button', { name: 'Cancelar convite' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/ana@exemplo.com/)).toBeTruthy();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Cancelar convite' }));

    await waitFor(() => {
      expect(vi.mocked(conviteServico.cancelarConvite)).toHaveBeenCalledWith(
        'conv-1',
        expect.anything(),
      );
    });
  });
});
