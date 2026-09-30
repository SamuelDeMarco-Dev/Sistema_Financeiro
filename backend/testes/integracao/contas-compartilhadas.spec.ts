import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { garantirCategoriasPadrao, limparBanco } from '../configuracao/banco-teste';
import { fabricarUsuario } from '../fabricas';

const app = criarServidor();

async function criarUsuarioAutenticado(): Promise<{ usuarioId: string; accessToken: string }> {
  const { usuario, accessToken } = await fabricarUsuario();
  return { usuarioId: usuario.id, accessToken };
}

async function criarGrupo(
  accessToken: string,
  corpo: Record<string, unknown> = {},
): Promise<{ id: string }> {
  const resposta = await request(app)
    .post('/api/v1/contas-compartilhadas')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ nome: 'Casa', ...corpo });
  return (resposta.body as { data: { contaCompartilhada: { id: string } } }).data
    .contaCompartilhada;
}

async function adicionarMembro(
  contaCompartilhadaId: string,
  usuarioId: string,
  papel: 'PARTICIPANTE' | 'OBSERVADOR',
): Promise<void> {
  await prisma.membroCompartilhado.create({ data: { contaCompartilhadaId, usuarioId, papel } });
}

async function gerarPng(): Promise<Buffer> {
  return sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 0, b: 255 } },
  })
    .png()
    .toBuffer();
}

describe('/api/v1/contas-compartilhadas', () => {
  // `criarCategoriasPadrao` copia do catalogo do sistema, que e' dado de
  // referencia e nao pertence a nenhum teste — num banco recem-criado (CI)
  // ele so existe se a suite o semear. Sem isto, o teste passava aqui e
  // falhava la, dependendo da ordem das suites.
  beforeAll(async () => {
    await garantirCategoriasPadrao();
  });

  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('RF-53: cria o grupo com o criador como ADMINISTRADOR e copia as categorias padrao', async () => {
    const { usuarioId, accessToken } = await criarUsuarioAutenticado();

    const resposta = await request(app)
      .post('/api/v1/contas-compartilhadas')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ nome: 'Casa', descricao: 'Despesas da casa' });

    expect(resposta.status).toBe(201);
    const grupo = (
      resposta.body as {
        data: {
          contaCompartilhada: {
            id: string;
            meuPapel: string;
            minhasPermissoes: { podeEditar: boolean };
            membros: { usuario: { id: string } }[];
          };
        };
      }
    ).data.contaCompartilhada;
    expect(grupo.meuPapel).toBe('ADMINISTRADOR');
    expect(grupo.minhasPermissoes.podeEditar).toBe(true);
    expect(grupo.membros).toHaveLength(1);
    expect(grupo.membros[0]?.usuario.id).toBe(usuarioId);

    const categorias = await prisma.categoria.count({
      where: { contaCompartilhadaId: grupo.id },
    });
    expect(categorias).toBeGreaterThan(0);
  });

  it('criarCategoriasPadrao: false nao copia nenhuma categoria para o grupo', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken, { criarCategoriasPadrao: false });

    const categorias = await prisma.categoria.count({
      where: { contaCompartilhadaId: grupo.id },
    });
    expect(categorias).toBe(0);
  });

  it('GET lista o grupo com meuPapel, saldoTotal e resumoMesAtual', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    await criarGrupo(accessToken, { nome: 'Familia' });

    const resposta = await request(app)
      .get('/api/v1/contas-compartilhadas')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    const lista = (
      resposta.body as {
        data: {
          contasCompartilhadas: {
            nome: string;
            meuPapel: string;
            saldoTotal: string;
            quantidadeMembros: number;
            quantidadeContas: number;
            resumoMesAtual: { receitas: string; despesas: string; resultado: string };
          }[];
        };
      }
    ).data.contasCompartilhadas;

    expect(lista).toHaveLength(1);
    expect(lista[0]?.nome).toBe('Familia');
    expect(lista[0]?.meuPapel).toBe('ADMINISTRADOR');
    expect(lista[0]?.saldoTotal).toBe('0.00');
    expect(lista[0]?.quantidadeMembros).toBe(1);
    expect(lista[0]?.quantidadeContas).toBe(0);
    expect(lista[0]?.resumoMesAtual).toEqual({
      receitas: '0.00',
      despesas: '0.00',
      resultado: '0.00',
    });
  });

  it('GET :id reflete permiteParticipanteEditarProprias em minhasPermissoes do PARTICIPANTE', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken, {
      permiteParticipanteEditarProprias: false,
    });
    await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${participante.accessToken}`);

    expect(resposta.status).toBe(200);
    const corpo = (
      resposta.body as {
        data: {
          contaCompartilhada: {
            meuPapel: string;
            minhasPermissoes: {
              podeEditarMovimentacaoPropria: boolean;
              podeExcluirMovimentacaoPropria: boolean;
              podeCriarMovimentacao: boolean;
              podeEditar: boolean;
              podeConvidar: boolean;
            };
          };
        };
      }
    ).data.contaCompartilhada;

    expect(corpo.meuPapel).toBe('PARTICIPANTE');
    expect(corpo.minhasPermissoes.podeCriarMovimentacao).toBe(true);
    expect(corpo.minhasPermissoes.podeEditarMovimentacaoPropria).toBe(false);
    expect(corpo.minhasPermissoes.podeExcluirMovimentacaoPropria).toBe(false);
    expect(corpo.minhasPermissoes.podeEditar).toBe(false);
    expect(corpo.minhasPermissoes.podeConvidar).toBe(false);
  });

  it('GET :id do OBSERVADOR nao concede nenhuma permissao de escrita', async () => {
    const admin = await criarUsuarioAutenticado();
    const observador = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await adicionarMembro(grupo.id, observador.usuarioId, 'OBSERVADOR');

    const resposta = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${observador.accessToken}`);

    const permissoes = (
      resposta.body as {
        data: { contaCompartilhada: { minhasPermissoes: Record<string, boolean> } };
      }
    ).data.contaCompartilhada.minhasPermissoes;

    expect(Object.values(permissoes).every((valor) => !valor)).toBe(true);
  });

  it('responde 404 (nao 403) para quem nao e membro do grupo', async () => {
    const dono = await criarUsuarioAutenticado();
    const estranho = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(dono.accessToken);

    const respostas = await Promise.all([
      request(app)
        .get(`/api/v1/contas-compartilhadas/${grupo.id}`)
        .set('Authorization', `Bearer ${estranho.accessToken}`),
      request(app)
        .patch(`/api/v1/contas-compartilhadas/${grupo.id}`)
        .set('Authorization', `Bearer ${estranho.accessToken}`)
        .send({ nome: 'Roubado' }),
      request(app)
        .delete(`/api/v1/contas-compartilhadas/${grupo.id}`)
        .set('Authorization', `Bearer ${estranho.accessToken}`)
        .send({ confirmacao: 'Casa' }),
    ]);

    for (const resposta of respostas) {
      expect(resposta.status).toBe(404);
    }
  });

  it('PATCH por um PARTICIPANTE responde 403 PAPEL_INSUFICIENTE', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .patch(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${participante.accessToken}`)
      .send({ nome: 'Nome Novo' });

    expect(resposta.status).toBe(403);
    expect((resposta.body as { codigo: string }).codigo).toBe('PAPEL_INSUFICIENTE');
  });

  it('PATCH pelo ADMINISTRADOR atualiza nome, descricao, cor e permiteParticipanteEditarProprias', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);

    const resposta = await request(app)
      .patch(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nome: 'Casa Nova',
        descricao: 'Apartamento',
        cor: '#16A34A',
        permiteParticipanteEditarProprias: false,
      });

    expect(resposta.status).toBe(200);
    const atualizado = (
      resposta.body as {
        data: {
          contaCompartilhada: {
            nome: string;
            descricao: string;
            cor: string;
            permiteParticipanteEditarProprias: boolean;
          };
        };
      }
    ).data.contaCompartilhada;
    expect(atualizado.nome).toBe('Casa Nova');
    expect(atualizado.descricao).toBe('Apartamento');
    expect(atualizado.cor).toBe('#16A34A');
    expect(atualizado.permiteParticipanteEditarProprias).toBe(false);
  });

  it('DELETE com confirmacao incorreta responde 400', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken, { nome: 'Casa' });

    const resposta = await request(app)
      .delete(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ confirmacao: 'nome errado' });

    expect(resposta.status).toBe(400);
  });

  it('DELETE com a confirmacao correta responde 204 e preserva o historico (exclusao logica)', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken, { nome: 'Casa' });

    const resposta = await request(app)
      .delete(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ confirmacao: 'Casa' });
    expect(resposta.status).toBe(204);

    const buscaApos = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(buscaApos.status).toBe(404);

    const linhaCrua = await prisma.contaCompartilhada.findUnique({ where: { id: grupo.id } });
    expect(linhaCrua).not.toBeNull();
    expect(linhaCrua?.excluidoEm).not.toBeNull();
    expect(linhaCrua?.nome).toBe('Casa');
  });

  it('DELETE por um PARTICIPANTE responde 403, mesmo com a confirmacao correta', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken, { nome: 'Casa' });
    await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .delete(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${participante.accessToken}`)
      .send({ confirmacao: 'Casa' });

    expect(resposta.status).toBe(403);
  });

  it('POST /imagem pelo ADMINISTRADOR salva a imagem e devolve a imagemUrl', async () => {
    const { accessToken } = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(accessToken);
    const png = await gerarPng();

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/imagem`)
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('imagem', png, 'grupo.png');

    expect(resposta.status).toBe(200);
    const { imagemUrl } = (resposta.body as { data: { imagemUrl: string } }).data;
    expect(imagemUrl).toContain(`/uploads/grupos/${grupo.id}.webp`);

    const atualizado = await prisma.contaCompartilhada.findUnique({ where: { id: grupo.id } });
    expect(atualizado?.imagemUrl).toBe(imagemUrl);
  });

  it('POST /imagem por um PARTICIPANTE responde 403', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');
    const png = await gerarPng();

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/imagem`)
      .set('Authorization', `Bearer ${participante.accessToken}`)
      .attach('imagem', png, 'grupo.png');

    expect(resposta.status).toBe(403);
  });

  it('todas as rotas exigem autenticacao', async () => {
    const resposta = await request(app).get('/api/v1/contas-compartilhadas');
    expect(resposta.status).toBe(401);
  });
});
