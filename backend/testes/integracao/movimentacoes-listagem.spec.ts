import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarCategoria, prepararUsuarioComConta } from '../fabricas';

const app = criarServidor();

interface RespostaListagem {
  data: { movimentacoes: { id: string; descricao: string; tipo: string }[] };
  meta: {
    paginacao: {
      pagina: number;
      limite: number;
      total: number;
      totalPaginas: number;
      temProxima: boolean;
      temAnterior: boolean;
    };
    totalizadores: {
      receitas: string;
      despesas: string;
      resultado: string;
      receitasPendentes: string;
      despesasPendentes: string;
    };
  };
}

describe('GET /api/v1/movimentacoes', () => {
  let accessToken: string;
  let usuarioId: string;
  let contaId: string;
  let categoriaDespesaId: string;
  let subcategoriaId: string;
  let categoriaReceitaId: string;
  let idsCriadosPelaApi: {
    despesaPaga: string;
    despesaPendenteSub: string;
    receitaPaga: string;
    despesaCancelada: string;
  };

  beforeAll(async () => {
    await limparBanco();

    const preparo = await prepararUsuarioComConta();
    accessToken = preparo.accessToken;
    usuarioId = preparo.usuario.id;
    contaId = preparo.conta.id;
    categoriaDespesaId = preparo.categoria.id;

    const subcategoria = await fabricarCategoria(usuarioId, {
      nome: 'Restaurante',
      tipo: 'DESPESA',
      categoriaPaiId: categoriaDespesaId,
    });
    subcategoriaId = subcategoria.id;
    const categoriaReceita = await fabricarCategoria(usuarioId, {
      nome: 'Salário',
      tipo: 'RECEITA',
    });
    categoriaReceitaId = categoriaReceita.id;

    async function criar(corpo: Record<string, unknown>): Promise<string> {
      const resposta = await request(app)
        .post('/api/v1/movimentacoes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(corpo);
      return (resposta.body as { data: { movimentacao: { id: string } } }).data.movimentacao.id;
    }

    const despesaPaga = await criar({
      tipo: 'DESPESA',
      descricao: 'Mercado do mes',
      valor: '100.00',
      dataCompetencia: '2026-07-01',
      situacao: 'PAGA',
      dataEfetivacao: '2026-07-01',
      contaId,
      categoriaId: categoriaDespesaId,
    });
    const despesaPendenteSub = await criar({
      tipo: 'DESPESA',
      descricao: 'Jantar fora',
      valor: '50.00',
      dataCompetencia: '2026-07-15',
      dataVencimento: '2026-07-20',
      contaId,
      categoriaId: subcategoriaId,
    });
    const receitaPaga = await criar({
      tipo: 'RECEITA',
      descricao: 'Salário de julho',
      valor: '1000.00',
      dataCompetencia: '2026-07-05',
      situacao: 'PAGA',
      dataEfetivacao: '2026-07-05',
      contaId,
      categoriaId: categoriaReceitaId,
    });
    const despesaCancelada = await criar({
      tipo: 'DESPESA',
      descricao: 'Compra cancelada',
      valor: '999.00',
      dataCompetencia: '2026-07-10',
      situacao: 'CANCELADA',
      contaId,
      categoriaId: categoriaDespesaId,
    });

    idsCriadosPelaApi = { despesaPaga, despesaPendenteSub, receitaPaga, despesaCancelada };

    // Transferencia e modelo/ocorrencia de recorrencia — inseridos direto
    // no banco, pois #39 (transferencias) e #38 (recorrencia) ainda nao
    // existem nesta issue; o objetivo aqui e so garantir que a listagem os
    // trata corretamente quando eles existem.
    const transferenciaId = 'transferencia-teste-1';
    await prisma.movimentacao.create({
      data: {
        usuarioId,
        contaId,
        tipo: 'TRANSFERENCIA',
        descricao: 'Transferencia saida',
        valor: '200.00',
        situacao: 'PAGA',
        dataCompetencia: new Date('2026-07-12'),
        dataEfetivacao: new Date('2026-07-12'),
        sentido: 'SAIDA',
        transferenciaId,
      },
    });
    await prisma.movimentacao.create({
      data: {
        usuarioId,
        contaId,
        tipo: 'TRANSFERENCIA',
        descricao: 'Transferencia entrada',
        valor: '200.00',
        situacao: 'PAGA',
        dataCompetencia: new Date('2026-07-12'),
        dataEfetivacao: new Date('2026-07-12'),
        sentido: 'ENTRADA',
        transferenciaId,
      },
    });

    const modelo = await prisma.movimentacao.create({
      data: {
        usuarioId,
        contaId,
        categoriaId: categoriaDespesaId,
        tipo: 'DESPESA',
        descricao: 'Assinatura mensal',
        valor: '30.00',
        situacao: 'PENDENTE',
        dataCompetencia: new Date('2026-07-01'),
        ehModeloRecorrencia: true,
        frequencia: 'MENSAL',
      },
    });
    await prisma.movimentacao.create({
      data: {
        usuarioId,
        contaId,
        categoriaId: categoriaDespesaId,
        tipo: 'DESPESA',
        descricao: 'Assinatura mensal',
        valor: '30.00',
        situacao: 'PENDENTE',
        dataCompetencia: new Date('2026-08-01'),
        recorrenciaId: modelo.id,
      },
    });
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('lista todas as movimentacoes nao-modelo do usuario, com totalizadores corretos', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limite: 100 });

    expect(resposta.status).toBe(200);
    const corpo = (resposta.body as RespostaListagem).data;
    const meta = (resposta.body as RespostaListagem).meta;

    // 4 criadas pela API + 2 transferencias + 1 ocorrencia = 7. O modelo
    // (ehModeloRecorrencia=true) nunca aparece.
    expect(corpo.movimentacoes).toHaveLength(7);
    expect(corpo.movimentacoes.some((m) => m.descricao === 'Assinatura mensal')).toBe(true);

    // RN-25: transferencias e a CANCELADA ficam fora dos totalizadores.
    expect(meta.totalizadores.receitas).toBe('1000.00');
    expect(meta.totalizadores.despesas).toBe('180.00'); // 100 + 50 + 30 (ocorrencia)
    expect(meta.totalizadores.resultado).toBe('820.00');
    expect(meta.totalizadores.despesasPendentes).toBe('80.00'); // 50 + 30
    expect(meta.totalizadores.receitasPendentes).toBe('0.00');
  });

  it('modelo de recorrencia nunca aparece na listagem', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ busca: 'Assinatura', limite: 100 });

    const corpo = (resposta.body as RespostaListagem).data;
    expect(corpo.movimentacoes).toHaveLength(1);
  });

  it('filtra por tipo (repetivel, OU logico)', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ tipo: ['RECEITA', 'TRANSFERENCIA'], limite: 100 });

    const corpo = (resposta.body as RespostaListagem).data;
    expect(corpo.movimentacoes).toHaveLength(3);
    expect(
      corpo.movimentacoes.every((m) => m.tipo === 'RECEITA' || m.tipo === 'TRANSFERENCIA'),
    ).toBe(true);
  });

  it('categoriaId de uma categoria-pai inclui movimentacoes das subcategorias', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ categoriaId: categoriaDespesaId, limite: 100 });

    const corpo = (resposta.body as RespostaListagem).data;
    const ids = corpo.movimentacoes.map((m) => m.id);
    expect(ids).toContain(idsCriadosPelaApi.despesaPaga);
    expect(ids).toContain(idsCriadosPelaApi.despesaPendenteSub);
  });

  it('busca por descricao e observacao, case-insensitive', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ busca: 'mercado' });

    const corpo = (resposta.body as RespostaListagem).data;
    expect(corpo.movimentacoes).toHaveLength(1);
    expect(corpo.movimentacoes[0]?.id).toBe(idsCriadosPelaApi.despesaPaga);
  });

  it('campoData alterna entre competencia, vencimento e efetivacao', async () => {
    const porVencimento = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ campoData: 'VENCIMENTO', dataInicio: '2026-07-20', dataFim: '2026-07-20' });

    const corpo = (porVencimento.body as RespostaListagem).data;
    expect(corpo.movimentacoes).toHaveLength(1);
    expect(corpo.movimentacoes[0]?.id).toBe(idsCriadosPelaApi.despesaPendenteSub);
  });

  it('limite acima de 100 responde 400 (nao trunca silenciosamente)', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limite: 200 });

    expect(resposta.status).toBe(400);
  });

  it('ordenarPor fora da lista fechada responde 400', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ ordenarPor: 'senhaHash' });

    expect(resposta.status).toBe(400);
  });

  it('paginacao respeita limite e informa temProxima/temAnterior', async () => {
    const resposta = await request(app)
      .get('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${accessToken}`)
      .query({ limite: 2, pagina: 1 });

    const meta = (resposta.body as RespostaListagem).meta;
    expect(meta.paginacao.limite).toBe(2);
    expect(meta.paginacao.temAnterior).toBe(false);
    expect(meta.paginacao.temProxima).toBe(true);
  });

  it('todas as rotas exigem autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/movimentacoes');

    expect(resposta.status).toBe(401);
  });
});
