import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import * as categoriaServico from '@/funcionalidades/categorias/servicos/categoria.servico';
import * as contaCompartilhadaServico from '@/funcionalidades/compartilhadas/servicos/conta-compartilhada.servico';
import type {
  ContaCompartilhadaDetalhe,
  PapelMembro,
  PermissoesGrupo,
} from '@/funcionalidades/compartilhadas/tipos/conta-compartilhada';
import * as movimentacaoServico from '@/funcionalidades/movimentacoes/servicos/movimentacao.servico';
import type { Movimentacao } from '@/funcionalidades/movimentacoes/tipos/movimentacao';
import { DetalheCompartilhada } from './DetalheCompartilhada';
import type { ReactElement, ReactNode } from 'react';

vi.mock('@/funcionalidades/compartilhadas/servicos/conta-compartilhada.servico');
vi.mock('@/funcionalidades/movimentacoes/servicos/movimentacao.servico');
vi.mock('@/funcionalidades/categorias/servicos/categoria.servico');
vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

const EU = 'usuario-1';
const OUTRO = 'usuario-2';

/** MemoryRouter nao escreve em `window.location`, entao a unica forma
 * honesta de afirmar "a aba foi para a URL" e' ler a busca de dentro do
 * router. */
function EspiaoDeBusca(): ReactElement {
  const { search } = useLocation();
  return <span data-testid="busca-atual">{search}</span>;
}

function criarWrapper(busca = ''): ({ children }: { children: ReactNode }) => ReactElement {
  return function Envolver({ children }: { children: ReactNode }): ReactElement {
    const cliente = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return (
      <QueryClientProvider client={cliente}>
        <MemoryRouter initialEntries={[`/compartilhadas/grupo-1${busca}`]}>
          <Routes>
            <Route path="/compartilhadas/:id" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };
}

const Wrapper = criarWrapper();

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

const PERMISSOES_PARTICIPANTE: PermissoesGrupo = {
  ...PERMISSOES_ADMINISTRADOR,
  podeEditar: false,
  podeExcluir: false,
  podeConvidar: false,
  podeGerenciarMembros: false,
  podeGerenciarCategorias: false,
  podeEditarMovimentacaoDeTerceiro: false,
  podeExcluirMovimentacaoDeTerceiro: false,
  podeVerAuditoria: false,
};

const PERMISSOES_OBSERVADOR: PermissoesGrupo = {
  podeEditar: false,
  podeExcluir: false,
  podeConvidar: false,
  podeGerenciarMembros: false,
  podeGerenciarCategorias: false,
  podeCriarMovimentacao: false,
  podeEditarMovimentacaoPropria: false,
  podeEditarMovimentacaoDeTerceiro: false,
  podeExcluirMovimentacaoPropria: false,
  podeExcluirMovimentacaoDeTerceiro: false,
  podeVerAuditoria: false,
};

function fabricarGrupo(papel: PapelMembro, permissoes: PermissoesGrupo): ContaCompartilhadaDetalhe {
  return {
    id: 'grupo-1',
    nome: 'Casa',
    descricao: 'Despesas da casa',
    imagemUrl: null,
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    meuPapel: papel,
    minhasPermissoes: permissoes,
    saldoTotal: '1284.60',
    membros: [
      {
        id: 'mem-1',
        papel: 'ADMINISTRADOR',
        situacao: 'ATIVO',
        entrouEm: '2026-06-15T12:00:00.000Z',
        usuario: { id: OUTRO, nome: 'Ana Souza', email: 'ana@exemplo.com', fotoUrl: null },
      },
      {
        id: 'mem-2',
        papel: papel,
        situacao: 'ATIVO',
        entrouEm: '2026-06-16T09:30:00.000Z',
        usuario: { id: EU, nome: 'Samuel De Marco', email: 'samuel@exemplo.com', fotoUrl: null },
      },
    ],
    contas: [
      {
        id: 'conta-g1',
        nome: 'Caixa da Casa',
        tipo: 'CARTEIRA',
        saldoAtual: '1284.60',
        cor: '#2563EB',
        icone: 'wallet',
      },
    ],
    criadoEm: '2026-06-15T12:00:00.000Z',
  };
}

function fabricarMovimentacao(autorId: string, sobrescritas: Partial<Movimentacao> = {}) {
  return {
    id: `mov-${autorId}`,
    tipo: 'DESPESA' as const,
    descricao: autorId === EU ? 'Mercado meu' : 'Mercado da Ana',
    observacao: null,
    valor: '100.00',
    valorPago: '0.00',
    situacao: 'PENDENTE' as const,
    dataCompetencia: '2026-08-01',
    dataVencimento: null,
    dataEfetivacao: null,
    conta: { id: 'conta-g1', nome: 'Caixa da Casa', cor: '#2563EB', icone: 'wallet' },
    contaCompartilhada: null,
    categoria: null,
    cartao: null,
    fatura: null,
    etiquetas: [],
    autor: {
      id: autorId,
      nome: autorId === EU ? 'Samuel De Marco' : 'Ana Souza',
      fotoUrl: null,
    },
    transferencia: null,
    recorrencia: null,
    parcelamento: null,
    anexos: [],
    quantidadeAnexos: 0,
    criadoEm: '2026-08-01T12:00:00.000Z',
    atualizadoEm: '2026-08-01T12:00:00.000Z',
    ...sobrescritas,
  };
}

function prepararListagem(): void {
  vi.mocked(movimentacaoServico.listarMovimentacoes).mockResolvedValue({
    movimentacoes: [fabricarMovimentacao(EU), fabricarMovimentacao(OUTRO)],
    paginacao: {
      pagina: 1,
      limite: 20,
      total: 2,
      totalPaginas: 1,
      temProxima: false,
      temAnterior: false,
    },
    totalizadores: {
      receitas: '0.00',
      despesas: '200.00',
      resultado: '-200.00',
      receitasPendentes: '0.00',
      despesasPendentes: '200.00',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: {
      id: EU,
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: true,
      fotoUrl: null,
      perfil: {
        fotoUrl: null,
        moedaPadrao: 'BRL',
        idioma: 'pt-BR',
        tema: 'CLARO',
        timezone: 'America/Sao_Paulo',
      },
    } as never,
    estaAutenticado: true,
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });
  vi.mocked(categoriaServico.listarCategorias).mockResolvedValue([]);
  prepararListagem();
});

describe('DetalheCompartilhada', () => {
  it('mostra cabecalho com nome, saldo e papel', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    expect(await screen.findByRole('heading', { name: 'Casa' })).toBeTruthy();
    expect(screen.getByText(/1\.284,60/)).toBeTruthy();
    expect(screen.getByText('Administrador')).toBeTruthy();
  });

  it('busca as movimentacoes no escopo do grupo, nao no pessoal', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(vi.mocked(movimentacaoServico.listarMovimentacoes)).toHaveBeenCalled();
    });
    expect(vi.mocked(movimentacaoServico.listarMovimentacoes).mock.calls[0]?.[0]).toMatchObject({
      contaCompartilhadaId: 'grupo-1',
    });
  });

  it('mostra o autor de cada movimentacao (RF-59)', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    expect(await screen.findByRole('columnheader', { name: 'Autor' })).toBeTruthy();
    expect(screen.getAllByText('Ana Souza').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Samuel De Marco').length).toBeGreaterThan(0);
  });

  it('aba Configuracoes e Auditoria só aparecem para o administrador', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    expect(await screen.findByRole('tab', { name: 'Configurações' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Auditoria' })).toBeTruthy();
  });

  it('aba Configuracoes fica oculta para nao administrador', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('PARTICIPANTE', PERMISSOES_PARTICIPANTE),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    expect(await screen.findByRole('tab', { name: 'Movimentações' })).toBeTruthy();
    expect(screen.queryByRole('tab', { name: 'Configurações' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Auditoria' })).toBeNull();
  });

  it('observador nao ve nenhum botao de criacao ou edicao', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('OBSERVADOR', PERMISSOES_OBSERVADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    await screen.findByRole('columnheader', { name: 'Autor' });
    expect(screen.queryByRole('button', { name: 'Nova movimentação' })).toBeNull();
    // Nenhum menu de acoes em nenhuma linha — nem sequer o botao que o abre.
    expect(screen.queryByRole('button', { name: /^Ações para/ })).toBeNull();
  });

  it('participante ve acoes so no proprio lancamento', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('PARTICIPANTE', PERMISSOES_PARTICIPANTE),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    await screen.findByRole('columnheader', { name: 'Autor' });
    // Em jsdom a tabela (md+) e a lista de cartoes (mobile) renderizam as
    // duas, porque as media queries do Tailwind nao se aplicam — por isso
    // o proprio lancamento aparece mais de uma vez. O que importa e' o
    // contraste: o meu tem menu, o da Ana nao tem nenhum.
    expect(
      screen.getAllByRole('button', { name: 'Ações para Mercado meu' }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Ações para Mercado da Ana' })).toBeNull();
  });

  it('a aba selecionada vai para a URL', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(
      <>
        <DetalheCompartilhada />
        <EspiaoDeBusca />
      </>,
      { wrapper: Wrapper },
    );

    await userEvent.click(await screen.findByRole('tab', { name: 'Membros' }));

    expect(screen.getByRole('tab', { name: 'Membros' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('busca-atual').textContent).toContain('aba=membros');
  });

  it('abrir a pagina com ?aba= na URL ja mostra aquela aba', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: criarWrapper('?aba=contas') });

    expect(await screen.findByText('Caixa da Casa')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Contas' }).getAttribute('aria-selected')).toBe('true');
  });

  it('link para aba de administrador cai em Movimentacoes quando o papel nao a ve', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('PARTICIPANTE', PERMISSOES_PARTICIPANTE),
    );

    render(<DetalheCompartilhada />, { wrapper: criarWrapper('?aba=configuracoes') });

    expect(
      (await screen.findByRole('tab', { name: 'Movimentações' })).getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('aba Membros mostra papel e data de entrada de cada membro', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByRole('tab', { name: 'Membros' }));

    expect(screen.getByText('ana@exemplo.com')).toBeTruthy();
    expect(screen.getByText(/No grupo desde 15\/06\/2026/)).toBeTruthy();
  });

  it('aba Contas mostra os saldos das contas do grupo', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockResolvedValue(
      fabricarGrupo('ADMINISTRADOR', PERMISSOES_ADMINISTRADOR),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });
    await userEvent.click(await screen.findByRole('tab', { name: 'Contas' }));

    expect(screen.getByText('Caixa da Casa')).toBeTruthy();
  });

  it('grupo inacessivel mostra erro sem distinguir de inexistente (RN-51)', async () => {
    vi.mocked(contaCompartilhadaServico.buscarContaCompartilhada).mockRejectedValue(
      new Error('404'),
    );

    render(<DetalheCompartilhada />, { wrapper: Wrapper });

    expect(await screen.findByText(/Grupo não encontrado ou você não faz parte dele/)).toBeTruthy();
  });
});
