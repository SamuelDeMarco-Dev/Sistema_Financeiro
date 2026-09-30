import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as contaServico from '@/funcionalidades/contas/servicos/conta.servico';
import { AbaContasGrupo } from './AbaContasGrupo';
import type { ContaCompartilhadaDetalhe, PermissoesGrupo } from '../tipos/conta-compartilhada';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/contas/servicos/conta.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

const PERMISSOES_ADMINISTRADOR: PermissoesGrupo = {
  podeEditar: true,
  podeExcluir: true,
  podeConvidar: true,
  podeGerenciarMembros: true,
  podeGerenciarCategorias: true,
  podeCriarMovimentacao: true,
  podeEditarMovimentacaoPropria: true,
  podeEditarMovimentacaoDeTerceiro: true,
  podeExcluirMovimentacaoPropria: true,
  podeExcluirMovimentacaoDeTerceiro: true,
  podeVerAuditoria: true,
};

function fabricarGrupo(
  sobrescritas: Partial<ContaCompartilhadaDetalhe> = {},
): ContaCompartilhadaDetalhe {
  return {
    id: 'grupo-1',
    nome: 'Casa',
    descricao: null,
    imagemUrl: null,
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    meuPapel: 'ADMINISTRADOR',
    minhasPermissoes: PERMISSOES_ADMINISTRADOR,
    saldoTotal: '300.00',
    membros: [],
    contas: [
      {
        id: 'conta-g1',
        nome: 'Caixa da Casa',
        tipo: 'CARTEIRA',
        saldoAtual: '300.00',
        cor: '#2563EB',
        icone: 'wallet',
      },
    ],
    criadoEm: '2026-06-15T12:00:00.000Z',
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AbaContasGrupo', () => {
  it('mostra nome e saldo de cada conta do grupo', () => {
    render(<AbaContasGrupo grupo={fabricarGrupo()} />, { wrapper: Wrapper });

    expect(screen.getByText('Caixa da Casa')).toBeTruthy();
    expect(screen.getByText('R$ 300,00')).toBeTruthy();
  });

  it('sem podeEditar, nao oferece criar conta (a rota exige administrador)', () => {
    render(
      <AbaContasGrupo
        grupo={fabricarGrupo({
          minhasPermissoes: { ...PERMISSOES_ADMINISTRADOR, podeEditar: false },
        })}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByRole('button', { name: 'Nova conta do grupo' })).toBeNull();
  });

  it('grupo sem conta oferece a criação a partir do estado vazio', async () => {
    const usuario = userEvent.setup();
    render(<AbaContasGrupo grupo={fabricarGrupo({ contas: [] })} />, { wrapper: Wrapper });

    expect(screen.getByText('Nenhuma conta neste grupo')).toBeTruthy();
    await usuario.click(screen.getByRole('button', { name: 'Nova conta do grupo' }));

    expect(screen.getByRole('heading', { name: 'Nova conta do grupo' })).toBeTruthy();
  });

  it('criar conta pelo grupo envia o escopo do grupo', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaServico.criarConta).mockResolvedValue({
      id: 'conta-nova',
    } as Awaited<ReturnType<typeof contaServico.criarConta>>);

    render(<AbaContasGrupo grupo={fabricarGrupo()} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Nova conta do grupo' }));
    await usuario.type(screen.getByLabelText('Nome'), 'Reserva da Casa');
    await usuario.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => {
      expect(vi.mocked(contaServico.criarConta).mock.calls[0]?.[0]).toMatchObject({
        nome: 'Reserva da Casa',
        contaCompartilhadaId: 'grupo-1',
      });
    });
  });
});
