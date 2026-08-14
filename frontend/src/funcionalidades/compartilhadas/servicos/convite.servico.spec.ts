import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/servicos/api';
import {
  aceitarConvite,
  buscarPreviaConvite,
  cancelarConvite,
  enviarConvite,
  listarConvitesDoGrupo,
  listarConvitesRecebidos,
  recusarConvite,
} from './convite.servico';

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

  it('enviar posta na rota aninhada ao grupo e devolve data.convite (§17.1)', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        data: { convite: { id: 'conv-9', email: 'ana@exemplo.com', usuarioJaCadastrado: false } },
      },
    });

    const convite = await enviarConvite('grupo-1', {
      email: 'ana@exemplo.com',
      papel: 'PARTICIPANTE',
      mensagem: 'Vem!',
    });

    expect(convite.usuarioJaCadastrado).toBe(false);
    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toBe('/contas-compartilhadas/grupo-1/convites');
    expect(vi.mocked(api.post).mock.calls[0]?.[1]).toEqual({
      email: 'ana@exemplo.com',
      papel: 'PARTICIPANTE',
      mensagem: 'Vem!',
    });
  });

  it('listar por grupo desempacota data.convites', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { convites: [{ id: 'conv-1' }] } } });

    await expect(listarConvitesDoGrupo('grupo-1')).resolves.toHaveLength(1);
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe('/contas-compartilhadas/grupo-1/convites');
  });

  it('cancelar usa DELETE /convites/:id, nao o POST de recusa (§17.5)', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: '' });

    await cancelarConvite('conv-1');

    expect(vi.mocked(api.delete).mock.calls[0]?.[0]).toBe('/convites/conv-1');
    expect(vi.mocked(api.post)).not.toHaveBeenCalled();
  });

  it('previa publica busca por token e desempacota data.convite (§17.3)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: { convite: { emailConvidado: 'an***@exemplo.com' } } },
    });

    const previa = await buscarPreviaConvite('tok-abc');

    expect(previa.emailConvidado).toBe('an***@exemplo.com');
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toBe('/convites/token/tok-abc');
  });
});
