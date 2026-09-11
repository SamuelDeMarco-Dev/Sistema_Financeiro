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
interface RespostaListagem {
  data: { movimentacoes: { id: string }[] };
  meta: { totalizadores: { despesas: string } };
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

describe('PATCH/DELETE/duplicar /api/v1/movimentacoes/:id', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('alterar o valor de uma movimentacao PAGA ajusta o saldo da conta corretamente', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Aluguel',
      valor: '1000.00',
      dataCompetencia: '2026-07-01',
      situacao: 'PAGA',
      dataEfetivacao: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '1200.00' });

    const respostaConta = await request(app)
      .get(`/api/v1/contas/${conta.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect((respostaConta.body as RespostaConta).data.conta.saldoAtual).toBe(
      conta.saldoInicial.minus('1200.00').toFixed(2),
    );
  });

  it('altera apenas os campos enviados, preservando o resto', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Aluguel',
      observacao: 'Referente a julho',
      valor: '1000.00',
      dataCompetencia: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ descricao: 'Aluguel de julho' });

    expect(resposta.status).toBe(200);
    const dto = (resposta.body as RespostaMovimentacao).data.movimentacao;
    expect(dto.descricao).toBe('Aluguel de julho');
    expect(dto.observacao).toBe('Referente a julho');
    expect(dto.valor).toBe('1000.00');
  });

  it('tentar mudar contaId responde 422 explicando a alternativa', async () => {
    const { accessToken, conta, categoria, usuario } = await prepararUsuarioComConta();
    const outraConta = await fabricarConta(usuario.id, { nome: 'Outra conta' });
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Aluguel',
      valor: '1000.00',
      dataCompetencia: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ contaId: outraConta.id });

    expect(resposta.status).toBe(422);
    const corpo = resposta.body as RespostaErro;
    expect(corpo.codigo).toBe('REGRA_NEGOCIO');
    expect(corpo.errors?.[0]?.mensagem).toMatch(/exclua/i);
  });

  it('revalida a compatibilidade da categoria quando categoriaId muda', async () => {
    const { accessToken, conta, categoria, usuario } = await prepararUsuarioComConta();
    const categoriaReceita = await fabricarCategoria(usuario.id, { tipo: 'RECEITA' });
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Aluguel',
      valor: '1000.00',
      dataCompetencia: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ categoriaId: categoriaReceita.id });

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('CATEGORIA_INCOMPATIVEL');
  });

  it('troca para uma categoria compativel com sucesso', async () => {
    const { accessToken, conta, categoria, usuario } = await prepararUsuarioComConta();
    const outraDespesa = await fabricarCategoria(usuario.id, { tipo: 'DESPESA', nome: 'Outra' });
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Aluguel',
      valor: '1000.00',
      dataCompetencia: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ categoriaId: outraDespesa.id });

    expect(resposta.status).toBe(200);
    const { movimentacao: atualizada } = (resposta.body as RespostaMovimentacao).data;
    expect((atualizada.categoria as { id: string }).id).toBe(outraDespesa.id);
  });

  it('reduzir o valor abaixo do que ja foi pago (PAGA_PARCIALMENTE) responde 422', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Conta parcial',
      valor: '200.00',
      dataCompetencia: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
      situacao: 'PAGA_PARCIALMENTE',
      dataEfetivacao: '2026-07-01',
      valorPago: '120.00',
    });

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '100.00' });

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('editar tipo ou categoria de uma transferencia responde 422', async () => {
    const { usuario, accessToken, conta } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Destino' });
    const transferencia = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: conta.id,
        contaDestinoId: destino.id,
        valor: '50.00',
        data: '2026-07-01',
      });
    const idPerna = (
      transferencia.body as { data: { transferencia: { saida: { movimentacaoId: string } } } }
    ).data.transferencia.saida.movimentacaoId;

    const resposta = await request(app)
      .patch(`/api/v1/movimentacoes/${idPerna}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tipo: 'DESPESA' });

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('duplicar uma transferencia responde 422 (crie uma nova em /transferencias)', async () => {
    const { usuario, accessToken, conta } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Destino' });
    const transferencia = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: conta.id,
        contaDestinoId: destino.id,
        valor: '50.00',
        data: '2026-07-01',
      });
    const idPerna = (
      transferencia.body as { data: { transferencia: { saida: { movimentacaoId: string } } } }
    ).data.transferencia.saida.movimentacaoId;

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${idPerna}/duplicar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('duplicar copia as etiquetas do original', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const etiqueta = await request(app)
      .post('/api/v1/etiquetas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'essencial' });
    const etiquetaId = (etiqueta.body as { data: { etiqueta: { id: string } } }).data.etiqueta.id;

    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Mercado',
      valor: '80.00',
      dataCompetencia: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
      etiquetaIds: [etiquetaId],
    });

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${movimentacao.id}/duplicar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(resposta.status).toBe(201);
    const { movimentacao: copia } = (resposta.body as RespostaMovimentacao).data;
    const etiquetas = copia.etiquetas as { id: string; nome: string }[];
    expect(etiquetas).toHaveLength(1);
    expect(etiquetas[0]).toMatchObject({ id: etiquetaId, nome: 'essencial' });
  });

  it('movimentacao excluida desaparece de listagens, saldo e totalizadores', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const movimentacao = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Compra a excluir',
      valor: '300.00',
      dataCompetencia: '2026-07-01',
      situacao: 'PAGA',
      dataEfetivacao: '2026-07-01',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(exclusao.status).toBe(204);

    const listagem = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`);
    const corpoListagem = listagem.body as RespostaListagem;
    expect(corpoListagem.data.movimentacoes.map((m) => m.id)).not.toContain(movimentacao.id);
    expect(corpoListagem.meta.totalizadores.despesas).toBe('0.00');

    const respostaConta = await request(app)
      .get(`/api/v1/contas/${conta.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect((respostaConta.body as RespostaConta).data.conta.saldoAtual).toBe(
      conta.saldoInicial.toFixed(2),
    );

    const buscaDireta = await request(app)
      .get(`/api/v1/movimentacoes/${movimentacao.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(buscaDireta.status).toBe(404);
  });

  it('duplicar cria um registro novo sem vinculo de recorrencia/parcelamento e sem anexos', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const original = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Assinatura streaming',
      valor: '39.90',
      dataCompetencia: '2026-07-22',
      situacao: 'PAGA',
      dataEfetivacao: '2026-07-22',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${original.id}/duplicar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataCompetencia: '2026-08-22', situacao: 'PENDENTE' });

    expect(resposta.status).toBe(201);
    const duplicada = (resposta.body as RespostaMovimentacao).data.movimentacao;
    expect(duplicada.id).not.toBe(original.id);
    expect(duplicada.descricao).toBe('Assinatura streaming');
    expect(duplicada.valor).toBe('39.90');
    expect(duplicada.situacao).toBe('PENDENTE');
    expect(duplicada.dataEfetivacao).toBeNull();
    expect(duplicada.valorPago).toBe('0.00');
    expect(duplicada.dataCompetencia).toBe('2026-08-22');
    expect(duplicada.quantidadeAnexos).toBe(0);
    expect(duplicada.recorrencia).toBeNull();
    expect(duplicada.parcelamento).toBeNull();
  });

  it('duplicar sem sobrescrever situacao copia o estado original', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const original = await criarMovimentacao(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Compra paga',
      valor: '80.00',
      dataCompetencia: '2026-07-10',
      situacao: 'PAGA',
      dataEfetivacao: '2026-07-10',
      contaId: conta.id,
      categoriaId: categoria.id,
    });

    const resposta = await request(app)
      .post(`/api/v1/movimentacoes/${original.id}/duplicar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    const duplicada = (resposta.body as RespostaMovimentacao).data.movimentacao;
    expect(duplicada.situacao).toBe('PAGA');
    expect(duplicada.valorPago).toBe('80.00');
    expect(duplicada.dataEfetivacao).toBe('2026-07-10');
  });

  it('movimentacao de outro usuario responde 404 em PATCH e DELETE', async () => {
    const outroUsuario = await fabricarUsuario();
    const contaDeOutro = await fabricarConta(outroUsuario.usuario.id);
    const categoriaDeOutro = await fabricarCategoria(outroUsuario.usuario.id);
    const movimentacaoDeOutro = await criarMovimentacao(outroUsuario.accessToken, {
      tipo: 'DESPESA',
      descricao: 'Nao e minha',
      valor: '10.00',
      dataCompetencia: '2026-07-01',
      contaId: contaDeOutro.id,
      categoriaId: categoriaDeOutro.id,
    });

    const { accessToken } = await prepararUsuarioComConta();

    const patch = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacaoDeOutro.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ descricao: 'Tentativa' });
    const del = await request(app)
      .delete(`/api/v1/movimentacoes/${movimentacaoDeOutro.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
  });
});
