import { Prisma } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { resolverPermissoes } from '@/utilitarios/resolver-permissoes';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarGrupoComMembros } from '../fabricas';
import type { PapelMembro } from '@prisma/client';

const app = criarServidor();

const PAPEIS: PapelMembro[] = ['ADMINISTRADOR', 'PARTICIPANTE', 'OBSERVADOR'];

interface Cenario {
  grupoId: string;
  nomeGrupo: string;
  tokens: Record<PapelMembro, string>;
  membroExtraId: string;
  caixaId: string;
  categoriaId: string;
  movProprias: Record<PapelMembro, string>;
}

/** RN-30/issue #77: um grupo com exatamente um membro de cada papel
 * (mais um 4o PARTICIPANTE, usado so como ALVO de remover/alterar papel —
 * nunca o que esta sendo testado), uma sub-conta, uma categoria e uma
 * movimentacao "propria" de cada papel (a do OBSERVADOR nasce direto no
 * banco, ja que ele nunca teria permissao de cria-la pela API). */
async function criarCenario(): Promise<Cenario> {
  const { grupo, administrador, membros } = await fabricarGrupoComMembros([
    'PARTICIPANTE',
    'OBSERVADOR',
    'PARTICIPANTE',
  ]);
  const [participante, observador, extra] = membros;
  if (!participante || !observador || !extra) {
    throw new Error('fabricarGrupoComMembros nao retornou os 3 membros esperados.');
  }

  const tokens: Record<PapelMembro, string> = {
    ADMINISTRADOR: administrador.accessToken,
    PARTICIPANTE: participante.accessToken,
    OBSERVADOR: observador.accessToken,
  };

  const caixa = await prisma.conta.create({
    data: { contaCompartilhadaId: grupo.id, nome: 'Caixa', tipo: 'CONTA_CORRENTE' },
  });
  const categoria = await prisma.categoria.create({
    data: { contaCompartilhadaId: grupo.id, nome: 'Geral', tipo: 'DESPESA' },
  });

  const criarMovimentacaoPropria = async (token: string): Promise<string> => {
    const resposta = await request(app)
      .post('/api/v1/movimentacoes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'DESPESA',
        descricao: 'Movimentacao propria',
        valor: '10.00',
        dataCompetencia: '2026-07-10',
        contaId: caixa.id,
        categoriaId: categoria.id,
      });
    return (resposta.body as { data: { movimentacao: { id: string } } }).data.movimentacao.id;
  };

  const movAdministrador = await criarMovimentacaoPropria(tokens.ADMINISTRADOR);
  const movParticipante = await criarMovimentacaoPropria(tokens.PARTICIPANTE);
  // OBSERVADOR nunca cria movimentacao pela API (RN-30) — nasce direto no
  // banco so para provar que, mesmo sendo o autor, ele nao pode editar/
  // excluir a propria (RN-30 nao faz essa distincao para OBSERVADOR).
  const movObservador = await prisma.movimentacao.create({
    data: {
      usuarioId: observador.usuario.id,
      contaId: caixa.id,
      categoriaId: categoria.id,
      tipo: 'DESPESA',
      descricao: 'Movimentacao do observador',
      valor: new Prisma.Decimal('10.00'),
      dataCompetencia: new Date('2026-07-10'),
    },
  });

  return {
    grupoId: grupo.id,
    nomeGrupo: grupo.nome,
    tokens,
    membroExtraId: extra.membro.id,
    caixaId: caixa.id,
    categoriaId: categoria.id,
    movProprias: {
      ADMINISTRADOR: movAdministrador,
      PARTICIPANTE: movParticipante,
      OBSERVADOR: movObservador.id,
    },
  };
}

interface LinhaMatriz {
  acao: string;
  esperado: Record<PapelMembro, boolean>;
  executar: (cenario: Cenario, papel: PapelMembro) => Promise<number>;
}

/** RN-30 — as 13 acoes da matriz de permissoes, na mesma ordem da tabela
 * de 01-SPECIFICATION.md §6.5. "Consultar auditoria" ainda nao tem rota
 * (LogAuditoria e RF-82/M11) — verificada direto na funcao pura que
 * decide a matriz, unica fonte de verdade tambem usada pelas 12 rotas. */
const LINHAS_MATRIZ: LinhaMatriz[] = [
  {
    acao: 'Visualizar movimentações e histórico',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: true, OBSERVADOR: true },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .get(`/api/v1/movimentacoes?contaCompartilhadaId=${c.grupoId}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`);
      return resposta.status;
    },
  },
  {
    acao: 'Criar movimentação',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: true, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .post('/api/v1/movimentacoes')
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({
          tipo: 'DESPESA',
          descricao: 'Nova despesa',
          valor: '15.00',
          dataCompetencia: '2026-07-15',
          contaCompartilhadaId: c.grupoId,
          categoriaId: c.categoriaId,
        });
      return resposta.status;
    },
  },
  {
    acao: 'Editar movimentação própria',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: true, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .patch(`/api/v1/movimentacoes/${c.movProprias[papel]}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({ descricao: 'Editada pelo proprio autor' });
      return resposta.status;
    },
  },
  {
    acao: 'Editar movimentação de terceiro',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const alvo =
        papel === 'ADMINISTRADOR' ? c.movProprias.PARTICIPANTE : c.movProprias.ADMINISTRADOR;
      const resposta = await request(app)
        .patch(`/api/v1/movimentacoes/${alvo}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({ descricao: 'Editada por terceiro' });
      return resposta.status;
    },
  },
  {
    acao: 'Excluir movimentação própria',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: true, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .delete(`/api/v1/movimentacoes/${c.movProprias[papel]}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`);
      return resposta.status;
    },
  },
  {
    acao: 'Excluir movimentação de terceiro',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const alvo =
        papel === 'ADMINISTRADOR' ? c.movProprias.PARTICIPANTE : c.movProprias.ADMINISTRADOR;
      const resposta = await request(app)
        .delete(`/api/v1/movimentacoes/${alvo}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`);
      return resposta.status;
    },
  },
  {
    acao: 'Gerenciar categorias do grupo',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .post('/api/v1/categorias')
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({ nome: `Categoria ${papel}`, tipo: 'DESPESA', contaCompartilhadaId: c.grupoId });
      return resposta.status;
    },
  },
  {
    acao: 'Convidar usuários',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .post(`/api/v1/contas-compartilhadas/${c.grupoId}/convites`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({
          email: `convidado-${papel.toLowerCase()}-${Date.now()}@exemplo.com`,
          papel: 'PARTICIPANTE',
        });
      return resposta.status;
    },
  },
  {
    acao: 'Remover membros',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .delete(`/api/v1/contas-compartilhadas/${c.grupoId}/membros/${c.membroExtraId}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`);
      return resposta.status;
    },
  },
  {
    acao: 'Alterar papéis',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .patch(`/api/v1/contas-compartilhadas/${c.grupoId}/membros/${c.membroExtraId}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({ papel: 'OBSERVADOR' });
      return resposta.status;
    },
  },
  {
    acao: 'Editar dados do grupo',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .patch(`/api/v1/contas-compartilhadas/${c.grupoId}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({ nome: 'Nome novo do grupo' });
      return resposta.status;
    },
  },
  {
    acao: 'Excluir o grupo',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: async (c, papel) => {
      const resposta = await request(app)
        .delete(`/api/v1/contas-compartilhadas/${c.grupoId}`)
        .set('Authorization', `Bearer ${c.tokens[papel]}`)
        .send({ confirmacao: c.nomeGrupo });
      return resposta.status;
    },
  },
  {
    acao: 'Consultar auditoria do grupo (RF-82/M11 — sem rota ainda, verificado na matriz pura)',
    esperado: { ADMINISTRADOR: true, PARTICIPANTE: false, OBSERVADOR: false },
    executar: (_c, papel) => {
      const permitido = resolverPermissoes(papel, {
        permiteParticipanteEditarProprias: true,
      }).podeVerAuditoria;
      return Promise.resolve(permitido ? 200 : 403);
    },
  },
];

function statusIndicaSucesso(status: number): boolean {
  return status < 400;
}

describe('matriz completa de autorizacao (issue #77, RN-30): 3 papeis x 13 acoes', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  describe.each(LINHAS_MATRIZ)('$acao', ({ esperado, executar }) => {
    it.each(PAPEIS)('papel %s', async (papel) => {
      const cenario = await criarCenario();
      const status = await executar(cenario, papel);
      expect(statusIndicaSucesso(status)).toBe(esperado[papel]);
    });
  });
});
