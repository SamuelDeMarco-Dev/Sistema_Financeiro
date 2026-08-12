import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import { aceitarConvite, listarConvitesRecebidos, recusarConvite } from './convite.servico';

vi.mock('@/servicos/api', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('convite.servico', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('listar recebidos desempacota data.convites', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { convites: [{ id: 'conv-1' }] } } });

    const convites = await listarConvitesRecebidos();

    expect(convites).toHaveLength(1);
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe('/convites/recebidos');
  });

  it('aceitar devolve o membro criado', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: { data: { membro: { id: 'mem-1', contaCompartilhada: { id: 'g1', nome: 'Casa' } } } },
    });

    const membro = await aceitarConvite('conv-1');

    expect(membro.contaCompartilhada.nome).toBe('Casa');
    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toBe('/convites/conv-1/aceitar');
  });

  it('recusar usa POST /convites/:id/recusar, nao o DELETE de cancelamento', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });

    await recusarConvite('conv-1');

    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toBe('/convites/conv-1/recusar');
    expect(vi.mocked(api.delete)).not.toHaveBeenCalled();
  });
});
