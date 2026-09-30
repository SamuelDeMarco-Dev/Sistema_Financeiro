import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { limparBanco } from '../configuracao/banco-teste';
import {
  fabricarConta,
  fabricarMovimentacao,
  fabricarTransferencia,
  fabricarUsuario,
} from '../fabricas';

interface LinhaPlano {
  'QUERY PLAN': string;
}

const repositorio = new ContaRepositorio();

// Issue #46: vw_saldo_conta substitui o groupBy manual de RN-01/RN-02/RN-03
// dentro de ContaRepositorio — este teste garante que a troca de mecanismo
// nao mudou o resultado (regressao) e que o plano de consulta continua
// usando o indice parcial, nao um Seq Scan.
describe('vw_saldo_conta (issue #46)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('saldo da view confere com a soma manual: receita, despesa, pagamento parcial e transferencia', async () => {
    const { usuario } = await fabricarUsuario();
    const contaA = await fabricarConta(usuario.id, { saldoInicial: '500.00' });
    const contaB = await fabricarConta(usuario.id, { saldoInicial: '0.00' });

    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      valor: '200.00',
      situacao: 'PAGA',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      valor: '300.00',
      valorPago: '100.00',
      situacao: 'PAGA_PARCIALMENTE',
    });
    // RN-04: pendente nao afeta o saldo atual, so o previsto.
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      valor: '999.00',
      situacao: 'PENDENTE',
    });
    await fabricarTransferencia(usuario.id, contaA.id, contaB.id, { valor: '150.00' });

    // saldoInicial 500 + receita 1000 - despesa 200 - parcial 100 (valorPago) - transferencia 150
    const saldoContaA = await repositorio.calcularSaldoAtual(contaA);
    expect(saldoContaA.toFixed(2)).toBe('1050.00');
    // saldoInicial 0 + transferencia recebida 150
    const saldoContaB = await repositorio.calcularSaldoAtual(contaB);
    expect(saldoContaB.toFixed(2)).toBe('150.00');
  });

  it('exclui movimentacoes excluidas, canceladas e modelos de recorrencia do saldo', async () => {
    const { usuario } = await fabricarUsuario();
    const conta = await fabricarConta(usuario.id, { saldoInicial: '100.00' });

    const excluida = await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '5000.00',
      situacao: 'PAGA',
    });
    await prisma.movimentacao.update({
      where: { id: excluida.id },
      data: { excluidoEm: new Date() },
    });

    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '3000.00',
      situacao: 'CANCELADA',
    });

    const modelo = await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '80.00',
      situacao: 'PAGA',
    });
    await prisma.movimentacao.update({
      where: { id: modelo.id },
      data: { ehModeloRecorrencia: true, frequencia: 'MENSAL', intervaloRecorrencia: 1 },
    });

    const saldo = await repositorio.calcularSaldoAtual(conta);
    expect(saldo.toFixed(2)).toBe('100.00');
  });

  describe('desempenho e plano de execucao com 5000 movimentacoes', () => {
    let contaId: string;

    beforeAll(async () => {
      await limparBanco();
      const { usuario } = await fabricarUsuario({ email: 'saldo-explain@exemplo.com' });
      const conta = await fabricarConta(usuario.id, { saldoInicial: '0.00' });
      contaId = conta.id;

      const TOTAL_LINHAS = 5000;
      const linhas = Array.from({ length: TOTAL_LINHAS }, (_, indice) => {
        const efetivada = indice % 3 !== 2;
        return {
          usuarioId: usuario.id,
          contaId,
          tipo: indice % 2 === 0 ? ('RECEITA' as const) : ('DESPESA' as const),
          descricao: `Movimentação de carga ${indice}`,
          valor: new Prisma.Decimal('10.00'),
          valorPago: new Prisma.Decimal(efetivada ? '10.00' : '0.00'),
          situacao: efetivada ? ('PAGA' as const) : ('PENDENTE' as const),
          dataCompetencia: new Date(Date.UTC(2026, indice % 12, 1)),
          dataEfetivacao: efetivada ? new Date(Date.UTC(2026, indice % 12, 1)) : null,
        };
      });
      await prisma.movimentacao.createMany({ data: linhas });
    }, 30_000);

    afterAll(async () => {
      await limparBanco();
    });

    it('nao usa Seq Scan em movimentacoes ao consultar vw_saldo_conta', async () => {
      const plano = await prisma.$queryRaw<LinhaPlano[]>`
        EXPLAIN ANALYZE
        SELECT saldo_atual FROM vw_saldo_conta WHERE conta_id = ${contaId}
      `;

      const texto = plano.map((linha) => linha['QUERY PLAN']).join('\n');
      expect(texto).not.toMatch(/Seq Scan on movimentacoes/i);
    });

    it('responde em menos de 80ms', async () => {
      const inicio = performance.now();
      await repositorio.calcularSaldoAtual({ id: contaId, saldoInicial: new Prisma.Decimal(0) });
      const duracaoMs = performance.now() - inicio;

      expect(duracaoMs).toBeLessThan(80);
    });
  });
});
