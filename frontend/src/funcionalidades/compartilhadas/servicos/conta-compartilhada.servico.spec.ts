import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import {
  atualizarImagemGrupo,
  buscarContaCompartilhada,
  criarContaCompartilhada,
  listarContasCompartilhadas,
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
});
