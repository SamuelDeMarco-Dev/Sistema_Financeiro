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
): Promise<{ id: string; token: string }> {
  await request(app)
    .post(`/api/v1/contas-compartilhadas/${contaCompartilhadaId}/convites`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ email, papel: 'PARTICIPANTE' });
  // O token nunca sai na resposta da API (so vai por e-mail) — le direto
  // do banco, como o link do e-mail faria na pratica.
  const convite = await prisma.convite.findFirstOrThrow({
    where: { contaCompartilhadaId, email: email.toLowerCase() },
  });
  return { id: convite.id, token: convite.token };
}

describe('GET /api/v1/convites/token/:token (previa publica)', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('funciona sem cabecalho Authorization e retorna apenas o minimo (nome do grupo, papel, validade, situacao, requerCadastro)', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken, 'Casa');
    const { token } = await enviarConvite(admin.accessToken, grupo.id, 'convidado@exemplo.com');

    const resposta = await request(app).get(`/api/v1/convites/token/${token}`);

    expect(resposta.status).toBe(200);
    const convite = (
      resposta.body as {
        data: {
          convite: {
            situacao: string;
            papel: string;
            expiraEm: string;
            contaCompartilhada: { nome: string };
            enviadoPor: { nome: string };
            emailConvidado: string;
            requerCadastro: boolean;
          };
        };
      }
    ).data.convite;
    expect(convite.situacao).toBe('PENDENTE');
    expect(convite.papel).toBe('PARTICIPANTE');
    expect(convite.contaCompartilhada.nome).toBe('Casa');
    expect(convite.enviadoPor.nome).toBeTruthy();
  });

  it('nunca retorna dado financeiro, lista de membros ou e-mail completo (inspeciona o JSON inteiro)', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const { token } = await enviarConvite(admin.accessToken, grupo.id, 'privacidade@exemplo.com');

    const resposta = await request(app).get(`/api/v1/convites/token/${token}`);
    const corpoTexto = JSON.stringify(resposta.body).toLowerCase();

    expect(corpoTexto).not.toContain('saldo');
    expect(corpoTexto).not.toContain('movimenta');
    expect(corpoTexto).not.toContain('membros');
    expect(corpoTexto).not.toContain('privacidade@exemplo.com');
  });

  it('mascara o e-mail do convidado', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const { token } = await enviarConvite(admin.accessToken, grupo.id, 'anaclara@exemplo.com');

    const resposta = await request(app).get(`/api/v1/convites/token/${token}`);

    expect(
      (resposta.body as { data: { convite: { emailConvidado: string } } }).data.convite
        .emailConvidado,
    ).toBe('an***@exemplo.com');
  });

  it('requerCadastro e true quando o e-mail convidado nao tem conta', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const { token } = await enviarConvite(admin.accessToken, grupo.id, 'sem-conta@exemplo.com');

    const resposta = await request(app).get(`/api/v1/convites/token/${token}`);

    expect(
      (resposta.body as { data: { convite: { requerCadastro: boolean } } }).data.convite
        .requerCadastro,
    ).toBe(true);
  });

  it('requerCadastro e false quando o e-mail convidado ja tem conta', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const { token } = await enviarConvite(admin.accessToken, grupo.id, convidado.email);

    const resposta = await request(app).get(`/api/v1/convites/token/${token}`);

    expect(
      (resposta.body as { data: { convite: { requerCadastro: boolean } } }).data.convite
        .requerCadastro,
    ).toBe(false);
  });

  it('token inexistente e token expirado produzem respostas indistinguiveis (404)', async () => {
    const admin = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const { id, token: tokenExpirado } = await enviarConvite(
      admin.accessToken,
      grupo.id,
      'vai-expirar@exemplo.com',
    );
    await prisma.convite.update({ where: { id }, data: { expiraEm: new Date(Date.now() - 1000) } });

    const respostaInexistente = await request(app).get(
      '/api/v1/convites/token/token-que-nunca-existiu',
    );
    const respostaExpirada = await request(app).get(`/api/v1/convites/token/${tokenExpirado}`);

    expect(respostaInexistente.status).toBe(404);
    expect(respostaExpirada.status).toBe(404);
    expect(respostaExpirada.body).toEqual(respostaInexistente.body);
  });

  it('convite ja respondido (ACEITO) continua visivel na previa, com a situacao real', async () => {
    const admin = await criarUsuarioAutenticado();
    const convidado = await criarUsuarioAutenticado();
    const grupo = await criarGrupo(admin.accessToken);
    const { id, token } = await enviarConvite(admin.accessToken, grupo.id, convidado.email);
    await request(app)
      .post(`/api/v1/convites/${id}/aceitar`)
      .set('Authorization', `Bearer ${convidado.accessToken}`);

    const resposta = await request(app).get(`/api/v1/convites/token/${token}`);

    expect(resposta.status).toBe(200);
    expect(
      (resposta.body as { data: { convite: { situacao: string } } }).data.convite.situacao,
    ).toBe('ACEITO');
  });

  it('rate limit por IP: apos exceder o limite, responde 429 LIMITE_EXCEDIDO', async () => {
    let ultimaResposta;
    for (let i = 0; i < 25; i += 1) {
      ultimaResposta = await request(app).get('/api/v1/convites/token/token-inexistente-rl');
    }

    expect(ultimaResposta?.status).toBe(429);
    expect(ultimaResposta?.body).toMatchObject({ codigo: 'LIMITE_EXCEDIDO' });
  });
});
