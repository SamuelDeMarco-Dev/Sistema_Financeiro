import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { api } from '@/servicos/api';
import { atualizarFoto, atualizarPerfil, consultarPerfil, removerFoto } from './perfil.servico';

vi.mock('@/servicos/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const PERFIL_FAKE: PerfilCompleto = {
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

describe('perfil.servico', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  it('consultarPerfil() busca GET /perfil e devolve data.data.perfil desempacotado', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, message: 'Perfil carregado.', data: { perfil: PERFIL_FAKE } },
    });

    const resultado = await consultarPerfil();

    expect(api.get).toHaveBeenCalledWith('/perfil');
    expect(resultado).toEqual(PERFIL_FAKE);
  });

  it('atualizarPerfil() envia PATCH /perfil e devolve o perfil atualizado', async () => {
    const perfilAtualizado = { ...PERFIL_FAKE, nome: 'Samuel M.' };
    vi.mocked(api.patch).mockResolvedValue({
      data: { success: true, message: 'Perfil atualizado.', data: { perfil: perfilAtualizado } },
    });

    const resultado = await atualizarPerfil({ nome: 'Samuel M.' });

    expect(api.patch).toHaveBeenCalledWith('/perfil', { nome: 'Samuel M.' });
    expect(resultado).toEqual(perfilAtualizado);
  });

  it('atualizarFoto() envia multipart/form-data com o campo foto e devolve a fotoUrl', async () => {
    vi.mocked(api.post).mockResolvedValue({
      data: {
        success: true,
        message: 'Foto atualizada.',
        data: { fotoUrl: 'https://exemplo.com/avatar.webp' },
      },
    });

    const blob = new Blob(['conteudo-fake'], { type: 'image/webp' });
    const resultado = await atualizarFoto(blob);

    expect(resultado).toBe('https://exemplo.com/avatar.webp');
    const chamada = vi.mocked(api.post).mock.calls[0];
    expect(chamada?.[0]).toBe('/perfil/foto');
    expect(chamada?.[1]).toBeInstanceOf(FormData);
    expect((chamada?.[2] as { headers: Record<string, string> }).headers['Content-Type']).toBe(
      'multipart/form-data',
    );
  });

  it('removerFoto() envia DELETE /perfil/foto', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    await removerFoto();

    expect(api.delete).toHaveBeenCalledWith('/perfil/foto');
  });
});
