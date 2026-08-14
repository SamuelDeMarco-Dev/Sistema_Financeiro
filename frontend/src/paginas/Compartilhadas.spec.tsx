import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as contaCompartilhadaServico from '@/funcionalidades/compartilhadas/servicos/conta-compartilhada.servico';
import * as conviteServico from '@/funcionalidades/compartilhadas/servicos/convite.servico';
import type { ContaCompartilhadaListaItem } from '@/funcionalidades/compartilhadas/tipos/conta-compartilhada';
import { Compartilhadas } from './Compartilhadas';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/compartilhadas/servicos/conta-compartilhada.servico');
vi.mock('@/funcionalidades/compartilhadas/servicos/convite.servico');

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

function fabricarGrupo(
  sobrescritas: Partial<ContaCompartilhadaListaItem> = {},
): ContaCompartilhadaListaItem {
  return {
    id: 'grupo-1',
    nome: 'Casa',
    descricao: 'Despesas da casa',
    imagemUrl: null,
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    meuPapel: 'ADMINISTRADOR',
    saldoTotal: '1284.60',
    quantidadeMembros: 3,
    quantidadeContas: 1,
    resumoMesAtual: { receitas: '3200.00', despesas: '1915.40', resultado: '1284.60' },
    criadoEm: '2026-06-15T12:00:00.000Z',
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(conviteServico.listarConvitesRecebidos).mockResolvedValue([]);
});

describe('Compartilhadas', () => {
  it('lista os grupos do usuario', async () => {
    vi.mocked(contaCompartilhadaServico.listarContasCompartilhadas).mockResolvedValue([
      fabricarGrupo(),
      fabricarGrupo({ id: 'grupo-2', nome: 'Viagem Chile' }),
    ]);

    render(<Compartilhadas />, { wrapper: Wrapper });

    expect(await screen.findByRole('link', { name: 'Casa' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Viagem Chile' })).toBeTruthy();
  });

  it('estado vazio explica o recurso, nao so a ausencia de grupos', async () => {
    vi.mocked(contaCompartilhadaServico.listarContasCompartilhadas).mockResolvedValue([]);

    render(<Compartilhadas />, { wrapper: Wrapper });

    expect(await screen.findByText(/Organize dinheiro que não é só seu/)).toBeTruthy();
    expect(screen.getByText(/espaço financeiro compartilhado/)).toBeTruthy();
    expect(screen.getByText('Contas em conjunto')).toBeTruthy();
    expect(screen.getByText('Cada um com seu papel')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Criar meu primeiro grupo' })).toBeTruthy();
  });

  it('erro de carga oferece nova tentativa', async () => {
    vi.mocked(contaCompartilhadaServico.listarContasCompartilhadas).mockRejectedValue(
      new Error('falha'),
    );

    render(<Compartilhadas />, { wrapper: Wrapper });

    expect(await screen.findByText(/Não foi possível carregar seus grupos/)).toBeTruthy();
  });

  it('o estado vazio abre o formulario de criacao', async () => {
    vi.mocked(contaCompartilhadaServico.listarContasCompartilhadas).mockResolvedValue([]);

    render(<Compartilhadas />, { wrapper: Wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Criar meu primeiro grupo' }));

    expect(await screen.findByRole('heading', { name: 'Novo grupo' })).toBeTruthy();
  });

  it('criar um grupo envia o payload e redireciona para o detalhe', async () => {
    vi.mocked(contaCompartilhadaServico.listarContasCompartilhadas).mockResolvedValue([]);
    vi.mocked(contaCompartilhadaServico.criarContaCompartilhada).mockResolvedValue({
      id: 'grupo-novo',
      nome: 'Viagem',
      descricao: null,
      imagemUrl: null,
      moeda: 'BRL',
      cor: '#2563EB',
      permiteParticipanteEditarProprias: true,
      meuPapel: 'ADMINISTRADOR',
      minhasPermissoes: {
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
      },
      saldoTotal: '0.00',
      membros: [],
      contas: [],
      criadoEm: '2026-08-12T12:00:00.000Z',
    });

    render(<Compartilhadas />, { wrapper: Wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Novo grupo' }));

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Viagem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.criarContaCompartilhada)).toHaveBeenCalled();
    });
    const payload = vi.mocked(contaCompartilhadaServico.criarContaCompartilhada).mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      nome: 'Viagem',
      moeda: 'BRL',
      cor: '#2563EB',
      permiteParticipanteEditarProprias: true,
      criarCategoriasPadrao: true,
    });
  });

  it('nao envia imagem quando o usuario nao escolheu nenhuma', async () => {
    vi.mocked(contaCompartilhadaServico.listarContasCompartilhadas).mockResolvedValue([]);
    vi.mocked(contaCompartilhadaServico.criarContaCompartilhada).mockResolvedValue({
      id: 'grupo-novo',
    } as never);

    render(<Compartilhadas />, { wrapper: Wrapper });
    fireEvent.click(await screen.findByRole('button', { name: 'Novo grupo' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Viagem' } });
    fireEvent.click(screen.getByRole('button', { name: 'Criar grupo' }));

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.criarContaCompartilhada)).toHaveBeenCalled();
    });
    expect(vi.mocked(contaCompartilhadaServico.atualizarImagemGrupo)).not.toHaveBeenCalled();
  });
});
