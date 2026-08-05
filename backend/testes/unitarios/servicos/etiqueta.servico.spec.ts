import { beforeEach, describe, expect, it } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NaoEncontradoErro } from '@/erros';
import { EtiquetaRepositorio } from '@/repositorios/etiqueta.repositorio';
import { EtiquetaServico } from '@/servicos/etiqueta.servico';
import type { Etiqueta } from '@prisma/client';

function fabricarEtiqueta(sobrescritas: Partial<Etiqueta> = {}): Etiqueta {
  return {
    id: 'etiqueta-1',
    usuarioId: 'usuario-1',
    contaCompartilhadaId: null,
    nome: 'viagem',
    cor: '#64748B',
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    ...sobrescritas,
  };
}

describe('EtiquetaServico', () => {
  let servico: EtiquetaServico;
  let repositorio: MockProxy<EtiquetaRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    servico = new EtiquetaServico(repositorio);
    repositorio.contarUso.mockResolvedValue(0);
  });

  describe('listar', () => {
    it('mapeia etiquetas com a contagem de uso', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([fabricarEtiqueta()]);
      repositorio.contarUso.mockResolvedValue(12);

      const resultado = await servico.listar('usuario-1');

      expect(resultado).toEqual([
        { id: 'etiqueta-1', nome: 'viagem', cor: '#64748B', quantidadeMovimentacoes: 12 },
      ]);
    });
  });

  describe('criar', () => {
    it('cria a etiqueta com nome e cor', async () => {
      repositorio.criar.mockResolvedValue(fabricarEtiqueta());

      await servico.criar('usuario-1', { nome: 'viagem', cor: '#64748B' });

      expect(repositorio.criar).toHaveBeenCalledWith('usuario-1', {
        nome: 'viagem',
        cor: '#64748B',
      });
    });
  });

  describe('atualizar', () => {
    it('lanca NaoEncontradoErro quando a etiqueta nao pertence ao usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(servico.atualizar('etiqueta-1', 'usuario-1', { nome: 'praia' })).rejects.toThrow(
        NaoEncontradoErro,
      );
      expect(repositorio.atualizar).not.toHaveBeenCalled();
    });

    it('so envia ao repositorio os campos presentes no corpo', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarEtiqueta());
      repositorio.atualizar.mockResolvedValue(fabricarEtiqueta({ nome: 'praia' }));

      await servico.atualizar('etiqueta-1', 'usuario-1', { nome: 'praia' });

      expect(repositorio.atualizar).toHaveBeenCalledWith('etiqueta-1', { nome: 'praia' });
    });
  });

  describe('excluir', () => {
    it('exclui a etiqueta quando pertence ao usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarEtiqueta());

      await servico.excluir('etiqueta-1', 'usuario-1');

      expect(repositorio.excluir).toHaveBeenCalledWith('etiqueta-1');
    });

    it('lanca NaoEncontradoErro para etiqueta de outro usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(servico.excluir('etiqueta-alheia', 'usuario-1')).rejects.toThrow(
        NaoEncontradoErro,
      );
      expect(repositorio.excluir).not.toHaveBeenCalled();
    });
  });
});
