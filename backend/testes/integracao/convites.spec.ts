import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';
import { fabricarUsuario } from '../fabricas';

const app = criarServidor();

interface UsuarioAutenticado {
  usuarioId: string;
  email: string;
  accessToken: string;
}

async function criarUsuarioAutenticado(email?: string): Promise<UsuarioAutenticado> {
  const { usuario, accessToken } = await fabricarUsuario(email ? { email } : {});
  return { usuarioId: usuario.id, email: usuario.email, accessToken };
}

async function criarGrupo(accessToken: string, nome = 'Casa'): Promise<{ id: string }> {
  const resposta = await request(app)
    .post('/api/v1/contas-compartilhadas')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ nome });
  return (resposta.body as { data: { contaCompartilhada: { id: string } } }).data
    .contaCompartilhada;
}

async function enviarConvite(
  accessToken: string,
  contaCompartilhadaId: string,
  email: string,
  papel: 'PARTICIPANTE' | 'OBSERVADOR' = 'PARTICIPANTE',
): Promise<{ id: string; email: string; usuarioJaCadastrado: boolean }> {
  const resposta = await request(app)
    .post(`/api/v1/contas-compartilhadas/${contaCompartilhadaId}/convites`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ email, papel });
  return (
    resposta.body as {
      data: { convite: { id: string; email: string; usuarioJaCadastrado: boolean } };
    }
  ).data.convite;
}

describe('convites de conta compartilhada', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('RF-54: administrador envia convite e a resposta indica usuarioJaCadastrado', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/convites`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: convidado.email, papel: 'PARTICIPANTE', mensagem: 'Vem!' });

    expect(resposta.status).toBe(201);
    const convite = (
      resposta.body as {
        data: { convite: { situacao: string; papel: string; usuarioJaCadastrado: boolean } };
      }
    ).data.convite;
    expect(convite.situacao).toBe('PENDENTE');
    expect(convite.papel).toBe('PARTICIPANTE');
    expect(convite.usuarioJaCadastrado).toBe(true);
  });

  it('RN-37: convite para e-mail sem cadastro fica pendente com usuarioJaCadastrado false', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);

    const convite = await enviarConvite(admin.accessToken, grupo.id, 'sem-conta@exemplo.com');

    expect(convite.usuarioJaCadastrado).toBe(false);
  });

  it('RN-36: um segundo convite PENDENTE para o mesmo e-mail no mesmo grupo responde 409 CONVITE_DUPLICADO', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await enviarConvite(admin.accessToken, grupo.id, 'duplicado@exemplo.com');

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/convites`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: 'duplicado@exemplo.com', papel: 'PARTICIPANTE' });

    expect(resposta.status).toBe(409);
    expect((resposta.body as { codigo: string }).codigo).toBe('CONVITE_DUPLICADO');
  });

  it('RN-38: convidar quem ja e membro ativo responde 409 JA_E_MEMBRO', async () => {
    const admin = await criarUsuarioAutenticado();
    const membro = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await prisma.membroCompartilhado.create({
      data: { contaCompartilhadaId: grupo.id, usuarioId: membro.usuarioId, papel: 'PARTICIPANTE' },
    });

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/convites`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ email: membro.email, papel: 'PARTICIPANTE' });

    expect(resposta.status).toBe(409);
    expect((resposta.body as { codigo: string }).codigo).toBe('JA_E_MEMBRO');
  });

  it('envio de convite por um PARTICIPANTE (nao administrador) responde 403', async () => {
    const admin = await criarUsuarioAutenticado();
    const participante = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await prisma.membroCompartilhado.create({
      data: {
        contaCompartilhadaId: grupo.id,
        usuarioId: participante.usuarioId,
        papel: 'PARTICIPANTE',
      },
    });

    const resposta = await request(app)
      .post(`/api/v1/contas-compartilhadas/${grupo.id}/convites`)
      .set('Authorization', `Bearer ${participante.accessToken}`)
      .send({ email: 'alguem@exemplo.com', papel: 'PARTICIPANTE' });

    expect(resposta.status).toBe(403);
  });

  it('GET .../convites (administrador) lista os convites do grupo', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await enviarConvite(admin.accessToken, grupo.id, 'a@exemplo.com');
    await enviarConvite(admin.accessToken, grupo.id, 'b@exemplo.com');

    const resposta = await request(app)
      .get(`/api/v1/contas-compartilhadas/${grupo.id}/convites`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(resposta.status).toBe(200);
    const convites = (resposta.body as { data: { convites: { email: string }[] } }).data.convites;
    expect(convites.map((c) => c.email).sort()).toEqual(['a@exemplo.com', 'b@exemplo.com']);
  });

  it('GET /convites/recebidos encontra convites casados pelo e-mail do usuario autenticado', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken, 'Familia');
    await enviarConvite(admin.accessToken, grupo.id, convidado.email);

    const resposta = await request(app)
      .get('/api/v1/convites/recebidos')
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    expect(resposta.status).toBe(200);
    const convites = (
      resposta.body as {
        data: { convites: { contaCompartilhada: { nome: string; quantidadeMembros: number } }[] };
      }
    ).data.convites;
    expect(convites).toHaveLength(1);
    expect(convites[0]?.contaCompartilhada.nome).toBe('Familia');
    expect(convites[0]?.contaCompartilhada.quantidadeMembros).toBe(1);
  });

  it('RN-37: convite enviado antes do cadastro e encontrado depois que a pessoa se cadastra', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    await enviarConvite(admin.accessToken, grupo.id, 'futuro-membro@exemplo.com');

    const novoUsuario = await criarUsuarioAutenticado('futuro-membro@exemplo.com');

    const resposta = await request(app)
      .get('/api/v1/convites/recebidos')
      .set('Authorization', `Bearer ${novoUsuario.accessToken}`);

    expect((resposta.body as { data: { convites: unknown[] } }).data.convites).toHaveLength(1);
  });

  it('RN-39: aceitar cria o membro com o papel exato do convite e marca ACEITO', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken, 'Casa');
    const convite = await enviarConvite(admin.accessToken, grupo.id, convidado.email, 'OBSERVADOR');

    const resposta = await request(app)
      .post(`/api/v1/convites/${convite.id}/aceitar`)
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    expect(resposta.status).toBe(200);
    const membro = (
      resposta.body as {
        data: { membro: { papel: string; situacao: string; contaCompartilhada: { nome: string } } };
      }
    ).data.membro;
    expect(membro.papel).toBe('OBSERVADOR');
    expect(membro.situacao).toBe('ATIVO');
    expect(membro.contaCompartilhada.nome).toBe('Casa');

    const conviteAtualizado = await prisma.convite.findUniqueOrThrow({
      where: { id: convite.id },
    });
    expect(conviteAtualizado.situacao).toBe('ACEITO');
  });

  it('aceitar com e-mail autenticado diferente do convidado responde 403', async () => {
    const admin = await criarUsuarioAutenticado();
    const estranho = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const convite = await enviarConvite(admin.accessToken, grupo.id, 'destinatario@exemplo.com');

    const resposta = await request(app)
      .post(`/api/v1/convites/${convite.id}/aceitar`)
      .set('Authorization', `Bearer ${estranho.accessToken}`);

    expect(resposta.status).toBe(403);
  });

  it('aceitar um convite expirado responde 422 CONVITE_EXPIRADO', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const convite = await enviarConvite(admin.accessToken, grupo.id, convidado.email);
    await prisma.convite.update({
      where: { id: convite.id },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });

    const resposta = await request(app)
      .post(`/api/v1/convites/${convite.id}/aceitar`)
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('CONVITE_EXPIRADO');
  });

  it('aceitar um convite ja respondido responde 422 REGRA_NEGOCIO', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const convite = await enviarConvite(admin.accessToken, grupo.id, convidado.email);
    await request(app)
      .post(`/api/v1/convites/${convite.id}/aceitar`)
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    const resposta = await request(app)
      .post(`/api/v1/convites/${convite.id}/aceitar`)
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('REGRA_NEGOCIO');
  });

  it('recusar marca o convite como RECUSADO e responde 204', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const convite = await enviarConvite(admin.accessToken, grupo.id, convidado.email);

    const resposta = await request(app)
      .post(`/api/v1/convites/${convite.id}/recusar`)
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    expect(resposta.status).toBe(204);
    expect((await prisma.convite.findUniqueOrThrow({ where: { id: convite.id } })).situacao).toBe(
      'RECUSADO',
    );

    const membro = await prisma.membroCompartilhado.findFirst({
      where: { contaCompartilhadaId: grupo.id, usuarioId: convidado.usuarioId },
    });
    expect(membro).toBeNull();
  });

  it('DELETE pelo administrador do grupo cancela o convite (204, situacao CANCELADO)', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const convite = await enviarConvite(admin.accessToken, grupo.id, 'cancelavel@exemplo.com');

    const resposta = await request(app)
      .delete(`/api/v1/convites/${convite.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(resposta.status).toBe(204);
    expect((await prisma.convite.findUniqueOrThrow({ where: { id: convite.id } })).situacao).toBe(
      'CANCELADO',
    );
  });

  it('DELETE por quem nao e administrador do grupo do convite responde 404', async () => {
    const admin = await criarUsuarioAutenticado();
    const estranho = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const convite = await enviarConvite(admin.accessToken, grupo.id, 'x@exemplo.com');

    const resposta = await request(app)
      .delete(`/api/v1/convites/${convite.id}`)
      .set('Authorization', `Bearer ${estranho.accessToken}`);

    expect(resposta.status).toBe(404);
  });

  it('um convite ja respondido nao pode ser cancelado (422 REGRA_NEGOCIO)', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const convite = await enviarConvite(admin.accessToken, grupo.id, convidado.email);
    await request(app)
      .post(`/api/v1/convites/${convite.id}/recusar`)
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    const resposta = await request(app)
      .delete(`/api/v1/convites/${convite.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(resposta.status).toBe(422);
    expect((resposta.body as { codigo: string }).codigo).toBe('REGRA_NEGOCIO');
  });

  it('um ex-membro reconvidado reativa o mesmo vinculo em vez de violar a unicidade (grupo, usuario)', async () => {
    const admin = await criarUsuarioAutenticado();
    const exMembro = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const membroOriginal = await prisma.membroCompartilhado.create({
      data: {
        contaCompartilhadaId: grupo.id,
        usuarioId: exMembro.usuarioId,
        papel: 'PARTICIPANTE',
      },
    });
    await prisma.membroCompartilhado.update({
      where: { id: membroOriginal.id },
      data: { situacao: 'SAIU', saiuEm: new Date() },
    });

    const convite = await enviarConvite(admin.accessToken, grupo.id, exMembro.email, 'OBSERVADOR');
    const resposta = await request(app)
      .post(`/api/v1/convites/${convite.id}/aceitar`)
      .set('Authorization', `Bearer ${exMembro.accessToken}`);

    expect(resposta.status).toBe(200);
    const linhas = await prisma.membroCompartilhado.findMany({
      where: { contaCompartilhadaId: grupo.id, usuarioId: exMembro.usuarioId },
    });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.situacao).toBe('ATIVO');
    expect(linhas[0]?.papel).toBe('OBSERVADOR');
  });
});
