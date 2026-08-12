import { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import {
  fabricarGrupoComMembros,
  fabricarMovimentacao,
  prepararUsuarioComConta,
} from '../fabricas';

const app = criarServidor();

interface RespostaDashboard {
  data: {
    periodo: { dataInicio: string; dataFim: string; rotulo: string };
    indicadores: { receitas: string; despesas: string };
    fluxoCaixa: unknown[];
    despesasPorCategoria: unknown[];
    receitasPorCategoria: unknown[];
    ultimasMovimentacoes: { id: string; dataCompetencia: string }[];
    contas: { id: string; saldoAtual: string }[];
    contasCompartilhadas: {
      id: string;
      nome: string;
      meuPapel: string;
      saldoTotal: string;
      quantidadeMembros: number;
      resumoMesAtual: { receitas: string; despesas: string };
    }[];
    metas: unknown[];
    orcamentos: unknown[];
    alertas: { tipo: string; titulo: string }[];
    cartoes: unknown[];
  };
}

async function buscarDashboard(
  accessToken: string,
  query = '',
): Promise<RespostaDashboard['data']> {
  const resposta = await request(app)
    .get(`/api/v1/dashboard${query}`)
    .set('Authorization', `Bearer ${accessToken}`);
  expect(resposta.status).toBe(200);
  return (resposta.body as RespostaDashboard).data;
}

describe('GET /dashboard (issue #50)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('exige autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/dashboard');
    expect(resposta.status).toBe(401);
  });

  it('todas as chaves documentadas estao presentes, mesmo vazias, para um usuario sem dados', async () => {
    const { accessToken } = await prepararUsuarioComConta();

    const dados = await buscarDashboard(accessToken);

    expect(dados).toHaveProperty('periodo');
    expect(dados).toHaveProperty('indicadores');
    expect(dados.fluxoCaixa).toHaveLength(12);
    expect(dados.despesasPorCategoria).toEqual([]);
    expect(dados.receitasPorCategoria).toEqual([]);
    expect(dados.ultimasMovimentacoes).toEqual([]);
    expect(dados.contasCompartilhadas).toEqual([]);
    expect(dados.metas).toEqual([]);
    expect(dados.orcamentos).toEqual([]);
    expect(dados.alertas).toEqual([]);
    expect(dados.cartoes).toEqual([]);
  });

  it('indicadores, fluxoCaixa e por-categoria conferem com os endpoints granulares equivalentes', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '1000.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
    });
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'DESPESA',
      valor: '300.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-11',
    });

    const dados = await buscarDashboard(accessToken, '?dataInicio=2026-07-01&dataFim=2026-07-31');
    const indicadoresGranular = await request(app)
      .get('/api/v1/dashboard/indicadores?dataInicio=2026-07-01&dataFim=2026-07-31')
      .set('Authorization', `Bearer ${accessToken}`);
    const fluxoCaixaGranular = await request(app)
      .get('/api/v1/dashboard/fluxo-caixa')
      .set('Authorization', `Bearer ${accessToken}`);
    const despesasGranular = await request(app)
      .get('/api/v1/dashboard/por-categoria?dataInicio=2026-07-01&dataFim=2026-07-31')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(dados.indicadores).toEqual(
      (indicadoresGranular.body as { data: { indicadores: unknown } }).data.indicadores,
    );
    expect(dados.fluxoCaixa).toEqual(
      (fluxoCaixaGranular.body as { data: { fluxoCaixa: unknown } }).data.fluxoCaixa,
    );
    expect(dados.despesasPorCategoria).toEqual(
      (despesasGranular.body as { data: { porCategoria: unknown } }).data.porCategoria,
    );
  });

  it('contas.saldoAtual confere com GET /contas para a mesma conta', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    await fabricarMovimentacao(usuario.id, conta.id, {
      tipo: 'RECEITA',
      valor: '250.00',
      situacao: 'PAGA',
      dataCompetencia: '2026-07-10',
    });

    const dados = await buscarDashboard(accessToken);
    const respostaContas = await request(app)
      .get('/api/v1/contas')
      .set('Authorization', `Bearer ${accessToken}`);
    const contaGranular = (
      respostaContas.body as { data: { contas: { id: string; saldoAtual: string }[] } }
    ).data.contas.find((c) => c.id === conta.id);

    const contaDashboard = dados.contas.find((c) => c.id === conta.id);
    expect(contaDashboard?.saldoAtual).toBe(contaGranular?.saldoAtual);
    expect(contaDashboard?.saldoAtual).toBe('250.00');
  });

  it('lista no maximo as 10 movimentacoes mais recentes, em ordem decrescente de data', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    for (let dia = 1; dia <= 12; dia += 1) {
      await fabricarMovimentacao(usuario.id, conta.id, {
        descricao: `Movimentação dia ${dia}`,
        dataCompetencia: `2026-07-${String(dia).padStart(2, '0')}`,
      });
    }

    const dados = await buscarDashboard(accessToken);

    expect(dados.ultimasMovimentacoes).toHaveLength(10);
    expect(dados.ultimasMovimentacoes[0]?.dataCompetencia).toBe('2026-07-12');
    expect(dados.ultimasMovimentacoes[9]?.dataCompetencia).toBe('2026-07-03');
  });

  describe('alertas de vencimento (D-7)', () => {
    it('gera alerta para pendente vencendo dentro de 7 dias', async () => {
      const { accessToken, usuario, conta } = await prepararUsuarioComConta();
      const emTresDias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await fabricarMovimentacao(usuario.id, conta.id, {
        situacao: 'PENDENTE',
        dataVencimento: emTresDias,
      });

      const dados = await buscarDashboard(accessToken);

      expect(dados.alertas).toHaveLength(1);
      expect(dados.alertas[0]?.tipo).toBe('DESPESA_A_VENCER');
    });

    it('nao gera alerta para vencimento a mais de 7 dias', async () => {
      const { accessToken, usuario, conta } = await prepararUsuarioComConta();
      const emDezDias = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await fabricarMovimentacao(usuario.id, conta.id, {
        situacao: 'PENDENTE',
        dataVencimento: emDezDias,
      });

      const dados = await buscarDashboard(accessToken);

      expect(dados.alertas).toEqual([]);
    });

    it('nao gera alerta para movimentacao ja paga, mesmo com vencimento proximo', async () => {
      const { accessToken, usuario, conta } = await prepararUsuarioComConta();
      const emTresDias = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await fabricarMovimentacao(usuario.id, conta.id, {
        situacao: 'PAGA',
        dataVencimento: emTresDias,
        dataEfetivacao: emTresDias,
      });

      const dados = await buscarDashboard(accessToken);

      expect(dados.alertas).toEqual([]);
    });
  });

  // 04-API.md §22 (issue #74): a chave saiu de placeholder e agora traz a
  // forma reduzida de §16.1 — sem `resultado`, que o dashboard nao usa.
  it('traz os grupos do usuario com papel, saldo, membros e resumo do mes', async () => {
    const { grupo, administrador } = await fabricarGrupoComMembros(['PARTICIPANTE']);
    const hoje = new Date();
    const primeiroDiaDoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
    await prisma.movimentacao.createMany({
      data: [
        {
          usuarioId: administrador.usuario.id,
          contaCompartilhadaId: grupo.id,
          tipo: 'RECEITA',
          descricao: 'Aporte do mes',
          valor: new Prisma.Decimal('300.00'),
          valorPago: new Prisma.Decimal('300.00'),
          situacao: 'PAGA',
          dataCompetencia: primeiroDiaDoMes,
          dataEfetivacao: primeiroDiaDoMes,
        },
        {
          usuarioId: administrador.usuario.id,
          contaCompartilhadaId: grupo.id,
          tipo: 'DESPESA',
          descricao: 'Mercado do mes',
          valor: new Prisma.Decimal('120.00'),
          valorPago: new Prisma.Decimal('120.00'),
          situacao: 'PAGA',
          dataCompetencia: primeiroDiaDoMes,
          dataEfetivacao: primeiroDiaDoMes,
        },
      ],
    });

    const dados = await buscarDashboard(administrador.accessToken);

    expect(dados.contasCompartilhadas).toEqual([
      {
        id: grupo.id,
        nome: grupo.nome,
        meuPapel: 'ADMINISTRADOR',
        saldoTotal: '180.00',
        quantidadeMembros: 2,
        resumoMesAtual: { receitas: '300.00', despesas: '120.00' },
      },
    ]);
  });

  it('nao expoe grupo de que o usuario nao participa', async () => {
    const { grupo } = await fabricarGrupoComMembros([]);
    const { accessToken } = await prepararUsuarioComConta();

    const dados = await buscarDashboard(accessToken);

    expect(dados.contasCompartilhadas).toEqual([]);
    expect(JSON.stringify(dados)).not.toContain(grupo.id);
  });

  it('responde em menos de 300ms com 5000 movimentacoes', async () => {
    const { accessToken, usuario, conta } = await prepararUsuarioComConta();
    const TOTAL_LINHAS = 5000;
    const linhas = Array.from({ length: TOTAL_LINHAS }, (_, indice) => {
      const efetivada = indice % 3 !== 2;
      return {
        usuarioId: usuario.id,
        contaId: conta.id,
        tipo: indice % 2 === 0 ? ('RECEITA' as const) : ('DESPESA' as const),
        descricao: `Movimentação de carga ${indice}`,
        valor: new Prisma.Decimal('10.00'),
        valorPago: new Prisma.Decimal(efetivada ? '10.00' : '0.00'),
        situacao: efetivada ? ('PAGA' as const) : ('PENDENTE' as const),
        dataCompetencia: new Date(Date.UTC(2026, indice % 12, 1 + (indice % 27))),
        dataEfetivacao: efetivada ? new Date(Date.UTC(2026, indice % 12, 1 + (indice % 27))) : null,
      };
    });
    await prisma.movimentacao.createMany({ data: linhas });

    const inicio = Date.now();
    const resposta = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${accessToken}`);
    const duracaoMs = Date.now() - inicio;

    expect(resposta.status).toBe(200);
    expect(duracaoMs).toBeLessThan(300);
  }, 15_000);
});
