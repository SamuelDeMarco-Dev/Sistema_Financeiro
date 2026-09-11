import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NaoEncontradoErro, RegraNegocioErro } from '@/erros';
import { MetaRepositorio } from '@/repositorios/meta.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import * as autorizacaoGrupo from '@/servicos/autorizacao-grupo.servico';
import { MetaServico } from '@/servicos/meta.servico';
import type { MembroCompartilhado, Meta, Perfil } from '@prisma/client';

function fabricarMeta(sobrescritas: Partial<Meta> = {}): Meta {
  return {
    id: 'meta-1',
    usuarioId: 'usuario-1',
    contaCompartilhadaId: null,
    nome: 'Viagem Chile',
    descricao: null,
    valorAlvo: new Prisma.Decimal('1000.00'),
    valorAcumulado: new Prisma.Decimal('0.00'),
    prazoEm: null,
    cor: '#16A34A',
    icone: 'target',
    situacao: 'ATIVA',
    concluidaEm: null,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    excluidoEm: null,
    ...sobrescritas,
  };
}

function fabricarPerfil(sobrescritas: Partial<Perfil> = {}): Perfil {
  return {
    id: 'perfil-1',
    usuarioId: 'usuario-1',
    fotoUrl: null,
    moedaPadrao: 'BRL',
    idioma: 'pt-BR',
    tema: 'SISTEMA',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
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
    papel: 'PARTICIPANTE',
    situacao: 'ATIVO',
    entrouEm: new Date('2026-01-01T00:00:00.000Z'),
    saiuEm: null,
    convidadoPorId: null,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    ...sobrescritas,
  };
}

describe('MetaServico', () => {
  let servico: MetaServico;
  let repositorio: MockProxy<MetaRepositorio>;
  let perfilRepositorio: MockProxy<PerfilRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    perfilRepositorio = mock();
    servico = new MetaServico(repositorio, perfilRepositorio);
    perfilRepositorio.buscarPorUsuarioId.mockResolvedValue(fabricarPerfil());
    vi.spyOn(autorizacaoGrupo, 'autorizarPapelNoGrupo').mockResolvedValue(fabricarMembro());
  });

  describe('listar', () => {
    it('lista metas pessoais quando nenhum grupo e informado', async () => {
      repositorio.listar.mockResolvedValue([fabricarMeta()]);

      const resultado = await servico.listar('usuario-1', { situacao: ['ATIVA'] });

      expect(resultado).toHaveLength(1);
      expect(repositorio.listarDeGrupo).not.toHaveBeenCalled();
    });

    it('com contaCompartilhadaId autoriza qualquer membro ativo e usa o escopo de grupo', async () => {
      repositorio.listarDeGrupo.mockResolvedValue([
        fabricarMeta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      ]);

      await servico.listar('usuario-1', { situacao: ['ATIVA'], contaCompartilhadaId: 'grupo-1' });

      expect(autorizacaoGrupo.autorizarPapelNoGrupo).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        [],
      );
      expect(repositorio.listar).not.toHaveBeenCalled();
    });
  });

  describe('buscarPorId', () => {
    it('lanca NaoEncontradoErro quando a meta nao existe', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);
      await expect(servico.buscarPorId('meta-alheia', 'usuario-1')).rejects.toThrow(
        NaoEncontradoErro,
      );
    });

    it('lanca NaoEncontradoErro (nao 403) para meta de outro usuario (RN-51)', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarMeta({ usuarioId: 'outro' }));
      await expect(servico.buscarPorId('meta-1', 'usuario-1')).rejects.toThrow(NaoEncontradoErro);
    });

    it('retorna a meta de grupo quando o usuario e membro ativo', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarMeta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      );

      const dto = await servico.buscarPorId('meta-1', 'usuario-1');

      expect(dto.id).toBe('meta-1');
      expect(autorizacaoGrupo.autorizarPapelNoGrupo).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        [],
      );
    });
  });

  describe('criar', () => {
    it('cria meta pessoal com os dados convertidos', async () => {
      repositorio.criar.mockResolvedValue(fabricarMeta());

      await servico.criar('usuario-1', {
        nome: 'Viagem Chile',
        descricao: null,
        valorAlvo: '1000.00',
        prazoEm: null,
        cor: '#16A34A',
        icone: 'target',
        contaCompartilhadaId: null,
      });

      expect(repositorio.criar).toHaveBeenCalledWith(
        'usuario-1',
        expect.objectContaining({ nome: 'Viagem Chile', prazoEm: null }),
      );
      expect(repositorio.criarDeGrupo).not.toHaveBeenCalled();
    });

    it('com contaCompartilhadaId cria no grupo autorizando so a membresia ativa', async () => {
      repositorio.criarDeGrupo.mockResolvedValue(
        fabricarMeta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      );

      await servico.criar('usuario-1', {
        nome: 'Reforma da cozinha',
        descricao: null,
        valorAlvo: '5000.00',
        prazoEm: null,
        cor: '#16A34A',
        icone: 'target',
        contaCompartilhadaId: 'grupo-1',
      });

      expect(autorizacaoGrupo.autorizarPapelNoGrupo).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        [],
      );
      expect(repositorio.criarDeGrupo).toHaveBeenCalledWith('grupo-1', expect.any(Object));
    });
  });

  describe('atualizar', () => {
    it('atualiza os campos informados', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarMeta());
      repositorio.atualizar.mockResolvedValue(fabricarMeta({ nome: 'Novo nome' }));

      const dto = await servico.atualizar('meta-1', 'usuario-1', { nome: 'Novo nome' });

      expect(dto.nome).toBe('Novo nome');
      expect(repositorio.atualizar).toHaveBeenCalledWith('meta-1', { nome: 'Novo nome' });
    });

    it('rejeita reduzir o valor-alvo abaixo do ja acumulado', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarMeta({ valorAcumulado: new Prisma.Decimal('800.00') }),
      );

      await expect(
        servico.atualizar('meta-1', 'usuario-1', { valorAlvo: '500.00' }),
      ).rejects.toThrow(RegraNegocioErro);
      expect(repositorio.atualizar).not.toHaveBeenCalled();
    });

    it('permite igualar o valor-alvo ao ja acumulado (limite exato)', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarMeta({ valorAcumulado: new Prisma.Decimal('800.00') }),
      );
      repositorio.atualizar.mockResolvedValue(
        fabricarMeta({ valorAlvo: new Prisma.Decimal('800.00') }),
      );

      await servico.atualizar('meta-1', 'usuario-1', { valorAlvo: '800.00' });

      expect(repositorio.atualizar).toHaveBeenCalled();
    });
  });

  describe('excluir', () => {
    it('exclui logicamente a meta do proprio usuario', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarMeta());

      await servico.excluir('meta-1', 'usuario-1');

      expect(repositorio.excluirLogicamente).toHaveBeenCalledWith('meta-1');
    });

    it('lanca NaoEncontradoErro para meta de outro usuario', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarMeta({ usuarioId: 'outro' }));

      await expect(servico.excluir('meta-1', 'usuario-1')).rejects.toThrow(NaoEncontradoErro);
      expect(repositorio.excluirLogicamente).not.toHaveBeenCalled();
    });
  });
});
