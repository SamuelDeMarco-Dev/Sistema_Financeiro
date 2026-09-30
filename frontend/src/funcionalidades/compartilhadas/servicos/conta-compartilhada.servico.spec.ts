import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import {
  alterarPapelMembro,
  atualizarContaCompartilhada,
  atualizarImagemGrupo,
  buscarContaCompartilhada,
  criarContaCompartilhada,
  excluirContaCompartilhada,
  listarContasCompartilhadas,
  removerMembro,
  sairDoGrupo,
  transferirAdministracao,
} from './conta-compartilhada.servico';
import type { ContaCompartilhadaListaItem } from '../tipos/conta-compartilhada';

vi.mock('@/servicos/api', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

function fabricarItem(
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

describe('conta-compartilhada.servico', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('listar desempacota data.contasCompartilhadas', async () => {
    const item = fabricarItem();
    vi.mocked(api.get).mockResolvedValue({ data: { data: { contasCompartilhadas: [item] } } });

    await expect(listarContasCompartilhadas()).resolves.toEqual([item]);
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe('/contas-compartilhadas');
  });

  it('buscar por id desempacota data.contaCompartilhada', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { contaCompartilhada: { id: 'grupo-1' } } },
    });

    const grupo = await buscarContaCompartilhada('grupo-1');

    expect(grupo.id).toBe('grupo-1');
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe('/contas-compartilhadas/grupo-1');
  });

  it('criar envia o corpo documentado em 04-API.md §16.2', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { contaCompartilhada: { id: 'grupo-9' } } },
    });
    const payload = {
      nome: 'Casa',
      descricao: undefined,
      moeda: 'BRL',
      cor: '#2563EB',
      permiteParticipanteEditarProprias: true,
      criarCategoriasPadrao: true,
    };

    const grupo = await criarContaCompartilhada(payload);

    expect(grupo.id).toBe('grupo-9');
    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toBe('/contas-compartilhadas');
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).toEqual(payload);
  });

  it('imagem viaja como multipart no campo "imagem"', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { imagemUrl: 'https://x/g.webp' } } });
    const blob = new Blob(['bytes'], { type: 'image/webp' });

    await expect(atualizarImagemGrupo('grupo-1', blob)).resolves.toBe('https://x/g.webp');

    const [rota, corpo, config] = vi.mocked(api.post).mock.calls[0] ?? [];
    expect(rota).toBe('/contas-compartilhadas/grupo-1/imagem');
    expect(corpo).toBeInstanceOf(FormData);
    expect((corpo as FormData).get('imagem')).toBeInstanceOf(Blob);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });

  it('atualizar envia PATCH parcial e desempacota o grupo (§16.4)', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { data: { contaCompartilhada: fabricarItem({ nome: 'Casa Nova' }) } },
    });

    const grupo = await atualizarContaCompartilhada('grupo-1', {
      nome: 'Casa Nova',
      descricao: null,
    });

    expect(grupo.nome).toBe('Casa Nova');
    expect(vi.mocked(api.patch).mock.calls[0]?.[0]).toBe('/contas-compartilhadas/grupo-1');
    expect(vi.mocked(api.patch).mock.calls[0]?.[1]).toEqual({ nome: 'Casa Nova', descricao: null });
  });

  // O nome do grupo vai no CORPO de um DELETE (§16.9). Axios so envia corpo
  // em DELETE via `{ data }`, e um `undefined` silencioso aqui derrubaria a
  // confirmacao que RN-33 exige — por isso o teste checa a forma exata.
  it('excluir manda a confirmacao no corpo do DELETE', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: '' });

    await excluirContaCompartilhada('grupo-1', 'Casa');

    expect(vi.mocked(api.delete).mock.calls[0]?.[0]).toBe('/contas-compartilhadas/grupo-1');
    expect(vi.mocked(api.delete).mock.calls[0]?.[1]).toEqual({ data: { confirmacao: 'Casa' } });
  });

  it('alterar papel usa a rota do membro e desempacota data.membro (§16.5)', async () => {
    vi.mocked(api.patch).mockResolvedValue({
      data: { data: { membro: { id: 'mem-2', papel: 'OBSERVADOR' } } },
    });

    const membro = await alterarPapelMembro('grupo-1', 'mem-2', 'OBSERVADOR');

    expect(membro.papel).toBe('OBSERVADOR');
    expect(vi.mocked(api.patch).mock.calls[0]?.[0]).toBe(
      '/contas-compartilhadas/grupo-1/membros/mem-2',
    );
    expect(vi.mocked(api.patch).mock.calls[0]?.[1]).toEqual({ papel: 'OBSERVADOR' });
  });

  it('remover membro chama DELETE na rota do membro (§16.6)', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: '' });

    await removerMembro('grupo-1', 'mem-2');

    expect(vi.mocked(api.delete).mock.calls[0]?.[0]).toBe(
      '/contas-compartilhadas/grupo-1/membros/mem-2',
    );
  });

  it('transferir administracao envia o membro destino (§16.7)', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        data: {
          administradorAnterior: { membroId: 'mem-1', papel: 'PARTICIPANTE' },
          novoAdministrador: { membroId: 'mem-2', papel: 'ADMINISTRADOR' },
        },
      },
    });

    const resultado = await transferirAdministracao('grupo-1', 'mem-2');

    expect(resultado.novoAdministrador.membroId).toBe('mem-2');
    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toBe(
      '/contas-compartilhadas/grupo-1/transferir-administracao',
    );
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).toEqual({ novoAdministradorMembroId: 'mem-2' });
  });

  it('sair chama a rota de saida do grupo (§16.8)', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: '' });

    await sairDoGrupo('grupo-1');

    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toBe('/contas-compartilhadas/grupo-1/sair');
  });
});
