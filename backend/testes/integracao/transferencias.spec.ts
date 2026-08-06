import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarConta, fabricarUsuario, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaTransferencia {
  data: {
    transferencia: {
      transferenciaId: string;
      valor: string;
      situacao: string;
      saida: { movimentacaoId: string; conta: { id: string; nome: string; saldoAtual: string } };
      entrada: { movimentacaoId: string; conta: { id: string; nome: string; saldoAtual: string } };
    };
  };
}
interface RespostaErro {
  codigo: string;
  errors?: { campo: string; mensagem: string }[];
}
interface RespostaConta {
  data: { conta: { saldoAtual: string } };
}
interface RespostaMovimentacao {
  data: {
    movimentacao: {
      id: string;
      categoria: unknown;
      transferencia: {
        transferenciaId: string;
        sentido: string;
        contraparte: { movimentacaoId: string; conta: { id: string; nome: string } };
      } | null;
    };
  };
}
interface RespostaListagem {
  data: { movimentacoes: { id: string; tipo: string }[] };
  meta: { totalizadores: { receitas: string; despesas: string } };
}

async function saldoAtual(accessToken: string, contaId: string): Promise<string> {
  const resposta = await request(app)
    .get(`/api/v1/contas/${contaId}`)
    .set('Authorization', `Bearer ${accessToken}`);
  return (resposta.body as RespostaConta).data.conta.saldoAtual;
}

describe('Transferencias (issue #39)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cria o par SAIDA/ENTRADA efetivado e retorna os saldos atualizados das duas contas', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '200.00',
        data: '2026-08-05',
      });

    expect(resposta.status).toBe(201);
    const transferencia = (resposta.body as RespostaTransferencia).data.transferencia;
    expect(transferencia.situacao).toBe('PAGA');
    expect(transferencia.saida.conta.saldoAtual).toBe(
      origem.saldoInicial.minus('200.00').toFixed(2),
    );
    expect(transferencia.entrada.conta.saldoAtual).toBe(
      destino.saldoInicial.plus('200.00').toFixed(2),
    );

    expect(await saldoAtual(accessToken, origem.id)).toBe(transferencia.saida.conta.saldoAtual);
    expect(await saldoAtual(accessToken, destino.id)).toBe(transferencia.entrada.conta.saldoAtual);
  });

  it('contaOrigemId igual a contaDestinoId responde 422 CONTAS_IGUAIS', async () => {
    const { accessToken, conta } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: conta.id,
        contaDestinoId: conta.id,
        valor: '50.00',
        data: '2026-08-05',
      });

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('CONTAS_IGUAIS');
  });

  it('conta arquivada responde 422 CONTA_ARQUIVADA', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });
    await request(app)
      .patch(`/api/v1/contas/${destino.id}/arquivar`)
      .set('Authorization', `Bearer ${accessToken}`);

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '50.00',
        data: '2026-08-05',
      });

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('CONTA_ARQUIVADA');
  });

  it('conta de outro usuario responde 404', async () => {
    const { accessToken, conta: origem } = await prepararUsuarioComConta();
    const outroUsuario = await fabricarUsuario();
    const contaDeOutro = await fabricarConta(outroUsuario.usuario.id);

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: contaDeOutro.id,
        valor: '50.00',
        data: '2026-08-05',
      });

    expect(resposta.status).toBe(404);
  });

  it('efetivada:false cria o par como PENDENTE e nao afeta saldo (RN-02)', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });

    const resposta = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '200.00',
        data: '2026-08-05',
        efetivada: false,
      });

    expect(resposta.status).toBe(201);
    expect((resposta.body as RespostaTransferencia).data.transferencia.situacao).toBe('PENDENTE');
    expect(await saldoAtual(accessToken, origem.id)).toBe(origem.saldoInicial.toFixed(2));
    expect(await saldoAtual(accessToken, destino.id)).toBe(destino.saldoInicial.toFixed(2));
  });

  it('categoriaId e sempre nulo em uma transferencia', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });

    const criacao = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '50.00',
        data: '2026-08-05',
      });
    const movimentacaoId = (criacao.body as RespostaTransferencia).data.transferencia.saida
      .movimentacaoId;

    const resposta = await request(app)
      .get(`/api/v1/movimentacoes/${movimentacaoId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect((resposta.body as RespostaMovimentacao).data.movimentacao.categoria).toBeNull();
  });

  it('GET /transferencias/:id retorna o par completo', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });

    const criacao = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '75.00',
        data: '2026-08-05',
      });
    const transferenciaId = (criacao.body as RespostaTransferencia).data.transferencia
      .transferenciaId;

    const resposta = await request(app)
      .get(`/api/v1/transferencias/${transferenciaId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    const transferencia = (resposta.body as RespostaTransferencia).data.transferencia;
    expect(transferencia.valor).toBe('75.00');
    expect(transferencia.saida.conta.id).toBe(origem.id);
    expect(transferencia.entrada.conta.id).toBe(destino.id);
  });

  it('transferencia de outro usuario responde 404 em GET e DELETE', async () => {
    const outroUsuario = await fabricarUsuario();
    const contaOrigemDeOutro = await fabricarConta(outroUsuario.usuario.id);
    const contaDestinoDeOutro = await fabricarConta(outroUsuario.usuario.id, { nome: 'Carteira' });
    const criacao = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${outroUsuario.accessToken}`)
      .send({
        contaOrigemId: contaOrigemDeOutro.id,
        contaDestinoId: contaDestinoDeOutro.id,
        valor: '10.00',
        data: '2026-08-05',
      });
    const transferenciaId = (criacao.body as RespostaTransferencia).data.transferencia
      .transferenciaId;

    const { accessToken } = await prepararUsuarioComConta();

    const get = await request(app)
      .get(`/api/v1/transferencias/${transferenciaId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const del = await request(app)
      .delete(`/api/v1/transferencias/${transferenciaId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(get.status).toBe(404);
    expect(del.status).toBe(404);
  });

  it('DELETE /transferencias/:id exclui os dois lados atomicamente e devolve o saldo (RN-26)', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });
    const saldoOrigemAntes = origem.saldoInicial.toFixed(2);
    const saldoDestinoAntes = destino.saldoInicial.toFixed(2);

    const criacao = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '200.00',
        data: '2026-08-05',
      });
    const { transferenciaId, saida, entrada } = (criacao.body as RespostaTransferencia).data
      .transferencia;

    const exclusao = await request(app)
      .delete(`/api/v1/transferencias/${transferenciaId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(exclusao.status).toBe(204);

    expect(await saldoAtual(accessToken, origem.id)).toBe(saldoOrigemAntes);
    expect(await saldoAtual(accessToken, destino.id)).toBe(saldoDestinoAntes);

    const buscaSaida = await request(app)
      .get(`/api/v1/movimentacoes/${saida.movimentacaoId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const buscaEntrada = await request(app)
      .get(`/api/v1/movimentacoes/${entrada.movimentacaoId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(buscaSaida.status).toBe(404);
    expect(buscaEntrada.status).toBe(404);
  });

  it('DELETE /movimentacoes/:id em um dos lados remove a transferencia inteira (RN-39)', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });

    const criacao = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '200.00',
        data: '2026-08-05',
      });
    const { saida, entrada } = (criacao.body as RespostaTransferencia).data.transferencia;

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${saida.movimentacaoId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(exclusao.status).toBe(204);

    const buscaEntrada = await request(app)
      .get(`/api/v1/movimentacoes/${entrada.movimentacaoId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(buscaEntrada.status).toBe(404);
    expect(await saldoAtual(accessToken, origem.id)).toBe(origem.saldoInicial.toFixed(2));
    expect(await saldoAtual(accessToken, destino.id)).toBe(destino.saldoInicial.toFixed(2));
  });

  it('a listagem mostra o campo transferencia com a contraparte, para os dois lados', async () => {
    const { accessToken, usuario, conta: origem } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });

    const criacao = await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '200.00',
        data: '2026-08-05',
      });
    const { transferenciaId, saida, entrada } = (criacao.body as RespostaTransferencia).data
      .transferencia;

    const listagem = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`);
    const movimentacoes = (
      listagem.body as { data: { movimentacoes: RespostaMovimentacao['data']['movimentacao'][] } }
    ).data.movimentacoes;
    const linhaSaida = movimentacoes.find((m) => m.id === saida.movimentacaoId);
    const linhaEntrada = movimentacoes.find((m) => m.id === entrada.movimentacaoId);

    expect(linhaSaida?.transferencia?.transferenciaId).toBe(transferenciaId);
    expect(linhaSaida?.transferencia?.sentido).toBe('SAIDA');
    expect(linhaSaida?.transferencia?.contraparte.movimentacaoId).toBe(entrada.movimentacaoId);
    expect(linhaSaida?.transferencia?.contraparte.conta.id).toBe(destino.id);

    expect(linhaEntrada?.transferencia?.sentido).toBe('ENTRADA');
    expect(linhaEntrada?.transferencia?.contraparte.movimentacaoId).toBe(saida.movimentacaoId);
    expect(linhaEntrada?.transferencia?.contraparte.conta.id).toBe(origem.id);
  });

  it('RN-25: totalizadores de receita/despesa excluem transferencias', async () => {
    const { accessToken, usuario, conta: origem, categoria } = await prepararUsuarioComConta();
    const destino = await fabricarConta(usuario.id, { nome: 'Carteira' });

    await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Aluguel',
        valor: '1000.00',
        dataCompetencia: '2026-08-05',
        situacao: 'PAGA',
        dataEfetivacao: '2026-08-05',
        contaId: origem.id,
        categoriaId: categoria.id,
      });
    await request(app)
      .post('/api/v1/transferencias')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        contaOrigemId: origem.id,
        contaDestinoId: destino.id,
        valor: '300.00',
        data: '2026-08-05',
      });

    const listagem = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`);
    const totalizadores = (listagem.body as RespostaListagem).meta.totalizadores;

    expect(totalizadores.despesas).toBe('1000.00');
    expect(totalizadores.receitas).toBe('0.00');
  });
});
