import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NaoEncontradoErro, PapelInsuficienteErro, RecursoEmUsoErro } from '@/erros';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { ContaCompartilhadaServico } from '@/servicos/conta-compartilhada.servico';
import { ContaServico } from '@/servicos/conta.servico';
import type { ListarContasQuery } from '@/validadores/contas.validador';
import type { Conta, ContaCompartilhada, MembroCompartilhado } from '@prisma/client';

vi.mock('@/banco/transacao', () => ({
  executarTransacao: vi.fn((fn: (tx: undefined) => Promise<unknown>) => fn(undefined)),
}));

const USUARIO = { id: 'usuario-1', nome: 'Samuel De Marco' };

function fabricarConta(sobrescritas: Partial<Conta> = {}): Conta {
  return {
    id: 'conta-1',
    usuarioId: 'usuario-1',
    contaCompartilhadaId: null,
    nome: 'Banco Principal',
    tipo: 'CONTA_CORRENTE',
    instituicao: null,
    saldoInicial: new Prisma.Decimal('1000.00'),
    moeda: 'BRL',
    cor: '#2563EB',
    icone: 'wallet',
    incluirNoSaldoTotal: true,
    ordem: 0,
    arquivadaEm: null,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    excluidoEm: null,
    ...sobrescritas,
  };
}

const FILTROS_PADRAO: ListarContasQuery = {
  incluirArquivadas: false,
  ordenarPor: 'ordem',
  ordem: 'asc',
};

function fabricarGrupo(sobrescritas: Partial<ContaCompartilhada> = {}): ContaCompartilhada {
  return {
    id: 'grupo-1',
    nome: 'Casa',
    descricao: null,
    imagemUrl: null,
    moeda: 'BRL',
    cor: '#2563EB',
    permiteParticipanteEditarProprias: true,
    criadoPorId: 'usuario-1',
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T00:00:00.000Z'),
    excluidoEm: null,
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

describe('ContaServico', () => {
  let servico: ContaServico;
  let repositorio: MockProxy<ContaRepositorio>;
  let contaCompartilhadaServico: MockProxy<ContaCompartilhadaServico>;

  beforeEach(() => {
    repositorio = mock();
    contaCompartilhadaServico = mock();
    servico = new ContaServico(repositorio, contaCompartilhadaServico);
    repositorio.calcularSaldoAtual.mockImplementation((c) => Promise.resolve(c.saldoInicial));
    repositorio.calcularSaldoPrevisto.mockImplementation((c) => Promise.resolve(c.saldoInicial));
    repositorio.calcularSaldoConsolidado.mockResolvedValue(new Prisma.Decimal('0'));
    repositorio.contarMovimentacoes.mockResolvedValue(0);
    contaCompartilhadaServico.autorizarPapel.mockResolvedValue(fabricarMembro());
    contaCompartilhadaServico.buscarGrupoOuFalhar.mockResolvedValue(fabricarGrupo());
  });

  describe('listar', () => {
    it('mapeia contas com saldo, escopo e totalizadores', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([fabricarConta()]);
      repositorio.calcularSaldoConsolidado.mockResolvedValue(new Prisma.Decimal('1000.00'));

      const resultado = await servico.listar(USUARIO, FILTROS_PADRAO);

      expect(resultado.contas).toHaveLength(1);
      expect(resultado.contas[0]?.escopo).toEqual({
        tipo: 'PESSOAL',
        id: 'usuario-1',
        nome: 'Samuel De Marco',
      });
      expect(resultado.totalizadores.saldoTotal.toFixed(2)).toBe('1000.00');
      expect(resultado.totalizadores.quantidadeContas).toBe(1);
    });

    it('ordena por nome respeitando a direcao', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([
        fabricarConta({ id: 'b', nome: 'Poupança' }),
        fabricarConta({ id: 'a', nome: 'Carteira' }),
      ]);

      const resultado = await servico.listar(USUARIO, {
        ...FILTROS_PADRAO,
        ordenarPor: 'nome',
        ordem: 'asc',
      });

      expect(resultado.contas.map((c) => c.nome)).toEqual(['Carteira', 'Poupança']);
    });

    it('ordena por nome descendente', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([
        fabricarConta({ id: 'a', nome: 'Carteira' }),
        fabricarConta({ id: 'b', nome: 'Poupança' }),
      ]);

      const resultado = await servico.listar(USUARIO, {
        ...FILTROS_PADRAO,
        ordenarPor: 'nome',
        ordem: 'desc',
      });

      expect(resultado.contas.map((c) => c.nome)).toEqual(['Poupança', 'Carteira']);
    });

    it('ordena por saldoAtual', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([
        fabricarConta({ id: 'a', saldoInicial: new Prisma.Decimal('500.00') }),
        fabricarConta({ id: 'b', saldoInicial: new Prisma.Decimal('100.00') }),
      ]);

      const resultado = await servico.listar(USUARIO, {
        ...FILTROS_PADRAO,
        ordenarPor: 'saldoAtual',
        ordem: 'asc',
      });

      expect(resultado.contas.map((c) => c.saldoAtual.toFixed(2))).toEqual(['100.00', '500.00']);
    });

    it('repassa os filtros de tipo e incluirArquivadas ao repositorio', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([]);

      await servico.listar(USUARIO, {
        ...FILTROS_PADRAO,
        tipo: ['CARTEIRA'],
        incluirArquivadas: true,
      });

      expect(repositorio.listarPorUsuario).toHaveBeenCalledWith('usuario-1', {
        tipos: ['CARTEIRA'],
        incluirArquivadas: true,
      });
    });
  });

  describe('listarResumo', () => {
    it('delega ao repositorio', async () => {
      repositorio.listarResumoPorUsuario.mockResolvedValue([]);

      await servico.listarResumo('usuario-1');

      expect(repositorio.listarResumoPorUsuario).toHaveBeenCalledWith('usuario-1');
    });
  });

  describe('buscarPorId', () => {
    it('devolve a conta mapeada quando encontrada', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarConta());

      const resultado = await servico.buscarPorId('conta-1', USUARIO);

      expect(resultado.id).toBe('conta-1');
    });

    it('lanca NaoEncontradoErro quando a conta nao existe', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);

      await expect(servico.buscarPorId('conta-alheia', USUARIO)).rejects.toThrow(NaoEncontradoErro);
    });

    it('lanca NaoEncontradoErro (RN-51) quando a conta pertence a outro usuario', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarConta({ usuarioId: 'outro-usuario' }),
      );

      await expect(servico.buscarPorId('conta-alheia', USUARIO)).rejects.toThrow(NaoEncontradoErro);
    });
  });

  describe('criar', () => {
    it('converte saldoInicial para Decimal e usa null quando instituicao nao vem', async () => {
      repositorio.criar.mockResolvedValue(fabricarConta());

      await servico.criar(USUARIO, {
        nome: 'Banco Principal',
        tipo: 'CONTA_CORRENTE',
        saldoInicial: '1000.00',
        cor: '#2563EB',
        icone: 'wallet',
        incluirNoSaldoTotal: true,
      });

      const chamada = repositorio.criar.mock.calls[0]?.[1];
      expect(chamada).toMatchObject({
        nome: 'Banco Principal',
        tipo: 'CONTA_CORRENTE',
        instituicao: null,
        cor: '#2563EB',
        icone: 'wallet',
        incluirNoSaldoTotal: true,
      });
      expect(chamada?.saldoInicial.toFixed(2)).toBe('1000.00');
    });

    it('aceita saldoInicial negativo (cheque especial)', async () => {
      repositorio.criar.mockResolvedValue(fabricarConta({ saldoInicial: new Prisma.Decimal(-50) }));

      await servico.criar(USUARIO, {
        nome: 'Cheque especial',
        tipo: 'CONTA_CORRENTE',
        saldoInicial: '-50.00',
        cor: '#2563EB',
        icone: 'wallet',
        incluirNoSaldoTotal: true,
      });

      const chamada = repositorio.criar.mock.calls[0]?.[1];
      expect(chamada?.saldoInicial.toFixed(2)).toBe('-50.00');
    });
  });

  describe('atualizar', () => {
    it('lanca NaoEncontradoErro quando a conta nao existe', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);

      await expect(servico.atualizar('conta-1', USUARIO, { nome: 'Novo nome' })).rejects.toThrow(
        NaoEncontradoErro,
      );
      expect(repositorio.atualizar).not.toHaveBeenCalled();
    });

    it('so envia ao repositorio os campos presentes no corpo', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarConta());
      repositorio.atualizar.mockResolvedValue(fabricarConta({ nome: 'Novo nome' }));

      await servico.atualizar('conta-1', USUARIO, { nome: 'Novo nome' });

      expect(repositorio.atualizar).toHaveBeenCalledWith('conta-1', { nome: 'Novo nome' });
    });
  });

  describe('arquivar / desarquivar', () => {
    it('arquivar verifica posse antes de arquivar', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarConta());
      repositorio.arquivar.mockResolvedValue(fabricarConta({ arquivadaEm: new Date() }));

      const resultado = await servico.arquivar('conta-1', USUARIO);

      expect(resultado.arquivada).toBe(true);
    });

    it('desarquivar verifica posse antes de desarquivar', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarConta({ arquivadaEm: new Date() }),
      );
      repositorio.desarquivar.mockResolvedValue(fabricarConta({ arquivadaEm: null }));

      const resultado = await servico.desarquivar('conta-1', USUARIO);

      expect(resultado.arquivada).toBe(false);
    });

    it('arquivar lanca NaoEncontradoErro para conta inexistente', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);

      await expect(servico.arquivar('conta-alheia', USUARIO)).rejects.toThrow(NaoEncontradoErro);
    });
  });

  describe('reordenar', () => {
    it('reordena quando todas as contas pertencem ao usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarConta());

      await servico.reordenar('usuario-1', {
        ordens: [
          { id: 'conta-1', ordem: 1 },
          { id: 'conta-2', ordem: 0 },
        ],
      });

      expect(repositorio.reordenar).toHaveBeenCalledWith(
        [
          { id: 'conta-1', ordem: 1 },
          { id: 'conta-2', ordem: 0 },
        ],
        undefined,
      );
    });

    it('lanca NaoEncontradoErro e nao reordena nada se uma conta for de outro usuario', async () => {
      repositorio.buscarPorId.mockResolvedValueOnce(fabricarConta()).mockResolvedValueOnce(null);

      await expect(
        servico.reordenar('usuario-1', {
          ordens: [
            { id: 'conta-1', ordem: 0 },
            { id: 'conta-alheia', ordem: 1 },
          ],
        }),
      ).rejects.toThrow(NaoEncontradoErro);
      expect(repositorio.reordenar).not.toHaveBeenCalled();
    });
  });

  describe('excluir', () => {
    it('exclui logicamente quando nao ha movimentacoes', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarConta());
      repositorio.contarMovimentacoes.mockResolvedValue(0);

      await servico.excluir('conta-1', USUARIO);

      expect(repositorio.excluirLogicamente).toHaveBeenCalledWith('conta-1');
    });

    it('lanca RecursoEmUsoErro quando ha movimentacoes vinculadas', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(fabricarConta());
      repositorio.contarMovimentacoes.mockResolvedValue(87);

      await expect(servico.excluir('conta-1', USUARIO)).rejects.toThrow(RecursoEmUsoErro);
      expect(repositorio.excluirLogicamente).not.toHaveBeenCalled();
    });

    it('lanca NaoEncontradoErro para conta inexistente', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(null);

      await expect(servico.excluir('conta-alheia', USUARIO)).rejects.toThrow(NaoEncontradoErro);
    });
  });

  describe('escopo de grupo (issue #72)', () => {
    it('criar com contaCompartilhadaId autoriza ADMINISTRADOR e usa a moeda do grupo', async () => {
      contaCompartilhadaServico.buscarGrupoOuFalhar.mockResolvedValue(
        fabricarGrupo({ moeda: 'USD' }),
      );
      repositorio.criarDeGrupo.mockResolvedValue(
        fabricarConta({ usuarioId: null, contaCompartilhadaId: 'grupo-1', moeda: 'USD' }),
      );

      const resultado = await servico.criar(USUARIO, {
        nome: 'Caixa da Casa',
        tipo: 'CARTEIRA',
        saldoInicial: '0.00',
        cor: '#2563EB',
        icone: 'wallet',
        incluirNoSaldoTotal: true,
        contaCompartilhadaId: 'grupo-1',
      });

      expect(contaCompartilhadaServico.autorizarPapel).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        ['ADMINISTRADOR'],
      );
      expect(repositorio.criarDeGrupo).toHaveBeenCalledWith(
        'grupo-1',
        expect.objectContaining({ moeda: 'USD' }),
      );
      expect(resultado.escopo).toEqual({ tipo: 'GRUPO', id: 'grupo-1', nome: 'Casa' });
      expect(resultado.moeda).toBe('USD');
    });

    it('criar com contaCompartilhadaId propaga PapelInsuficienteErro para nao-administrador', async () => {
      contaCompartilhadaServico.autorizarPapel.mockRejectedValue(
        new PapelInsuficienteErro('Seu papel no grupo nao permite esta acao.'),
      );

      await expect(
        servico.criar(USUARIO, {
          nome: 'Caixa da Casa',
          tipo: 'CARTEIRA',
          saldoInicial: '0.00',
          cor: '#2563EB',
          icone: 'wallet',
          incluirNoSaldoTotal: true,
          contaCompartilhadaId: 'grupo-1',
        }),
      ).rejects.toThrow(PapelInsuficienteErro);
      expect(repositorio.criarDeGrupo).not.toHaveBeenCalled();
    });

    it('listar com contaCompartilhadaId autoriza qualquer membro ativo e usa listarPorGrupo', async () => {
      repositorio.listarPorGrupo.mockResolvedValue([
        fabricarConta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      ]);

      const resultado = await servico.listar(USUARIO, {
        ...FILTROS_PADRAO,
        contaCompartilhadaId: 'grupo-1',
      });

      expect(contaCompartilhadaServico.autorizarPapel).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        [],
      );
      expect(repositorio.listarPorGrupo).toHaveBeenCalled();
      expect(repositorio.listarPorUsuario).not.toHaveBeenCalled();
      expect(resultado.contas[0]?.escopo).toEqual({ tipo: 'GRUPO', id: 'grupo-1', nome: 'Casa' });
    });

    it('buscarPorId de uma conta de grupo autoriza qualquer membro ativo (leitura)', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarConta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      );

      const resultado = await servico.buscarPorId('conta-1', USUARIO);

      expect(contaCompartilhadaServico.autorizarPapel).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        [],
      );
      expect(resultado.escopo).toEqual({ tipo: 'GRUPO', id: 'grupo-1', nome: 'Casa' });
    });

    it('atualizar uma conta de grupo exige papel ADMINISTRADOR', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarConta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      );
      repositorio.atualizar.mockResolvedValue(
        fabricarConta({ usuarioId: null, contaCompartilhadaId: 'grupo-1', nome: 'Novo nome' }),
      );

      await servico.atualizar('conta-1', USUARIO, { nome: 'Novo nome' });

      expect(contaCompartilhadaServico.autorizarPapel).toHaveBeenCalledWith(
        'grupo-1',
        'usuario-1',
        ['ADMINISTRADOR'],
      );
    });

    it('nao membro do grupo da conta recebe NaoEncontradoErro (RN-51), nunca 403', async () => {
      repositorio.buscarPorIdSemEscopo.mockResolvedValue(
        fabricarConta({ usuarioId: null, contaCompartilhadaId: 'grupo-1' }),
      );
      contaCompartilhadaServico.autorizarPapel.mockRejectedValue(
        new NaoEncontradoErro('Conta compartilhada nao encontrada.'),
      );

      await expect(servico.buscarPorId('conta-1', USUARIO)).rejects.toThrow(NaoEncontradoErro);
    });
  });
});
