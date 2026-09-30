import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

function exigir<T>(valor: T | null | undefined, mensagem: string): T {
  if (valor === null || valor === undefined) {
    throw new Error(mensagem);
  }
  return valor;
}

interface RespostaMovimentacao {
  data: { movimentacao: Record<string, unknown> };
  meta?: {
    recorrencia?: { modeloId: string; ocorrenciasGeradas: number; proximaGeracaoEm: string };
  };
}
interface RespostaErro {
  codigo: string;
  errors?: { campo: string; mensagem: string }[];
}
interface RespostaOcorrencias {
  data: {
    modelo: { id: string; descricao: string; valor: string; frequencia: string; intervalo: number };
    ocorrencias: {
      id: string;
      dataCompetencia: string;
      valor: string;
      situacao: string;
      divergeDoModelo: boolean;
    }[];
  };
}
interface RespostaListagem {
  data: { movimentacoes: { id: string }[] };
}
interface RespostaConta {
  data: { conta: { saldoAtual: string } };
}

describe('Recorrencias materializadas (issue #38)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  async function criarRecorrencia(
    accessToken: string,
    corpo: Record<string, unknown>,
  ): Promise<RespostaMovimentacao> {
    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(corpo);
    return resposta.body as RespostaMovimentacao;
  }

  it('recorrencia mensal gera 12 ocorrencias com datas corretas', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Salário',
      valor: '5400.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1 },
    });

    expect(resposta.meta?.recorrencia?.ocorrenciasGeradas).toBe(12);
    const movimentacao = resposta.data.movimentacao;

    const ocorrencias = await request(app)
      .get(`/api/v1/movimentacoes/${movimentacao.id as string}/ocorrencias`)
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = (ocorrencias.body as RespostaOcorrencias).data;
    expect(corpo.ocorrencias).toHaveLength(12);
    expect(corpo.ocorrencias[0]?.dataCompetencia).toBe('2026-08-05');
    expect(corpo.ocorrencias[1]?.dataCompetencia).toBe('2026-09-05');
    expect(corpo.ocorrencias[11]?.dataCompetencia).toBe('2027-07-05');
  });

  it('recorrencia mensal iniciada em 31/01 nao pula meses: 28/02 e 31/03', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Assinatura',
      valor: '50.00',
      dataCompetencia: '2026-01-31',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 3 },
    });
    const movimentacao = resposta.data.movimentacao;

    const ocorrencias = await request(app)
      .get(`/api/v1/movimentacoes/${movimentacao.id as string}/ocorrencias`)
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = (ocorrencias.body as RespostaOcorrencias).data;

    expect(corpo.ocorrencias.map((o) => o.dataCompetencia)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
    ]);
  });

  it('o modelo nunca aparece em listagem nem afeta saldo', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Aluguel',
      valor: '1000.00',
      dataCompetencia: '2026-08-05',
      situacao: 'PAGA',
      dataEfetivacao: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 3 },
    });
    const modeloId = resposta.meta?.recorrencia?.modeloId;

    const listagem = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`);
    const idsListados = (listagem.body as RespostaListagem).data.movimentacoes.map((m) => m.id);
    expect(idsListados).not.toContain(modeloId);

    const respostaConta = await request(app)
      .get(`/api/v1/contas/${conta.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect((respostaConta.body as RespostaConta).data.conta.saldoAtual).toBe(
      conta.saldoInicial.minus('1000.00').toFixed(2),
    );
  });

  it('fimEm e totalOcorrencias juntos respondem 422', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();

    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Salário',
        valor: '5400.00',
        dataCompetencia: '2026-08-05',
        contaId: conta.id,
        categoriaId: categoria.id,
        recorrencia: {
          frequencia: 'MENSAL',
          intervalo: 1,
          fimEm: '2027-08-05',
          totalOcorrencias: 6,
        },
      });

    expect(resposta.status).toBe(422);
    expect((resposta.body as RespostaErro).codigo).toBe('REGRA_NEGOCIO');
  });

  it('PATCH em ocorrencia de recorrencia sem escopoEdicao responde 400', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Salário',
      valor: '5400.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 3 },
    });
    const movimentacao = resposta.data.movimentacao;

    const patch = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '5600.00' });

    expect(patch.status).toBe(400);
    expect((patch.body as RespostaErro).errors?.[0]?.campo).toBe('escopoEdicao');
  });

  it('APENAS_ESTA altera so uma ocorrencia, que passa a divergir do modelo', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Salário',
      valor: '5400.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 3 },
    });
    const movimentacao = resposta.data.movimentacao;

    const patch = await request(app)
      .patch(`/api/v1/movimentacoes/${movimentacao.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '5600.00', escopoEdicao: 'APENAS_ESTA' });
    expect(patch.status).toBe(200);

    const ocorrencias = await request(app)
      .get(`/api/v1/movimentacoes/${movimentacao.id as string}/ocorrencias`)
      .set('Authorization', `Bearer ${accessToken}`);
    const corpo = (ocorrencias.body as RespostaOcorrencias).data;

    const primeira = corpo.ocorrencias[0];
    const segunda = corpo.ocorrencias[1];
    expect(primeira?.valor).toBe('5600.00');
    expect(primeira?.divergeDoModelo).toBe(true);
    expect(segunda?.valor).toBe('5400.00');
    expect(segunda?.divergeDoModelo).toBe(false);
  });

  it('ESTA_E_FUTURAS altera esta e as futuras nao efetivadas, preservando passadas e efetivadas', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Salário',
      valor: '5400.00',
      dataCompetencia: '2026-01-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 5 },
    });
    const modeloId = exigir(resposta.meta?.recorrencia?.modeloId, 'modeloId ausente na resposta');

    const ocorrenciasIniciais = (
      (
        await request(app)
          .get(`/api/v1/movimentacoes/${modeloId}/ocorrencias`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body as RespostaOcorrencias
    ).data.ocorrencias;
    const idx = ocorrenciasIniciais.map((o) => o.id);
    const idJan = exigir(idx[0], 'ocorrencia de janeiro ausente');
    const idFev = exigir(idx[1], 'ocorrencia de fevereiro ausente');
    const idMar = exigir(idx[2], 'ocorrencia de marco ausente');
    const idAbr = exigir(idx[3], 'ocorrencia de abril ausente');
    const idMai = exigir(idx[4], 'ocorrencia de maio ausente');

    // marca marco como paga, para confirmar que fica intocada.
    await request(app)
      .patch(`/api/v1/movimentacoes/${idMar}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-03-05' });

    const patch = await request(app)
      .patch(`/api/v1/movimentacoes/${idFev}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '9999.00', escopoEdicao: 'ESTA_E_FUTURAS' });
    expect(patch.status).toBe(200);

    const finais = (
      (
        await request(app)
          .get(`/api/v1/movimentacoes/${modeloId}/ocorrencias`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body as RespostaOcorrencias
    ).data.ocorrencias;
    const porId = new Map(finais.map((o) => [o.id, o]));

    expect(porId.get(idJan)?.valor).toBe('5400.00'); // jan: passada, intocada
    expect(porId.get(idFev)?.valor).toBe('9999.00'); // fev: esta
    expect(porId.get(idMar)?.valor).toBe('5400.00'); // mar: efetivada, intocada
    expect(porId.get(idAbr)?.valor).toBe('9999.00'); // abr: futura
    expect(porId.get(idMai)?.valor).toBe('9999.00'); // mai: futura
  });

  it('TODAS altera todas as ocorrencias nao efetivadas, incluindo passadas, mas preserva as efetivadas', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Salário',
      valor: '5400.00',
      dataCompetencia: '2026-01-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 4 },
    });
    const modeloId = exigir(resposta.meta?.recorrencia?.modeloId, 'modeloId ausente na resposta');

    const ocorrenciasIniciais = (
      (
        await request(app)
          .get(`/api/v1/movimentacoes/${modeloId}/ocorrencias`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body as RespostaOcorrencias
    ).data.ocorrencias;
    const idx = ocorrenciasIniciais.map((o) => o.id);
    const id0 = exigir(idx[0], 'ocorrencia 0 ausente');
    const id1 = exigir(idx[1], 'ocorrencia 1 ausente');
    const id2 = exigir(idx[2], 'ocorrencia 2 ausente');
    const id3 = exigir(idx[3], 'ocorrencia 3 ausente');

    await request(app)
      .patch(`/api/v1/movimentacoes/${id1}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-02-05' });

    const patch = await request(app)
      .patch(`/api/v1/movimentacoes/${id3}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ valor: '7000.00', escopoEdicao: 'TODAS' });
    expect(patch.status).toBe(200);

    const finais = (
      (
        await request(app)
          .get(`/api/v1/movimentacoes/${modeloId}/ocorrencias`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body as RespostaOcorrencias
    ).data.ocorrencias;
    const porId = new Map(finais.map((o) => [o.id, o]));

    expect(porId.get(id0)?.valor).toBe('7000.00');
    expect(porId.get(id1)?.valor).toBe('5400.00'); // efetivada, intocada
    expect(porId.get(id2)?.valor).toBe('7000.00');
    expect(porId.get(id3)?.valor).toBe('7000.00');
  });

  it('DELETE de uma ocorrencia de recorrencia sem escopoExclusao responde 400', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Salário',
      valor: '5400.00',
      dataCompetencia: '2026-08-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 3 },
    });
    const movimentacao = resposta.data.movimentacao;

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${movimentacao.id as string}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(exclusao.status).toBe(400);
  });

  it('excluir o modelo remove as ocorrencias futuras nao efetivadas e preserva as ja efetivadas (RN-20)', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Salário',
      valor: '5400.00',
      dataCompetencia: '2026-01-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 3 },
    });
    const modeloId = exigir(resposta.meta?.recorrencia?.modeloId, 'modeloId ausente na resposta');

    const ocorrenciasIniciais = (
      (
        await request(app)
          .get(`/api/v1/movimentacoes/${modeloId}/ocorrencias`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body as RespostaOcorrencias
    ).data.ocorrencias;
    const idx = ocorrenciasIniciais.map((o) => o.id);
    const id0 = exigir(idx[0], 'ocorrencia 0 ausente');
    const id1 = exigir(idx[1], 'ocorrencia 1 ausente');
    const id2 = exigir(idx[2], 'ocorrencia 2 ausente');

    await request(app)
      .patch(`/api/v1/movimentacoes/${id0}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-01-05' });

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${modeloId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(exclusao.status).toBe(204);

    const efetivada = await request(app)
      .get(`/api/v1/movimentacoes/${id0}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const naoEfetivada1 = await request(app)
      .get(`/api/v1/movimentacoes/${id1}`)
      .set('Authorization', `Bearer ${accessToken}`);
    const naoEfetivada2 = await request(app)
      .get(`/api/v1/movimentacoes/${id2}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(efetivada.status).toBe(200);
    expect(naoEfetivada1.status).toBe(404);
    expect(naoEfetivada2.status).toBe(404);
  });

  it('DELETE de uma ocorrencia com escopoExclusao=ESTA_E_FUTURAS preserva as anteriores e as ja efetivadas', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Assinatura',
      valor: '40.00',
      dataCompetencia: '2026-01-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 4 },
    });
    const modeloId = exigir(resposta.meta?.recorrencia?.modeloId, 'modeloId ausente na resposta');
    const ocorrencias = (
      (
        await request(app)
          .get(`/api/v1/movimentacoes/${modeloId}/ocorrencias`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body as RespostaOcorrencias
    ).data.ocorrencias;
    const [id0, id1, id2, id3] = ocorrencias.map((o) => o.id);

    // id1 ja efetivada (paga) antes da exclusao — nao deve ser removida
    // mesmo estando "no futuro" a partir de id2, porque so ocorrencias
    // nao efetivadas sao afetadas por ESTA_E_FUTURAS (RN-20).
    await request(app)
      .patch(`/api/v1/movimentacoes/${exigir(id1, 'ocorrencia 1 ausente')}/pagar`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dataEfetivacao: '2026-02-05' });

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${exigir(id2, 'ocorrencia 2 ausente')}`)
      .query({ escopoExclusao: 'ESTA_E_FUTURAS' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(exclusao.status).toBe(204);

    const status = await Promise.all(
      [id0, id1, id2, id3].map(
        async (id) =>
          (
            await request(app)
              .get(`/api/v1/movimentacoes/${exigir(id, 'ocorrencia ausente')}`)
              .set('Authorization', `Bearer ${accessToken}`)
          ).status,
      ),
    );
    expect(status).toEqual([200, 200, 404, 404]);
  });

  it('DELETE de uma ocorrencia com escopoExclusao=TODAS remove tambem as anteriores nao efetivadas', async () => {
    const { accessToken, conta, categoria } = await prepararUsuarioComConta();
    const resposta = await criarRecorrencia(accessToken, {
      tipo: 'DESPESA',
      descricao: 'Assinatura',
      valor: '40.00',
      dataCompetencia: '2026-01-05',
      contaId: conta.id,
      categoriaId: categoria.id,
      recorrencia: { frequencia: 'MENSAL', intervalo: 1, totalOcorrencias: 3 },
    });
    const modeloId = exigir(resposta.meta?.recorrencia?.modeloId, 'modeloId ausente na resposta');
    const ocorrencias = (
      (
        await request(app)
          .get(`/api/v1/movimentacoes/${modeloId}/ocorrencias`)
          .set('Authorization', `Bearer ${accessToken}`)
      ).body as RespostaOcorrencias
    ).data.ocorrencias;
    const [id0, id1, id2] = ocorrencias.map((o) => o.id);

    const exclusao = await request(app)
      .delete(`/api/v1/movimentacoes/${exigir(id1, 'ocorrencia 1 ausente')}`)
      .query({ escopoExclusao: 'TODAS' })
      .set('Authorization', `Bearer ${accessToken}`);
    expect(exclusao.status).toBe(204);

    const status = await Promise.all(
      [id0, id1, id2].map(
        async (id) =>
          (
            await request(app)
              .get(`/api/v1/movimentacoes/${exigir(id, 'ocorrencia ausente')}`)
              .set('Authorization', `Bearer ${accessToken}`)
          ).status,
      ),
    );
    expect(status).toEqual([404, 404, 404]);
  });
});
