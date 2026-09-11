import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import { criarEtiqueta, listarEtiquetas } from './etiqueta.servico';
import type { Etiqueta } from '../tipos/etiqueta';

vi.mock('@/servicos/api', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

function fabricarEtiqueta(sobrescritas: Partial<Etiqueta> = {}): Etiqueta {
  return {
    id: 'etiqueta-1',
    nome: 'viagem-chile',
    cor: '#0EA5E9',
    quantidadeMovimentacoes: 0,
    ...sobrescritas,
  };
}

describe('etiqueta.servico', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it('listarEtiquetas() desempacota a lista', async () => {
    const etiqueta = fabricarEtiqueta();
    vi.mocked(api.get).mockResolvedValue({ data: { data: { etiquetas: [etiqueta] } } });

    const resultado = await listarEtiquetas();

    expect(api.get).toHaveBeenCalledWith('/etiquetas', { params: {} });
    expect(resultado).toEqual([etiqueta]);
  });

  it('listarEtiquetas() repassa o escopo de grupo como query', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { etiquetas: [] } } });

    await listarEtiquetas({ contaCompartilhadaId: 'grupo-1' });

    expect(api.get).toHaveBeenCalledWith('/etiquetas', {
      params: { contaCompartilhadaId: 'grupo-1' },
    });
  });

  it('criarEtiqueta() posta o payload', async () => {
    const etiqueta = fabricarEtiqueta({ nome: 'essencial' });
    vi.mocked(api.post).mockResolvedValue({ data: { data: { etiqueta } } });

    const resultado = await criarEtiqueta({ nome: 'essencial' });

    expect(api.post).toHaveBeenCalledWith('/etiquetas', { nome: 'essencial' });
    expect(resultado).toEqual(etiqueta);
  });
});
