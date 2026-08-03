import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { consultarPerfil } from './perfil.servico';

vi.mock('./api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

describe('consultarPerfil', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('busca GET /perfil e devolve data.data.perfil desempacotado', async () => {
    const perfilFake = {
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: true,
      fotoUrl: null,
      moedaPadrao: 'BRL',
      idioma: 'pt-BR',
      tema: 'SISTEMA' as const,
      timezone: 'America/Sao_Paulo',
      formatoData: 'dd/MM/yyyy',
      primeiroDiaSemana: 0,
      notificacoesApp: true,
      notificacoesEmail: true,
      criadoEm: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, message: 'Perfil carregado.', data: { perfil: perfilFake } },
    });

    const resultado = await consultarPerfil();

    expect(api.get).toHaveBeenCalledWith('/perfil');
    expect(resultado).toEqual(perfilFake);
  });
});
