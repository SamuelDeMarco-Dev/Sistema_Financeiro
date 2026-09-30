import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarUsuario } from '../fabricas';

const app = criarServidor();

interface UsuarioAutenticado {
  usuarioId: string;
  accessToken: string;
}

async function criarUsuarioAutenticado(): Promise<UsuarioAutenticado> {
  const { usuario, accessToken } = await fabricarUsuario();
  return { usuarioId: usuario.id, accessToken };
}

async function criarGrupo(accessToken: string): Promise<{ id: string }> {
  const resposta = await request(app)
    .post('/api/v1/contas-compartilhadas')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ nome: 'Familia' });
  return (resposta.body as { data: { contaCompartilhada: { id: string } } }).data
    .contaCompartilhada;
}

async function adicionarMembro(
  contaCompartilhadaId: string,
  usuarioId: string,
  papel: 'PARTICIPANTE' | 'OBSERVADOR',
): Promise<{ id: string }> {
  return prisma.membroCompartilhado.create({ data: { contaCompartilhadaId, usuarioId, papel } });
}

async function buscarMeuMembro(
  contaCompartilhadaId: string,
  usuarioId: string,
): Promise<{ id: string; papel: string; situacao: string }> {
  const membro = await prisma.membroCompartilhado.findFirstOrThrow({
    where: { contaCompartilhadaId, usuarioId },
  });
  return membro;
}

describe('/api/v1/contas-compartilhadas/:contaCompartilhadaId/membros e acoes relacionadas', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('GET /membros lista os membros ativos com os dados do usuario', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}/membros`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(resposta.status).toBe(200);
    const membros = (
      resposta.body as { data: { membros: { papel: string; usuario: { id: string } }[] } }
    ).data.membros;
    expect(membros).toHaveLength(2);
    expect(membros.map((m) => m.papel).sort()).toEqual(['ADMINISTRADOR', 'PARTICIPANTE']);
  });

  it('GET /membros por quem nao e membro responde 404', async () => {
    const admin = await criarUsuarioAutenticado();
    const estranho = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);

    const resposta = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}/membros`)
      .set('Authorization', `Bearer ${estranho.accessToken}`);

    expect(resposta.status).toBe(404);
  });

  it('PATCH altera o papel de PARTICIPANTE para OBSERVADOR', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membro = await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .patch(`/api/v1/contas-compartilhadas/${grupo.id}/membros/${membro.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ papel: 'OBSERVADOR' });

    expect(resposta.status).toBe(200);
    expect((resposta.body as { data: { membro: { papel: string } } }).data.membro.papel).toBe(
      'OBSERVADOR',
    );
  });

  it('PATCH tentando alterar o proprio papel responde 422 REGRA_NEGOCIO', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const meuMembro = await buscarMeuMembro(grupo.id, admin.usuarioId);

    const resposta = await request(app)
      .patch(`/api/v1/contas-compartilhadas/${grupo.id}/membros/${meuMembro.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ papel: 'OBSERVADOR' });

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('REGRA_NEGOCIO');
  });

  it('PATCH tentando definir ADMINISTRADOR responde 422 apontando a rota correta', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membro = await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .patch(`/api/v1/contas-compartilhadas/${grupo.id}/membros/${membro.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ papel: 'ADMINISTRADOR' });

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string; message: string }).message).toContain(
      'transferir-administracao',
    );
  });

  it('PATCH por um PARTICIPANTE (nao administrador) responde 403', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const outro = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');
    const membroOutro = await adicionarMembro(grupo.id, outro.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .patch(`/api/v1/contas-compartilhadas/${grupo.id}/membros/${membroOutro.id}`)
      .set('Authorization', `Bearer ${participante.accessToken}`)
      .send({ papel: 'OBSERVADOR' });

    expect(resposta.status).toBe(403);
  });

  it('DELETE remove um participante (situacao REMOVIDO) e preserva suas movimentacoes (RN-34)', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membro = await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');
    const movimentacao = await prisma.movimentacao.create({
      data: {
        usuarioId: participante.usuarioId,
        contaCompartilhadaId: grupo.id,
        tipo: 'DESPESA',
        descricao: 'Compra do participante removido',
        valor: '30.00',
        dataCompetencia: new Date('2026-08-05'),
      },
    });

    const resposta = await request(app)
      .delete(`/api/v1/contas-compartilhadas/${grupo.id}/membros/${membro.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);
    expect(resposta.status).toBe(204);

    const membroAtualizado = await prisma.membroCompartilhado.findUniqueOrThrow({
      where: { id: membro.id },
    });
    expect(membroAtualizado.situacao).toBe('REMOVIDO');

    const movimentacaoPreservada = await prisma.movimentacao.findUniqueOrThrow({
      where: { id: movimentacao.id },
    });
    expect(movimentacaoPreservada.usuarioId).toBe(participante.usuarioId);
    expect(movimentacaoPreservada.excluidoEm).toBeNull();
  });

  it('membro removido perde acesso imediatamente (404 nas rotas do grupo)', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membro = await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    await request(app)
      .delete(`/api/v1/contas-compartilhadas/${grupo.id}/membros/${membro.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    const resposta = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}`)
      .set('Authorization', `Bearer ${participante.accessToken}`);
    expect(resposta.status).toBe(404);
  });

  it('DELETE tentando remover o administrador responde 422 ADMINISTRADOR_UNICO', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const meuMembro = await buscarMeuMembro(grupo.id, admin.usuarioId);

    const resposta = await request(app)
      .delete(`/api/v1/contas-compartilhadas/${grupo.id}/membros/${meuMembro.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('ADMINISTRADOR_UNICO');
  });

  it('POST /transferir-administracao troca os dois papeis atomicamente', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membroParticipante = await adicionarMembro(
      grupo.id,
      participante.usuarioId,
      'PARTICIPANTE',
    );
    const membroAdminAntigo = await buscarMeuMembro(grupo.id, admin.usuarioId);

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/transferir-administracao`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ novoAdministradorMembroId: membroParticipante.id });

    expect(resposta.status).toBe(200);
    const corpo = (
      resposta.body as {
        data: {
          administradorAnterior: { membroId: string; papel: string };
          novoAdministrador: { membroId: string; papel: string };
        };
      }
    ).data;
    expect(corpo.administradorAnterior).toEqual({
      membroId: membroAdminAntigo.id,
      papel: 'PARTICIPANTE',
    });
    expect(corpo.novoAdministrador).toEqual({
      membroId: membroParticipante.id,
      papel: 'ADMINISTRADOR',
    });

    const administradoresAtivos = await prisma.membroCompartilhado.count({
      where: { contaCompartilhadaId: grupo.id, papel: 'ADMINISTRADOR', situacao: 'ATIVO' },
    });
    expect(administradoresAtivos).toBe(1);
  });

  it('POST /transferir-administracao para um membro de outro grupo responde 404', async () => {
    const admin = await criarUsuarioAutenticado();
    const outroAdmin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const outroGrupo = await criarGrupo(outroAdmin.accessToken);
    const membroDoOutroGrupo = await buscarMeuMembro(outroGrupo.id, outroAdmin.usuarioId);

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/transferir-administracao`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ novoAdministradorMembroId: membroDoOutroGrupo.id });

    expect(resposta.status).toBe(404);
  });

  it('POST /sair por um PARTICIPANTE marca SAIU e responde 204', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membro = await adicionarMembro(grupo.id, participante.usuarioId, 'PARTICIPANTE');

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/sair`)
      .set('Authorization', `Bearer ${participante.accessToken}`);

    expect(resposta.status).toBe(204);
    const membroAtualizado = await prisma.membroCompartilhado.findUniqueOrThrow({
      where: { id: membro.id },
    });
    expect(membroAtualizado.situacao).toBe('SAIU');
  });

  it('POST /sair pelo administrador responde 422 ADMINISTRADOR_UNICO', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/sair`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('ADMINISTRADOR_UNICO');
  });

  it('depois de transferir a administracao, o antigo administrador consegue sair normalmente', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membroParticipante = await adicionarMembro(
      grupo.id,
      participante.usuarioId,
      'PARTICIPANTE',
    );

    await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/transferir-administracao`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ novoAdministradorMembroId: membroParticipante.id });

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/sair`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(resposta.status).toBe(204);
  });
});
