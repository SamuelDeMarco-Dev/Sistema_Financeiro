import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import {
  fabricarCategoria,
  fabricarConta,
  fabricarUsuario,
  prepararUsuarioComConta,
} from '../fabricas';

const app = criarServidor();

interface RespostaMovimentacao {
  data: { movimentacao: Record<string, unknown> };
}
interface RespostaErro {
  codigo: string;
  errors?: { campo: string; mensagem: string }[];
}
interface RespostaConta {
  data: { conta: { saldoAtual: string } };
}

async function criarMovimentacao(
  accessToken: string,
  corpo: Record<string, unknown>,
): Promise<{ id: string }> {
  const resposta = await request(app)
    .post('/api/v1/movimentacoes')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(corpo);
  return (resposta.body as RespostaMovimentacao).data.movimentacao as { id: string };
}

async function saldoAtual(accessToken: string, contaId: string): Promise<string> {
  const resposta = await request(app)
    .get(`/api/v1/contas/${contaId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  return (resposta.body as RespostaConta).data.conta.saldoAtual;
}

describe('PATCH /api/v1/movimentacoes/:id/pagar e /estornar', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('pagar integralmente uma despesa pendente reduz o saldo pelo valor total (RN-14)', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Conta de luz',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-08-05' });

    expect(resposta.status).toBe(200);
    const dto = (resposta.body as RespostaMovimentacao).data.movimentacao;
    expect(dto.situacao).toBe('PAGA');
    expect(dto.valorPago).toBe('100.00');
    expect(await saldoAtual(accessToken, conta.id)).toBe(
      conta.saldoInicial.minus('100.00').toFixed(2),
    );
  });

  it('pagar sem informar dataEfetivacao usa hoje no timezone do perfil', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Assinatura',
      valor: '50.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(resposta.status).toBe(200);
    const dto = (resposta.body as RespostaMovimentacao).data.movimentacao;
    expect(dto.dataEfetivacao).not.toBeNull();
  });

  it('pagamento parcial de 30 em 100 reduz o saldo em 30 e resulta em PAGA_PARCIALMENTE (RN-03)', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Fatura',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-08-05', valorPago: '30.00' });

    expect(resposta.status).toBe(200);
    const dto = (resposta.body as RespostaMovimentacao).data.movimentacao;
    expect(dto.situacao).toBe('PAGA_PARCIALMENTE');
    expect(dto.valorPago).toBe('30.00');
    expect(await saldoAtual(accessToken, conta.id)).toBe(
      conta.saldoInicial.minus('30.00').toFixed(2),
    );
  });

  it('pagamento adicional de 70 sobre um PAGA_PARCIALMENTE de 30/100 completa para PAGA (reducao total de 100)', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Fatura',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-08-05', valorPago: '30.00' });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-08-06', valorPago: '70.00' });

    expect(resposta.status).toBe(200);
    const dto = (resposta.body as RespostaMovimentacao).data.movimentacao;
    expect(dto.situacao).toBe('PAGA');
    expect(dto.valorPago).toBe('100.00');
    expect(await saldoAtual(accessToken, conta.id)).toBe(
      conta.saldoInicial.minus('100.00').toFixed(2),
    );
  });

  it('valorPago maior que o valor total responde 422', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Fatura',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valorPago: '150.00' });

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('pagar uma movimentacao ja PAGA responde 422 na segunda tentativa', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Fatura',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('pagar uma movimentacao CANCELADA responde 422', async () => {
    const { accessToken, usuario, conta, categoria } = await prepararUsuarioComConta();
    const cancelada = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        categoriaId: categoria.id,
        tipo: 'DESPESA',
        descricao: 'Cancelada',
        valor: '50.00',
        valorPago: '0.00',
        situacao: 'CANCELADA',
        dataCompetencia: new Date('2026-08-05'),
        dataVencimento: new Date('2026-08-05'),
      },
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${cancelada.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('estornar devolve o saldo ao estado anterior exatamente', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Fatura',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });
    const saldoAntes = await saldoAtual(accessToken, conta.id);

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    const estorno = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(estorno.status).toBe(200);
    const dto = (estorno.body as RespostaMovimentacao).data.movimentacao;
    expect(dto.situacao).toBe('PENDENTE');
    expect(dto.valorPago).toBe('0.00');
    expect(dto.dataEfetivacao).toBeNull();
    expect(await saldoAtual(accessToken, conta.id)).toBe(saldoAntes);
  });

  it('estornar uma movimentacao PENDENTE (nunca paga) responde 422', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Ainda pendente',
      valor: '40.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('sequencia criar -> pagar parcial -> completar -> estornar -> pagar preserva a invariante de saldo em cada passo', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const saldoInicial = conta.saldoInicial.toFixed(2);
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Sequencia de invariante',
      valor: '100.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
    });
    expect(await saldoAtual(accessToken, conta.id)).toBe(saldoInicial);

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valorPago: '30.00' });
    expect(await saldoAtual(accessToken, conta.id)).toBe(
      conta.saldoInicial.minus('30.00').toFixed(2),
    );

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valorPago: '70.00' });
    expect(await saldoAtual(accessToken, conta.id)).toBe(
      conta.saldoInicial.minus('100.00').toFixed(2),
    );

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(await saldoAtual(accessToken, conta.id)).toBe(saldoInicial);

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    expect(await saldoAtual(accessToken, conta.id)).toBe(
      conta.saldoInicial.minus('100.00').toFixed(2),
    );
  });

  it('pagar e estornar uma transferencia respondem 422 (rota propria em /transferencias)', async () => {
    const { accessToken, usuario, conta, categoria } = await prepararUsuarioComConta();
    const transferencia = await prisma.movimentacao.create({
      data: {
        usuarioId: usuario.id,
        contaId: conta.id,
        categoriaId: categoria.id,
        tipo: 'TRANSFERENCIA',
        descricao: 'Transferencia entre contas',
        valor: '20.00',
        valorPago: '20.00',
        situacao: 'PAGA',
        dataCompetencia: new Date('2026-08-05'),
        dataVencimento: new Date('2026-08-05'),
        dataEfetivacao: new Date('2026-08-05'),
        sentido: 'SAIDA',
        transferenciaId: 'transferencia-fabricada-nos-testes',
      },
    });

    const pagar = await request(app)
      .patch(`/api/v1/movimentacoes/${transferencia.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    const estornar = await request(app)
      .patch(`/api/v1/movimentacoes/${transferencia.id}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(pagar.status).toBe(422);
    expect(estornar.status).toBe(422);
  });

  it('pagar e estornar uma movimentacao de outro usuario respondem 404', async () => {
    const outroUsuario = await fabricarUsuario();
    const contaDeOutro = await fabricarConta(outroUsuario.usuario.id);
    const categoriaDeOutro = await fabricarCategoria(outroUsuario.usuario.id);
    const movimentacaoDeOutro = await prisma.movimentacao.create({
      data: {
        usuarioId: outroUsuario.usuario.id,
        contaId: contaDeOutro.id,
        categoriaId: categoriaDeOutro.id,
        tipo: 'DESPESA',
        descricao: 'Nao e minha',
        valor: '10.00',
        valorPago: '0.00',
        situacao: 'PENDENTE',
        dataCompetencia: new Date('2026-08-05'),
        dataVencimento: new Date('2026-08-05'),
      },
    });

    const { accessToken } = await prepararUsuarioComConta();

    const pagar = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoDeOutro.id}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    const estornar = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoDeOutro.id}/estornar`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(pagar.status).toBe(404);
    expect(estornar.status).toBe(404);
  });
});
