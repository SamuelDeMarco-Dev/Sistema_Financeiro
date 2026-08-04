import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { NaoEncontradoErro, RecursoEmUsoErro } from '@/erros';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { ContaServico } from '@/servicos/conta.servico';
import type { ListarContasQuery } from '@/validadores/contas.validador';
import type { Conta } from '@prisma/client';

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

describe('ContaServico', () => {
  let servico: ContaServico;
  let repositorio: MockProxy<ContaRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    servico = new ContaServico(repositorio);
    repositorio.calcularSaldoAtual.mockImplementation((c) => c.saldoInicial);
    repositorio.calcularSaldoPrevisto.mockImplementation((c) => c.saldoInicial);
    repositorio.calcularSaldoConsolidado.mockReturnValue(new Prisma.Decimal('0'));
    repositorio.contarMovimentacoes.mockResolvedValue(0);
  });

  describe('listar', () => {
    it('mapeia contas com saldo, escopo e totalizadores', async () => {
      repositorio.listarPorUsuario.mockResolvedValue([fabricarConta()]);
      repositorio.calcularSaldoConsolidado.mockReturnValue(new Prisma.Decimal('1000.00'));

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
      repositorio.buscarPorId.mockResolvedValue(fabricarConta());

      const resultado = await servico.buscarPorId('conta-1', USUARIO);

      expect(resultado.id).toBe('conta-1');
    });

    it('lanca NaoEncontradoErro quando a conta nao existe ou e de outro usuario (RN-51)', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

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
    it('lanca NaoEncontradoErro quando a conta nao pertence ao usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(servico.atualizar('conta-1', USUARIO, { nome: 'Novo nome' })).rejects.toThrow(
        NaoEncontradoErro,
      );
      expect(repositorio.atualizar).not.toHaveBeenCalled();
    });

    it('so envia ao repositorio os campos presentes no corpo', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarConta());
      repositorio.atualizar.mockResolvedValue(fabricarConta({ nome: 'Novo nome' }));

      await servico.atualizar('conta-1', USUARIO, { nome: 'Novo nome' });

      expect(repositorio.atualizar).toHaveBeenCalledWith('conta-1', { nome: 'Novo nome' });
    });
  });

  describe('arquivar / desarquivar', () => {
    it('arquivar verifica posse antes de arquivar', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarConta());
      repositorio.arquivar.mockResolvedValue(fabricarConta({ arquivadaEm: new Date() }));

      const resultado = await servico.arquivar('conta-1', USUARIO);

      expect(resultado.arquivada).toBe(true);
    });

    it('desarquivar verifica posse antes de desarquivar', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarConta({ arquivadaEm: new Date() }));
      repositorio.desarquivar.mockResolvedValue(fabricarConta({ arquivadaEm: null }));

      const resultado = await servico.desarquivar('conta-1', USUARIO);

      expect(resultado.arquivada).toBe(false);
    });

    it('arquivar lanca NaoEncontradoErro para conta de outro usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

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
      repositorio.buscarPorId.mockResolvedValue(fabricarConta());
      repositorio.contarMovimentacoes.mockResolvedValue(0);

      await servico.excluir('conta-1', 'usuario-1');

      expect(repositorio.excluirLogicamente).toHaveBeenCalledWith('conta-1');
    });

    it('lanca RecursoEmUsoErro quando ha movimentacoes vinculadas', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarConta());
      repositorio.contarMovimentacoes.mockResolvedValue(87);

      await expect(servico.excluir('conta-1', 'usuario-1')).rejects.toThrow(RecursoEmUsoErro);
      expect(repositorio.excluirLogicamente).not.toHaveBeenCalled();
    });

    it('lanca NaoEncontradoErro para conta de outro usuario', async () => {
      repositorio.buscarPorId.mockResolvedValue(null);

      await expect(servico.excluir('conta-alheia', 'usuario-1')).rejects.toThrow(NaoEncontradoErro);
    });
  });
});
