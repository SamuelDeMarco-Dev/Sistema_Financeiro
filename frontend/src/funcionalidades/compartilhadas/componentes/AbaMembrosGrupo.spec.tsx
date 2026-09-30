import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as ContextoAutenticacao from '@/contextos/ContextoAutenticacao';
import { ErroApi } from '@/servicos/erro-api';
import { AbaMembrosGrupo } from './AbaMembrosGrupo';
import * as contaCompartilhadaServico from '../servicos/conta-compartilhada.servico';
import * as conviteServico from '../servicos/convite.servico';
import type {
  ContaCompartilhadaDetalhe,
  PapelMembro,
  PermissoesGrupo,
} from '../tipos/conta-compartilhada';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/conta-compartilhada.servico');
vi.mock('../servicos/convite.servico');
vi.mock('@/contextos/ContextoAutenticacao', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/contextos/ContextoAutenticacao')>();
  return { ...real, useSessao: vi.fn() };
});

const EU = 'usuario-1';
const OUTRO = 'usuario-2';

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

/** `meuPapel` e o id do usuário da sessão são o que decide "eu" na lista;
 * o grupo tem sempre um administrador (RN-28), que aqui é `mem-adm`. */
function fabricarGrupo(meuPapel: PapelMembro): ContaCompartilhadaDetalhe {
  const souAdministrador = meuPapel === 'ADMINISTRADOR';

  return {
    id: 'grupo-1',
    nome: 'Casa',
    descricao: null,
    imagemUrl: null,
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    meuPapel,
    minhasPermissoes: souAdministrador ? PERMISSOES_ADMINISTRADOR : PERMISSOES_PARTICIPANTE,
    saldoTotal: '0.00',
    membros: [
      {
        id: 'mem-adm',
        papel: 'ADMINISTRADOR',
        situacao: 'ATIVO',
        entrouEm: '2026-06-15T12:00:00.000Z',
        usuario: souAdministrador
          ? { id: EU, nome: 'Samuel De Marco', email: 'samuel@exemplo.com', fotoUrl: null }
          : { id: OUTRO, nome: 'Ana Souza', email: 'ana@exemplo.com', fotoUrl: null },
      },
      {
        id: 'mem-outro',
        papel: 'PARTICIPANTE',
        situacao: 'ATIVO',
        entrouEm: '2026-06-16T09:30:00.000Z',
        usuario: souAdministrador
          ? { id: OUTRO, nome: 'Ana Souza', email: 'ana@exemplo.com', fotoUrl: null }
          : { id: EU, nome: 'Samuel De Marco', email: 'samuel@exemplo.com', fotoUrl: null },
      },
      {
        id: 'mem-saiu',
        papel: 'OBSERVADOR',
        situacao: 'REMOVIDO',
        entrouEm: '2026-06-17T09:30:00.000Z',
        usuario: { id: 'usuario-3', nome: 'Ex Membro', email: 'ex@exemplo.com', fotoUrl: null },
      },
    ],
    contas: [],
    criadoEm: '2026-06-15T12:00:00.000Z',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ContextoAutenticacao.useSessao).mockReturnValue({
    usuario: {
      id: EU,
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      perfil: {
        fotoUrl: null,
        moedaPadrao: 'BRL',
        idioma: 'pt-BR',
        tema: 'CLARO',
        timezone: 'America/Sao_Paulo',
      },
    },
    estaAutenticado: true,
    carregando: false,
    entrar: vi.fn(),
    sair: vi.fn(),
    atualizarUsuario: vi.fn(),
  });
  vi.mocked(conviteServico.listarConvitesDoGrupo).mockResolvedValue([]);
});

describe('AbaMembrosGrupo — leitura', () => {
  it('lista apenas membros ativos e marca quem sou eu', () => {
    render(<AbaMembrosGrupo grupo={fabricarGrupo('ADMINISTRADOR')} />, { wrapper: Wrapper });

    expect(screen.getByText('Ana Souza')).toBeTruthy();
    expect(screen.getByText('(você)')).toBeTruthy();
    // RN-34: o ex-membro nao aparece na lista de membros, mas os
    // lancamentos dele seguem no grupo — o que a lista mostra e' o acesso.
    expect(screen.queryByText('Ex Membro')).toBeNull();
  });
});

describe('AbaMembrosGrupo — administrador', () => {
  it('oferece convidar e administrar os outros membros', async () => {
    render(<AbaMembrosGrupo grupo={fabricarGrupo('ADMINISTRADOR')} />, { wrapper: Wrapper });

    expect(screen.getByRole('button', { name: 'Convidar membro' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Transferir administração' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ações para Ana Souza' })).toBeTruthy();
    // O proprio administrador nao tem menu: alterar o proprio papel e
    // remover-se sao recusados pelo servidor (RN-28/RN-29).
    expect(screen.queryByRole('button', { name: 'Ações para Samuel De Marco' })).toBeNull();
    await waitFor(() => {
      expect(vi.mocked(conviteServico.listarConvitesDoGrupo)).toHaveBeenCalledWith('grupo-1');
    });
  });

  it('alterar papel envia o novo papel do membro escolhido', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.alterarPapelMembro).mockResolvedValue({
      id: 'mem-outro',
      papel: 'OBSERVADOR',
      situacao: 'ATIVO',
      entrouEm: '2026-06-16T09:30:00.000Z',
      usuario: { id: OUTRO, nome: 'Ana Souza', email: 'ana@exemplo.com', fotoUrl: null },
    });

    render(<AbaMembrosGrupo grupo={fabricarGrupo('ADMINISTRADOR')} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Ações para Ana Souza' }));
    await usuario.click(await screen.findByText('Alterar papel'));

    const dialogo = screen.getByRole('dialog');
    // Abre ja no papel oposto ao atual (participante -> observador): o
    // dialogo so existe para trocar.
    await usuario.click(within(dialogo).getByRole('button', { name: 'Alterar papel' }));

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.alterarPapelMembro)).toHaveBeenCalledWith(
        'grupo-1',
        'mem-outro',
        'OBSERVADOR',
      );
    });
  });

  it('remover membro avisa que os lancamentos permanecem (RN-34)', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.removerMembro).mockResolvedValue(undefined);

    render(<AbaMembrosGrupo grupo={fabricarGrupo('ADMINISTRADOR')} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Ações para Ana Souza' }));
    await usuario.click(await screen.findByText('Remover do grupo'));

    const dialogo = screen.getByRole('dialog');
    expect(
      within(dialogo).getByText(/lançamentos registrados por essa pessoa permanecem no grupo/i),
    ).toBeTruthy();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Remover do grupo' }));

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.removerMembro)).toHaveBeenCalledWith(
        'grupo-1',
        'mem-outro',
      );
    });
  });

  // O caso que o navegador pegou: o dialogo aberto por item de menu abre
  // antes de o menu devolver o foco ao gatilho, entao a origem so e' a certa
  // se for rastreada por `focusin` (ver Dialog.tsx) — sem isso o foco caia
  // no `body` e quem usa teclado perdia o lugar na lista.
  it('Esc num dialogo aberto pelo menu devolve o foco ao gatilho do menu', async () => {
    const usuario = userEvent.setup();

    render(<AbaMembrosGrupo grupo={fabricarGrupo('ADMINISTRADOR')} />, { wrapper: Wrapper });
    const gatilho = screen.getByRole('button', { name: 'Ações para Ana Souza' });
    await usuario.click(gatilho);
    await usuario.click(await screen.findByText('Remover do grupo'));
    expect(screen.getByRole('dialog')).toBeTruthy();

    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => {
      expect(document.activeElement).toBe(gatilho);
    });
  });

  it('transferir administracao exige escolher o membro e digitar o nome dele', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.transferirAdministracao).mockResolvedValue({
      administradorAnterior: { membroId: 'mem-adm', papel: 'PARTICIPANTE' },
      novoAdministrador: { membroId: 'mem-outro', papel: 'ADMINISTRADOR' },
    });

    render(<AbaMembrosGrupo grupo={fabricarGrupo('ADMINISTRADOR')} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Transferir administração' }));

    const dialogo = screen.getByRole('dialog');
    const confirmar = within(dialogo).getByRole('button', { name: 'Transferir administração' });
    expect(confirmar.hasAttribute('disabled')).toBe(true);

    await usuario.selectOptions(within(dialogo).getByLabelText('Novo administrador'), 'mem-outro');
    // Escolher nao basta: a acao nao volta atras sozinha, entao a trava e' a
    // digitacao do nome de quem recebe o posto.
    expect(confirmar.hasAttribute('disabled')).toBe(true);

    await usuario.type(within(dialogo).getByLabelText(/Digite/), 'Ana Souza');
    await usuario.click(confirmar);

    await waitFor(() => {
      expect(vi.mocked(contaCompartilhadaServico.transferirAdministracao)).toHaveBeenCalledWith(
        'grupo-1',
        'mem-outro',
      );
    });
  });

  it('administrador que tenta sair recebe o caminho da transferencia (RN-29)', async () => {
    const usuario = userEvent.setup();

    render(<AbaMembrosGrupo grupo={fabricarGrupo('ADMINISTRADOR')} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Sair do grupo' }));

    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/não pode ficar sem administrador/i)).toBeTruthy();
    // Nenhuma tentativa de saida: o botao leva a transferencia, nao a um 422.
    expect(vi.mocked(contaCompartilhadaServico.sairDoGrupo)).not.toHaveBeenCalled();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Transferir administração' }));

    expect(await screen.findByLabelText('Novo administrador')).toBeTruthy();
  });
});

describe('AbaMembrosGrupo — participante', () => {
  it('nao oferece nenhuma acao de administracao', () => {
    render(<AbaMembrosGrupo grupo={fabricarGrupo('PARTICIPANTE')} />, { wrapper: Wrapper });

    expect(screen.queryByRole('button', { name: 'Convidar membro' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Transferir administração' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ações para Ana Souza' })).toBeNull();
    expect(screen.getByText(/Somente o administrador do grupo convida/)).toBeTruthy();
  });

  it('nao consulta os convites do grupo, que exigem administrador', () => {
    render(<AbaMembrosGrupo grupo={fabricarGrupo('PARTICIPANTE')} />, { wrapper: Wrapper });

    expect(vi.mocked(conviteServico.listarConvitesDoGrupo)).not.toHaveBeenCalled();
  });

  it('sai do grupo direto, com o aviso de que os lancamentos ficam', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.sairDoGrupo).mockResolvedValue(undefined);

    render(<AbaMembrosGrupo grupo={fabricarGrupo('PARTICIPANTE')} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Sair do grupo' }));

    const dialogo = screen.getByRole('dialog');
    expect(
      within(dialogo).getByText(/lançamentos que você registrou continuam no grupo/i),
    ).toBeTruthy();

    await usuario.click(within(dialogo).getByRole('button', { name: 'Sair do grupo' }));

    await waitFor(() => {
      // React Query passa um segundo argumento de contexto ao `mutationFn`
      // quando ele e' a propria funcao do servico.
      expect(vi.mocked(contaCompartilhadaServico.sairDoGrupo)).toHaveBeenCalledWith(
        'grupo-1',
        expect.anything(),
      );
    });
  });

  it('422 ADMINISTRADOR_UNICO na saida mostra o caminho, nao o erro cru', async () => {
    const usuario = userEvent.setup();
    vi.mocked(contaCompartilhadaServico.sairDoGrupo).mockRejectedValue(
      new ErroApi('Regra de negocio.', 'ADMINISTRADOR_UNICO', 422),
    );

    render(<AbaMembrosGrupo grupo={fabricarGrupo('PARTICIPANTE')} />, { wrapper: Wrapper });
    await usuario.click(screen.getByRole('button', { name: 'Sair do grupo' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Sair do grupo' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta.textContent).toContain('Transfira a administração');
  });
});
