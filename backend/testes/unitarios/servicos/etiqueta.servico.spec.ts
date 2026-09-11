import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NaoEncontradoErro, PapelInsuficienteErro } from '@/erros';
import { EtiquetaRepositorio } from '@/repositorios/etiqueta.repositorio';
import * as autorizacaoGrupo from '@/servicos/autorizacao-grupo.servico';
import { EtiquetaServico } from '@/servicos/etiqueta.servico';
import type { Etiqueta, MembroCompartilhado } from '@prisma/client';

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

function fabricarMembro(sobrescritas: Partial<MembroCompartilhado> = {}): MembroCompartilhado {
  return {
    id: 'membro-1',
    contaCompartilhadaId: 'grupo-1',
    usuarioId: 'usuario-1',
    papel: 'ADMINISTRADOR',
    situacao: 'ATIVO',
    entrouEm: new Date('2026-01-01T00:00:00.000Z'),
    saiuEm: null,
    convidadoPorId: null,
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
    vi.spyOn(autorizacaoGrupo, 'autorizarPapelNoGrupo').mockResolvedValue(fabricarMembro());
  });

  describe('listar', () => {
    it('mapeia etiquetas com a contagem de uso (escopo pessoal)', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([fabricarEtiqueta()]);
      repositorio.contarUso.mockResolvedValue(12);

      const resultado = await servico.listar('usuario-1', {});

      expect(resultado).toEqual([
        { id: 'etiqueta-1', nome: 'viagem', cor: '#64748B', quantidadeMovimentacoes: 12 },
      ]);
      expect(repositorio.listarPorGrupo).not.toHaveBeenCalled();
    });

    it('com contaCompartilhadaId autoriza qualquer membro ativo e usa listarPorGrupo', async () => {
      repositorio.listarPorGrupo.mockResolvedValue([
        fabricarEtiqueta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      ]);

      await servico.listar('usuario-1', { contaCompartilhadaId: 'grupo-1' });

      expect(autorizacaoGrupo.autorizarPapelNoGrupo).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        [],
      );
      expect(repositorio.listarPorGrupo).toHaveBeenCalledWith('grupo-1');
      expect(repositorio.listarPorUsuario).not.toHaveBeenCalled();
    });
  });

  describe('criar', () => {
    it('cria a etiqueta pessoal com nome e cor', async () => {
      repositorio.criar.mockResolvedValue(fabricarEtiqueta());

      await servico.criar('usuario-1', { nome: 'viagem', cor: '#64748B' });

      expect(repositorio.criar).toHaveBeenCalledWith('usuario-1', {
        nome: 'viagem',
        cor: '#64748B',
      });
    });

    it('com contaCompartilhadaId autoriza ADMINISTRADOR ou PARTICIPANTE e usa criarDeGrupo', async () => {
      repositorio.criarDeGrupo.mockResolvedValue(
        fabricarEtiqueta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      );

      await servico.criar('usuario-1', {
        nome: 'viagem',
        cor: '#64748B',
        contaCompartilhadaId: 'grupo-1',
      });

      expect(autorizacaoGrupo.autorizarPapelNoGrupo).toHaveBeenCalledWith('grupo-1', 'usuario-1', [
        'ADMINISTRADOR',
        'PARTICIPANTE',
      ]);
      expect(repositorio.criarDeGrupo).toHaveBeenCalledWith('grupo-1', {
        nome: 'viagem',
        cor: '#64748B',
      });
    });

    it('OBSERVADOR nao pode criar etiqueta de grupo (propaga PapelInsuficienteErro)', async () => {
      vi.spyOn(autorizacaoGrupo, 'autorizarPapelNoGrupo').mockRejectedValue(
        new PapelInsuficienteErro('Seu papel no grupo nao permite esta acao.'),
      );

      await expect(
        servico.criar('usuario-1', {
          nome: 'viagem',
          cor: '#64748B',
          contaCompartilhadaId: 'grupo-1',
        }),
      ).rejects.toThrow(PapelInsuficienteErro);
      expect(repositorio.criarDeGrupo).not.toHaveBeenCalled();
    });
  });

  describe('atualizar', () => {
    it('lanca NaoEncontradoErro quando a etiqueta nao existe', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);

      await expect(servico.atualizar('etiqueta-1', 'usuario-1', { nome: 'praia' })).rejects.toThrow(
        NaoEncontradoErro,
      );
      expect(repositorio.atualizar).not.toHaveBeenCalled();
    });

    it('lanca NaoEncontradoErro quando a etiqueta pertence a outro usuario', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarEtiqueta({ usuarioId: 'outro-usuario' }),
      );

      await expect(servico.atualizar('etiqueta-1', 'usuario-1', { nome: 'praia' })).rejects.toThrow(
        NaoEncontradoErro,
      );
    });

    it('so envia ao repositorio os campos presentes no corpo', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarEtiqueta());
      repositorio.atualizar.mockResolvedValue(fabricarEtiqueta({ nome: 'praia' }));

      await servico.atualizar('etiqueta-1', 'usuario-1', { nome: 'praia' });

      expect(repositorio.atualizar).toHaveBeenCalledWith('etiqueta-1', { nome: 'praia' });
    });

    it('etiqueta de grupo autoriza ADMINISTRADOR ou PARTICIPANTE', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarEtiqueta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      );
      repositorio.atualizar.mockResolvedValue(
        fabricarEtiqueta({ usuarioId: null, contaCompartilhadaId: 'grupo-1', nome: 'praia' }),
      );

      await servico.atualizar('etiqueta-1', 'usuario-1', { nome: 'praia' });

      expect(autorizacaoGrupo.autorizarPapelNoGrupo).toHaveBeenCalledWith('grupo-1', 'usuario-1', [
        'ADMINISTRADOR',
        'PARTICIPANTE',
      ]);
    });
  });

  describe('excluir', () => {
    it('exclui a etiqueta quando pertence ao usuario', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarEtiqueta());

      await servico.excluir('etiqueta-1', 'usuario-1');

      expect(repositorio.excluir).toHaveBeenCalledWith('etiqueta-1');
    });

    it('lanca NaoEncontradoErro para etiqueta inexistente', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);

      await expect(servico.excluir('etiqueta-alheia', 'usuario-1')).rejects.toThrow(
        NaoEncontradoErro,
      );
      expect(repositorio.excluir).not.toHaveBeenCalled();
    });
  });
});
