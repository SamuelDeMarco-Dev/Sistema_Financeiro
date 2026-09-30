import { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarMovimentacao, fabricarTransferencia, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaConta {
  data: { conta: { saldoAtual: string } };
}

async function saldoViaApi(accessToken: string, contaId: string): Promise<string> {
  const resposta = await request(app)
    .get(`/api/v1/contas/${contaId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  return (resposta.body as RespostaConta).data.conta.saldoAtual;
}

/** Recalculo independente de `ContaRepositorio.calcularSaldoAtual`: busca
 * as linhas cruas com `findMany` (nao o `groupBy` que o repositorio usa)
 * e soma na mao. Nao prova que a RN-01 esta certa (a formula e a mesma —
 * nao ha uma segunda definicao de saldo), mas prova que os DADOS
 * persistidos (excluidoEm, valorPago, situacao apos cada operacao) estao
 * coerentes com o que a API relata, e nao so "consistente consigo mesma"
 * pelo caminho de codigo compartilhado. */
async function saldoRecalculadoDoZero(
  contaId: string,
  saldoInicial: string | Prisma.Decimal,
): Promise<string> {
  const linhas = await prisma.movimentacao.findMany({
    where: {
      contaId,
      excluidoEm: null,
      ehModeloRecorrencia: false,
      situacao: { in: ['PAGA', 'PAGA_PARCIALMENTE'] },
    },
    select: { tipo: true, sentido: true, valorPago: true },
  });

  let saldo = new Prisma.Decimal(saldoInicial);
  for (const linha of linhas) {
    if (linha.tipo === 'RECEITA') saldo = saldo.plus(linha.valorPago);
    else if (linha.tipo === 'DESPESA') saldo = saldo.minus(linha.valorPago);
    else if (linha.sentido === 'ENTRADA') saldo = saldo.plus(linha.valorPago);
    else if (linha.sentido === 'SAIDA') saldo = saldo.minus(linha.valorPago);
  }
  return saldo.toFixed(2);
}

describe('invariante de saldo: 20 movimentacoes variadas + 10 operacoes', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('saldo recalculado do zero coincide com o saldo relatado pela API em cada etapa', async () => {
    const { usuario, accessToken, conta: contaA } = await prepararUsuarioComConta();
    const contaB = await request(app)
      .post('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Conta B', tipo: 'CARTEIRA', saldoInicial: '500.00' });
    const contaBId = (contaB.body as { data: { conta: { id: string } } }).data.conta.id;

    // 20 movimentacoes variadas em contaA — tipos, situacoes, uma excluida
    // logicamente e uma que e o modelo de uma recorrencia (ambas devem
    // ficar de fora do saldo, RN-01/RN-17).
    const m1 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PAGA',
      valor: '200.00',
    });
    const m2 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PAGA',
      valor: '150.00',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PAGA_PARCIALMENTE',
      valor: '300.00',
      valorPago: '100.00',
    });
    const m4 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PENDENTE',
      valor: '500.00',
    });
    const m5 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PAGA',
      valor: '50.00',
    });
    const m6 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PAGA',
      valor: '80.00',
    });
    const m7 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PAGA_PARCIALMENTE',
      valor: '200.00',
      valorPago: '120.00',
    });
    const m8 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PENDENTE',
      valor: '90.00',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'ATRASADA',
      valor: '60.00',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'CANCELADA',
      valor: '40.00',
    });

    const m11 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PAGA',
      valor: '999.00',
    });
    await prisma.movimentacao.update({ where: { id: m11.id }, data: { excluidoEm: new Date() } });

    const m12 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PAGA',
      valor: '999.00',
    });
    await prisma.movimentacao.update({
      where: { id: m12.id },
      data: { ehModeloRecorrencia: true, frequencia: 'MENSAL' },
    });

    const m13 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PAGA',
      valor: '75.00',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PAGA',
      valor: '45.50',
    });
    const m15 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PENDENTE',
      valor: '60.00',
    });
    const m16 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PENDENTE',
      valor: '35.00',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'PAGA_PARCIALMENTE',
      valor: '90.00',
      valorPago: '40.00',
    });
    const m18 = await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'PAGA_PARCIALMENTE',
      valor: '110.00',
      valorPago: '60.00',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'RECEITA',
      situacao: 'ATRASADA',
      valor: '25.00',
    });
    await fabricarMovimentacao(usuario.id, contaA.id, {
      tipo: 'DESPESA',
      situacao: 'CANCELADA',
      valor: '15.00',
    });

    // Uma transferencia efetivada entre as duas contas.
    await fabricarTransferencia(usuario.id, contaA.id, contaBId, { valor: '250.00' });

    // contaA nasce com saldoInicial 0.00 (padrao de prepararUsuarioComConta).
    const saldoAEsperadoAposSetup = '-40.50';
    const saldoBEsperadoAposSetup = '750.00';

    expect(await saldoViaApi(accessToken, contaA.id)).toBe(saldoAEsperadoAposSetup);
    expect(await saldoRecalculadoDoZero(contaA.id, contaA.saldoInicial)).toBe(
      saldoAEsperadoAposSetup,
    );
    expect(await saldoViaApi(accessToken, contaBId)).toBe(saldoBEsperadoAposSetup);
    expect(await saldoRecalculadoDoZero(contaBId, '500.00')).toBe(saldoBEsperadoAposSetup);

    // 10 operacoes via API real: pagar (total e parcial), estornar, editar
    // valor de movimentacao ja paga (RN-15 recalcula valorPago) e excluir.
    await request(app)
      .patch(`/api/v1/movimentacoes/${m4.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    await request(app)
      .patch(`/api/v1/movimentacoes/${m8.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    await request(app)
      .patch(`/api/v1/movimentacoes/${m15.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valorPago: '20.00' });
    await request(app)
      .patch(`/api/v1/movimentacoes/${m1.id}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);
    await request(app)
      .patch(`/api/v1/movimentacoes/${m2.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '180.00' });
    await request(app)
      .delete(`/api/v1/movimentacoes/${m6.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    await request(app)
      .patch(`/api/v1/movimentacoes/${m16.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    await request(app)
      .patch(`/api/v1/movimentacoes/${m7.id}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);
    await request(app)
      .patch(`/api/v1/movimentacoes/${m13.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '100.00' });
    await request(app)
      .delete(`/api/v1/movimentacoes/${m18.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    // Deltas esperados: +500 (m4) -90 (m8) +20 (m15) -200 (m1) +30 (m2)
    // +80 (m6 excluida reverte -80) -35 (m16) +120 (m7 estornada reverte
    // -120) +25 (m13) +60 (m18 excluida reverte -60) = +510.00
    const saldoAEsperadoFinal = '469.50';

    expect(await saldoViaApi(accessToken, contaA.id)).toBe(saldoAEsperadoFinal);
    expect(await saldoRecalculadoDoZero(contaA.id, contaA.saldoInicial)).toBe(saldoAEsperadoFinal);
    // contaB nao foi tocada pelas 10 operacoes — permanece igual ao setup.
    expect(await saldoViaApi(accessToken, contaBId)).toBe(saldoBEsperadoAposSetup);
    expect(await saldoRecalculadoDoZero(contaBId, '500.00')).toBe(saldoBEsperadoAposSetup);

    // Confere tambem que m5 (a unica despesa PAGA original nao tocada)
    // ainda esta intacta — nenhuma operacao vizinha vazou saldo para ela.
    const m5Atual = await prisma.movimentacao.findUniqueOrThrow({ where: { id: m5.id } });
    expect(m5Atual.situacao).toBe('PAGA');
    expect(m5Atual.valorPago.toFixed(2)).toBe('50.00');
  });
});
