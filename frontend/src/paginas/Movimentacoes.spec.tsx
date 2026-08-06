import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as categoriaServico from '@/funcionalidades/categorias/servicos/categoria.servico';
import * as contaServico from '@/funcionalidades/contas/servicos/conta.servico';
import * as etiquetaServico from '@/funcionalidades/etiquetas/servicos/etiqueta.servico';
import * as movimentacaoServico from '@/funcionalidades/movimentacoes/servicos/movimentacao.servico';
import type { Movimentacao } from '@/funcionalidades/movimentacoes/tipos/movimentacao';
import * as perfilServico from '@/funcionalidades/perfil/servicos/perfil.servico';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { Movimentacoes } from './Movimentacoes';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/movimentacoes/servicos/movimentacao.servico');
vi.mock('@/funcionalidades/contas/servicos/conta.servico');
vi.mock('@/funcionalidades/categorias/servicos/categoria.servico');
vi.mock('@/funcionalidades/etiquetas/servicos/etiqueta.servico');
vi.mock('@/funcionalidades/perfil/servicos/perfil.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={['/movimentacoes']}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function fabricarPerfil(): PerfilCompleto {
  return {
    id: 'usuario-1',
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    emailVerificado: true,
    fotoUrl: null,
    moedaPadrao: 'BRL',
    idioma: 'pt-BR',
    tema: 'SISTEMA',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
    criadoEm: '2026-01-01T00:00:00.000Z',
  };
}

function fabricarMovimentacao(sobrescritas: Partial<Movimentacao> = {}): Movimentacao {
  return {
    id: 'mov-1',
    tipo: 'DESPESA',
    descricao: 'Mercado',
    observacao: null,
    valor: '150.00',
    valorPago: '0.00',
    situacao: 'PENDENTE',
    dataCompetencia: '2026-08-05',
    dataVencimento: '2026-08-05',
    dataEfetivacao: null,
    conta: { id: 'conta-1', nome: 'Banco Principal', cor: '#2563EB', icone: 'wallet' },
    contaCompartilhada: null,
    categoria: {
      id: 'cat-1',
      nome: 'Mercado',
      cor: '#F97316',
      icone: 'shopping-cart',
      categoriaPaiId: null,
    },
    cartao: null,
    fatura: null,
    etiquetas: [],
    autor: { id: 'usuario-1', nome: 'Samuel De Marco', fotoUrl: null },
    transferencia: null,
    recorrencia: null,
    parcelamento: null,
    quantidadeAnexos: 0,
    criadoEm: '2026-08-05T10:00:00.000Z',
    atualizadoEm: '2026-08-05T10:00:00.000Z',
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(perfilServico.consultarPerfil).mockResolvedValue(fabricarPerfil());
  vi.mocked(contaServico.listarContas).mockResolvedValue({
    contas: [],
    totalizadores: { saldoTotal: '0.00', quantidadeContas: 0 },
  });
  vi.mocked(categoriaServico.listarCategorias).mockResolvedValue([]);
  vi.mocked(etiquetaServico.listarEtiquetas).mockResolvedValue([]);
});

describe('Movimentacoes', () => {
  it('mostra o estado de carregando enquanto a requisição está em andamento', () => {
    vi.mocked(movimentacaoServico.listarMovimentacoes).mockReturnValue(
      new Promise(() => undefined),
    );

    render(<Movimentacoes />, { wrapper: Wrapper });

    expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('mostra o estado de erro com ação de tentar novamente', async () => {
    vi.mocked(movimentacaoServico.listarMovimentacoes).mockRejectedValue(new Error('falhou'));

    render(<Movimentacoes />, { wrapper: Wrapper });

    expect(await screen.findByText('Não foi possível carregar suas movimentações.')).toBeTruthy();
  });

  it('distingue "nenhuma movimentação" (sem filtro) de "nenhum resultado" (com filtro)', async () => {
    vi.mocked(movimentacaoServico.listarMovimentacoes).mockResolvedValue({
      movimentacoes: [],
      paginacao: {
        pagina: 1,
        limite: 20,
        total: 0,
        totalPaginas: 1,
        temProxima: false,
        temAnterior: false,
      },
      totalizadores: {
        receitas: '0.00',
        despesas: '0.00',
        resultado: '0.00',
        receitasPendentes: '0.00',
        despesasPendentes: '0.00',
      },
    });

    render(<Movimentacoes />, { wrapper: Wrapper });

    expect(await screen.findByText('Nenhuma movimentação ainda')).toBeTruthy();
  });

  it('mostra totalizadores e a lista quando há dados', async () => {
    vi.mocked(movimentacaoServico.listarMovimentacoes).mockResolvedValue({
      movimentacoes: [fabricarMovimentacao()],
      paginacao: {
        pagina: 1,
        limite: 20,
        total: 1,
        totalPaginas: 1,
        temProxima: false,
        temAnterior: false,
      },
      totalizadores: {
        receitas: '0.00',
        despesas: '150.00',
        resultado: '-150.00',
        receitasPendentes: '0.00',
        despesasPendentes: '150.00',
      },
    });

    render(<Movimentacoes />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getAllByText('Mercado').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Receitas')).toBeTruthy();
    expect(screen.getByText('Despesas')).toBeTruthy();
  });
});
