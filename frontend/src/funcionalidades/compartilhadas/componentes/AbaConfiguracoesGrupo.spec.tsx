import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbaConfiguracoesGrupo } from './AbaConfiguracoesGrupo';
import * as contaCompartilhadaServico from '../servicos/conta-compartilhada.servico';
import type { ContaCompartilhadaDetalhe, PermissoesGrupo } from '../tipos/conta-compartilhada';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/conta-compartilhada.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={cliente}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
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
  permissoes: PermissoesGrupo = PERMISSOES_ADMINISTRADOR,
): ContaCompartilhadaDetalhe {
  return {
    id: 'grupo-1',
    nome: 'Casa',
    descricao: 'Despesas da casa',
    imagemUrl: null,
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    meuPapel: 'ADMINISTRADOR',
    minhasPermissoes: permissoes,
    saldoTotal: '0.00',
    membros: [
      {
        id: 'mem-1',
        papel: 'ADMINISTRADOR',
        situacao: 'ATIVO',
        entrouEm: '2026-06-15T12:00:00.000Z',
        usuario: { id: 'u1', nome: 'Samuel', email: 'samuel@exemplo.com', fotoUrl: null },
      },
      {
        id: 'mem-2',
        papel: 'PARTICIPANTE',
        situacao: 'ATIVO',
        entrouEm: '2026-06-16T12:00:00.000Z',
        usuario: { id: 'u2', nome: 'Ana', email: 'ana@exemplo.com', fotoUrl: null },
      },
    ],
    contas: [],
    criadoEm: '2026-06-15T12:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AbaConfiguracoesGrupo', () => {
  it('sem podeEditar, nao mostra nem o formulario nem a exclusao', () => {
    render(
      <AbaConfiguracoesGrupo
        grupo={fabricarGrupo({ ...PERMISSOES_ADMINISTRADOR, podeEditar: false })}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.queryByLabelText('Nome')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Excluir grupo' })).toBeNull();
    expect(screen.getByText(/Somente o administrador acessa as configurações/)).toBeTruthy();
  });

  it('carrega os valores atuais do grupo no formulario', () => {
    render(<AbaConfiguracoesGrupo grupo={fabricarGrupo()} />, { wrapper: Wrapper });

    expect(screen.getByLabelText('Nome')).toHaveProperty('value', 'Casa');
    expect(screen.getByLabelText('Descrição (opcional)')).toHaveProperty(
      'value',
      'Despesas da casa',
    );
    // A moeda aparece como leitura: a rota de PATCH nao a aceita (§16.4).
    expect(screen.getByText('BRL')).toBeTruthy();
    expect(screen.queryByLabelText('Moeda')).toBeNull();
  });

  it('salvar envia so os campos editaveis', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.atualizarContaCompartilhada).mockResolvedValue(
      fabricarGrupo(),
    );

    render(<AbaConfiguracoesGrupo grupo={fabricarGrupo()} />, { wrapper: Wrapper });

    const nome = screen.getByLabelText('Nome');
    await usuario.clear(nome);
    await usuario.type(nome, 'Casa Nova');
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.atualizarContaCompartilhada)).toHaveBeenCalledWith(
        'grupo-1',
        {
          nome: 'Casa Nova',
          descricao: 'Despesas da casa',
          cor: '#2563EB',
          permiteParticipanteEditarProprias: true,
        },
      );
    });
  });

  it('descricao apagada vai como null, para o PATCH limpar o campo', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.atualizarContaCompartilhada).mockResolvedValue(
      fabricarGrupo(),
    );

    render(<AbaConfiguracoesGrupo grupo={fabricarGrupo()} />, { wrapper: Wrapper });

    await usuario.clear(screen.getByLabelText('Descrição (opcional)'));
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.atualizarContaCompartilhada)).toHaveBeenCalledWith(
        'grupo-1',
        expect.objectContaining({ descricao: null }),
      );
    });
  });

  it('salvar fica bloqueado enquanto nada mudou', () => {
    render(<AbaConfiguracoesGrupo grupo={fabricarGrupo()} />, { wrapper: Wrapper });

    expect(screen.getByRole('button', { name: 'Salvar alterações' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('excluir exige o nome exato do grupo digitado (RN-33)', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.excluirContaCompartilhada).mockResolvedValue(undefined);

    render(<AbaConfiguracoesGrupo grupo={fabricarGrupo()} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Excluir grupo' }));

    const dialogo = screen.getByRole('dialog');
    // O aviso conta quantos membros perdem o acesso — excluir nao afeta so
    // quem clicou.
    expect(within(dialogo).getByText(/todos os 2 membros/)).toBeTruthy();

    const confirmar = within(dialogo).getByRole('button', { name: 'Excluir grupo' });
    expect(confirmar.hasAttribute('disabled')).toBe(true);

    await usuario.type(within(dialogo).getByLabelText(/Digite/), 'Casa');
    await usuario.click(confirmar);

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.excluirContaCompartilhada)).toHaveBeenCalledWith(
        'grupo-1',
        'Casa',
      );
    });
  });
});
