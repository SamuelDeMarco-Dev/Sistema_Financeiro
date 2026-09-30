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
  message: string;
  errors?: { campo: string; mensagem: string }[];
}

function corpoValido(sobrescritas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    tipo: 'DESPESA',
    descricao: 'Mercado do mes',
    valor: '487.90',
    dataCompetencia: '2026-07-15',
    ...sobrescritas,
  };
}

describe('/api/v1/movimentacoes', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cria uma despesa com todos os campos previstos', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        corpoValido({
          observacao: 'Compra grande',
          contaId: conta.id,
          categoriaId: categoria.id,
          dataVencimento: '2026-07-16',
          etiquetaIds: [],
        }),
      );

    expect(resposta.status).toBe(201);
    const { movimentacao } = (resposta.body as RespostaMovimentacao).data;
    expect(movimentacao).toMatchObject({
      tipo: 'DESPESA',
      descricao: 'Mercado do mes',
      observacao: 'Compra grande',
      valor: '487.90',
      valorPago: '0.00',
      situacao: 'PENDENTE',
      dataCompetencia: '2026-07-15',
      dataVencimento: '2026-07-16',
      dataEfetivacao: null,
      conta: { id: conta.id },
      contaCompartilhada: null,
      categoria: { id: categoria.id },
      cartao: null,
      fatura: null,
      etiquetas: [],
      transferencia: null,
      recorrencia: null,
      parcelamento: null,
      quantidadeAnexos: 0,
    });
    expect((movimentacao.autor as { id: string }).id).toBeTruthy();
  });

  it('cria uma receita paga e o saldo da conta aumenta exatamente pelo valor', async () => {
    const { accessToken, conta, usuario } = await prepararUsuarioComConta();
    const categoriaReceita = await fabricarCategoria(usuario.id, { tipo: 'RECEITA' });

    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        corpoValido({
          tipo: 'RECEITA',
          valor: '5400.00',
          contaId: conta.id,
          categoriaId: categoriaReceita.id,
          situacao: 'PAGA',
          dataEfetivacao: '2026-07-15',
        }),
      );

    const respostaConta = await request(app)
      .get(`/api/v1/contas/${conta.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const saldoAtual = (respostaConta.body as { data: { conta: { saldoAtual: string } } }).data
      .conta.saldoAtual;
    expect(saldoAtual).toBe(conta.saldoInicial.plus('5400.00').toFixed(2));
  });

  it('criar despesa PAGA reduz o saldo da conta exatamente pelo valor', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        corpoValido({
          valor: '100.00',
          contaId: conta.id,
          categoriaId: categoria.id,
          situacao: 'PAGA',
          dataEfetivacao: '2026-07-15',
        }),
      );

    const respostaConta = await request(app)
      .get(`/api/v1/contas/${conta.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const saldoAtual = (respostaConta.body as { data: { conta: { saldoAtual: string } } }).data
      .conta.saldoAtual;
    expect(saldoAtual).toBe(conta.saldoInicial.minus('100.00').toFixed(2));
  });

  it('categoria de RECEITA em despesa responde 422 CATEGORIA_INCOMPATIVEL nomeando a categoria', async () => {
    const { accessToken, conta, usuario } = await prepararUsuarioComConta();
    const categoriaReceita = await fabricarCategoria(usuario.id, {
      nome: 'Salário',
      tipo: 'RECEITA',
    });

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: conta.id, categoriaId: categoriaReceita.id }));

    expect(resposta.status).toBe(422);
    const corpo = resposta.body as RespostaErro;
    expect(corpo.codigo).toBe('CATEGORIA_INCOMPATIVEL');
    expect(corpo.errors?.[0]?.mensagem).toContain('Salário');
  });

  it('categoria AMBOS aceita receita e despesa', async () => {
    const { accessToken, conta, usuario } = await prepararUsuarioComConta();
    const categoriaAmbos = await fabricarCategoria(usuario.id, { tipo: 'AMBOS' });

    const despesa = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: conta.id, categoriaId: categoriaAmbos.id }));
    const receita = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ tipo: 'RECEITA', contaId: conta.id, categoriaId: categoriaAmbos.id }));

    expect(despesa.status).toBe(201);
    expect(receita.status).toBe(201);
  });

  it('conta de outro usuario responde 404', async () => {
    const { accessToken, categoria } = await prepararUsuarioComConta();
    const outroUsuario = await fabricarUsuario();
    const contaDeOutro = await fabricarConta(outroUsuario.usuario.id);

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: contaDeOutro.id, categoriaId: categoria.id }));

    expect(resposta.status).toBe(404);
  });

  it('categoria de outro usuario responde 404', async () => {
    const { accessToken, conta } = await prepararUsuarioComConta();
    const outroUsuario = await fabricarUsuario();
    const categoriaDeOutro = await fabricarCategoria(outroUsuario.usuario.id);

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: conta.id, categoriaId: categoriaDeOutro.id }));

    expect(resposta.status).toBe(404);
  });

  it('conta arquivada responde 422 CONTA_ARQUIVADA', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    await request(app)
      .patch(`/api/v1/contas/${conta.id}/arquivar`)
      .set('Authorization', `Bearer ${accessToken}`);

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: conta.id, categoriaId: categoria.id }));

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('CONTA_ARQUIVADA');
  });

  it('dois destinos simultaneos (contaId + cartaoId) respondem 400', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        corpoValido({ contaId: conta.id, categoriaId: categoria.id, cartaoId: 'cartao-qualquer' }),
      );

    expect(resposta.status).toBe(400);
  });

  it('nenhum destino informado responde 400', async () => {
    const { accessToken, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ categoriaId: categoria.id }));

    expect(resposta.status).toBe(400);
  });

  it('situacao PAGA sem dataEfetivacao responde 400', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: conta.id, categoriaId: categoria.id, situacao: 'PAGA' }));

    expect(resposta.status).toBe(400);
  });

  it.each(['0.00', '-10.00', '10.123'])('valor "%s" responde 400', async (valor) => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: conta.id, categoriaId: categoria.id, valor }));

    expect(resposta.status).toBe(400);
  });

  // 05-DEVELOPMENT.md §12.5 "Valores": os extremos aceitos pela regex de
  // RN-08 — nao so os rejeitados acima.
  it.each(['0.01', '999999999999.99'])('valor "%s" (extremo valido) e aceito', async (valor) => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ contaId: conta.id, categoriaId: categoria.id, valor }));

    expect(resposta.status).toBe(201);
    const { movimentacao } = (resposta.body as RespostaMovimentacao).data;
    expect(movimentacao.valor).toBe(valor);
  });

  it('data de competencia 11 anos no futuro responde 400 (RN-13)', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const anoFuturo = new Date().getUTCFullYear() + 11;

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        corpoValido({
          contaId: conta.id,
          categoriaId: categoria.id,
          dataCompetencia: `${anoFuturo}-01-01`,
        }),
      );

    expect(resposta.status).toBe(400);
  });

  it('rejeita tipo TRANSFERENCIA neste endpoint', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpoValido({ tipo: 'TRANSFERENCIA', contaId: conta.id, categoriaId: categoria.id }));

    expect(resposta.status).toBe(400);
  });

  it('vincula etiquetas do proprio usuario a movimentacao', async () => {
    const { accessToken, conta, categoria, usuario } = await prepararUsuarioComConta();
    const etiqueta = await prisma.etiqueta.create({
      data: { usuarioId: usuario.id, nome: 'essencial' },
    });

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        corpoValido({ contaId: conta.id, categoriaId: categoria.id, etiquetaIds: [etiqueta.id] }),
      );

    expect(resposta.status).toBe(201);
    const { movimentacao } = (resposta.body as RespostaMovimentacao).data;
    expect(movimentacao.etiquetas).toEqual([
      { id: etiqueta.id, nome: 'essencial', cor: etiqueta.cor },
    ]);
  });

  it('etiqueta de outro usuario responde 400', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const outroUsuario = await fabricarUsuario();
    const etiquetaDeOutro = await prisma.etiqueta.create({
      data: { usuarioId: outroUsuario.usuario.id, nome: 'nao-e-minha' },
    });

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(
        corpoValido({
          contaId: conta.id,
          categoriaId: categoria.id,
          etiquetaIds: [etiquetaDeOutro.id],
        }),
      );

    expect(resposta.status).toBe(400);
  });

  it('todas as rotas exigem autenticacao', async () => {
    const resposta = await request(app).post('/api/v1/movimentacoes').send(corpoValido());

    expect(resposta.status).toBe(401);
  });
});
