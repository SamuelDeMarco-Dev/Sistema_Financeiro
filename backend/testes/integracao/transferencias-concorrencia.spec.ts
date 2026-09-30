import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarConta, prepararUsuarioComConta } from '../fabricas';

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

describe('concorrencia: duas transferencias simultaneas na mesma conta', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('duas transferencias de saida disparadas em paralelo resultam no saldo correto, sem escrita perdida', async () => {
    const { usuario, accessToken, conta: contaOrigem } = await prepararUsuarioComConta();
    const contaDestinoA = await fabricarConta(usuario.id, { nome: 'Destino A' });
    const contaDestinoB = await fabricarConta(usuario.id, { nome: 'Destino B' });

    const [respostaA, respostaB] = await Promise.all([
      request(app)
        .post('/api/v1/transferencias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contaOrigemId: contaOrigem.id,
          contaDestinoId: contaDestinoA.id,
          valor: '30.00',
          data: '2026-08-06',
        }),
      request(app)
        .post('/api/v1/transferencias')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          contaOrigemId: contaOrigem.id,
          contaDestinoId: contaDestinoB.id,
          valor: '45.00',
          data: '2026-08-06',
        }),
    ]);

    expect(respostaA.status).toBe(201);
    expect(respostaB.status).toBe(201);

    // Nenhuma escrita perdida: as duas saidas descontam da mesma conta —
    // se uma das transacoes tivesse sobrescrito a outra (race no saldo),
    // o total refletiria so uma delas.
    const saldoOrigem = await saldoViaApi(accessToken, contaOrigem.id);
    expect(saldoOrigem).toBe(contaOrigem.saldoInicial.minus('75.00').toFixed(2));

    const [saldoA, saldoB] = await Promise.all([
      saldoViaApi(accessToken, contaDestinoA.id),
      saldoViaApi(accessToken, contaDestinoB.id),
    ]);
    expect(saldoA).toBe('30.00');
    expect(saldoB).toBe('45.00');

    // As quatro pernas (2 transferencias x SAIDA/ENTRADA) existem, cada
    // uma com transferenciaId proprio — confirma que nao houve colisao
    // nem sobrescrita de uma transferencia pela outra.
    const pernas = await prisma.movimentacao.findMany({
      where: { usuarioId: usuario.id, tipo: 'TRANSFERENCIA' },
      select: { transferenciaId: true, sentido: true, valor: true },
    });
    expect(pernas).toHaveLength(4);
    expect(new Set(pernas.map((perna) => perna.transferenciaId)).size).toBe(2);
  });
});
