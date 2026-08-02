import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as saudeRepositorio from '@/repositorios/saude.repositorio';
import { obterStatusLiveness, obterStatusProntidao } from '@/servicos/saude.servico';

vi.mock('@/repositorios/saude.repositorio');

const repositorioMockado = vi.mocked(saudeRepositorio);

describe('saude.servico', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('obterStatusLiveness', () => {
    it('retorna status ok com versao, ambiente e tempo ativo', () => {
      const resultado = obterStatusLiveness();

      expect(resultado.status).toBe('ok');
      expect(resultado.versao).toMatch(/^\d+\.\d+\.\d+$/);
      expect(resultado.ambiente).toBe('test');
      expect(resultado.tempoAtivoSegundos).toBeGreaterThanOrEqual(0);
    });
  });

  describe('obterStatusProntidao', () => {
    it('retorna "pronto" quando banco, migrations e armazenamento estao todos ok', async () => {
      repositorioMockado.verificarConexaoBanco.mockResolvedValue(undefined);

      const resultado = await obterStatusProntidao();

      expect(resultado.status).toBe('pronto');
      expect(resultado.verificacoes.banco).toMatchObject({ status: 'ok' });
      expect(resultado.verificacoes.migrations).toEqual({ status: 'ok', pendentes: 0 });
      expect(resultado.verificacoes.armazenamento).toEqual({ status: 'ok', gravavel: true });
    });

    it('retorna "indisponivel" e a mensagem do erro quando o banco esta fora do ar', async () => {
      repositorioMockado.verificarConexaoBanco.mockRejectedValue(new Error('Conexao recusada.'));

      const resultado = await obterStatusProntidao();

      expect(resultado.status).toBe('indisponivel');
      expect(resultado.verificacoes.banco).toEqual({
        status: 'erro',
        mensagem: 'Conexao recusada.',
      });
      // As demais verificacoes continuam sendo reportadas mesmo com o banco fora do ar.
      expect(resultado.verificacoes.armazenamento).toEqual({ status: 'ok', gravavel: true });
    });
  });
});
