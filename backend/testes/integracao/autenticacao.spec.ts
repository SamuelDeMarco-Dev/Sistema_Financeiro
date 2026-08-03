import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { hashToken } from '@/utilitarios/token';
import { limparBanco } from '../configuracao/banco-teste';

const app = criarServidor();

const CADASTRO_VALIDO = {
  nome: 'Samuel De Marco',
  email: 'samuel@exemplo.com',
  senha: 'SenhaForte@2026',
  confirmacaoSenha: 'SenhaForte@2026',
};

/** As rotas de verificacao de e-mail chegam na issue #15 — ate la, testes
 * que precisam de um usuario ja verificado ajustam o banco diretamente. */
async function criarUsuarioVerificado(
  sobrescritas: Partial<typeof CADASTRO_VALIDO> = {},
): Promise<{ email: string; senha: string }> {
  const dados = { ...CADASTRO_VALIDO, ...sobrescritas };
  await request(app).post('/api/v1/autenticacao/cadastrar').send(dados);
  await prisma.usuario.update({
    where: { email: dados.email.toLowerCase() },
    data: { emailVerificadoEm: new Date() },
  });
  return { email: dados.email, senha: dados.senha };
}

function extrairTokenDoCookie(headers: Record<string, unknown>): string {
  const cookies = headers['set-cookie'] as string[] | undefined;
  const cookieRefresh = cookies?.find((c) => c.startsWith('refreshToken=')) ?? '';
  return /refreshToken=([^;]+)/.exec(cookieRefresh)?.[1] ?? '';
}

describe('POST /api/v1/autenticacao/cadastrar', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('cria o usuario e o perfil com os padroes, sem expor dado sensivel', async () => {
    const resposta = await request(app)
      .post('/api/v1/autenticacao/cadastrar')
      .send(CADASTRO_VALIDO);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      success: true,
      data: {
        usuario: {
          nome: 'Samuel De Marco',
          email: 'samuel@exemplo.com',
          emailVerificado: false,
        },
      },
    });
    expect(resposta.body).not.toHaveProperty('data.usuario.senhaHash');
    expect(JSON.stringify(resposta.body)).not.toContain('SenhaForte@2026');

    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { email: 'samuel@exemplo.com' },
      include: { perfil: true },
    });
    expect(usuario.senhaHash).not.toBe('SenhaForte@2026');
    expect(usuario.tokenVerificacao).toBeTruthy();
    expect(usuario.perfil).toMatchObject({
      moedaPadrao: 'BRL',
      tema: 'SISTEMA',
      timezone: 'America/Sao_Paulo',
    });
  });

  it('responde 409 EMAIL_JA_CADASTRADO para e-mail duplicado, inclusive com caixa diferente', async () => {
    await request(app).post('/api/v1/autenticacao/cadastrar').send(CADASTRO_VALIDO);

    const resposta = await request(app)
      .post('/api/v1/autenticacao/cadastrar')
      .send({ ...CADASTRO_VALIDO, email: 'SAMUEL@Exemplo.com' });

    expect(resposta.status).toBe(409);
    expect(resposta.body).toMatchObject({ success: false, codigo: 'EMAIL_JA_CADASTRADO' });
  });

  it('responde 400 VALIDACAO com o campo e o motivo quando a senha nao atende as regras', async () => {
    const resposta = await request(app)
      .post('/api/v1/autenticacao/cadastrar')
      .send({ ...CADASTRO_VALIDO, senha: 'fraca', confirmacaoSenha: 'fraca' });

    expect(resposta.status).toBe(400);
    expect(resposta.body).toMatchObject({
      codigo: 'VALIDACAO',
      errors: expect.arrayContaining([expect.objectContaining({ campo: 'senha' })]) as unknown,
    });
  });

  it('responde 400 VALIDACAO quando a confirmacao de senha nao corresponde', async () => {
    const resposta = await request(app)
      .post('/api/v1/autenticacao/cadastrar')
      .send({ ...CADASTRO_VALIDO, confirmacaoSenha: 'OutraSenha@2026' });

    expect(resposta.status).toBe(400);
    expect(resposta.body).toMatchObject({
      errors: expect.arrayContaining([
        expect.objectContaining({ campo: 'confirmacaoSenha' }),
      ]) as unknown,
    });
  });
});

describe('POST /api/v1/autenticacao/entrar', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('autentica com sucesso: 200, cookie httpOnly/SameSite=Strict/Path correto e refresh token hasheado no banco', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'login-sucesso@exemplo.com' });

    const resposta = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email, senha, lembrarMe: false });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      success: true,
      data: {
        expiraEm: 900,
        usuario: { email: 'login-sucesso@exemplo.com', perfil: { moedaPadrao: 'BRL' } },
      },
    });
    expect(resposta.body).not.toHaveProperty('data.usuario.senhaHash');

    const cookies = resposta.headers['set-cookie'] as unknown as string[];
    const cookieRefresh = cookies.find((c) => c.startsWith('refreshToken=')) ?? '';
    expect(cookieRefresh).toBeTruthy();
    expect(cookieRefresh).toContain('HttpOnly');
    expect(cookieRefresh).toContain('SameSite=Strict');
    expect(cookieRefresh).toContain('Path=/api/v1/autenticacao');

    const tokenBruto = /refreshToken=([^;]+)/.exec(cookieRefresh)?.[1] ?? '';
    expect(tokenBruto).toBeTruthy();
    const tokenNoBanco = await prisma.tokenRenovacao.findFirst();
    expect(tokenNoBanco?.tokenHash).toBe(hashToken(tokenBruto));
    expect(tokenNoBanco?.tokenHash).not.toBe(tokenBruto);
  });

  it('responde 401 CREDENCIAIS_INVALIDAS com a MESMA mensagem para e-mail inexistente e senha errada', async () => {
    await criarUsuarioVerificado({ email: 'senha-errada@exemplo.com' });

    const respostaEmailInexistente = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email: 'nao-existe-nunca@exemplo.com', senha: 'Qualquer@123' });

    const respostaSenhaErrada = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email: 'senha-errada@exemplo.com', senha: 'SenhaErrada@2026' });

    expect(respostaEmailInexistente.status).toBe(401);
    expect(respostaSenhaErrada.status).toBe(401);
    expect(respostaEmailInexistente.body).toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' });

    const corpoEmailInexistente = respostaEmailInexistente.body as { message: string };
    const corpoSenhaErrada = respostaSenhaErrada.body as { message: string };
    expect(corpoEmailInexistente.message).toBe(corpoSenhaErrada.message);
  });

  it('responde 403 EMAIL_NAO_VERIFICADO quando a senha esta certa mas a conta nao foi verificada', async () => {
    await request(app)
      .post('/api/v1/autenticacao/cadastrar')
      .send({ ...CADASTRO_VALIDO, email: 'nao-verificado@exemplo.com' });

    const resposta = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email: 'nao-verificado@exemplo.com', senha: CADASTRO_VALIDO.senha });

    expect(resposta.status).toBe(403);
    expect(resposta.body).toMatchObject({ codigo: 'EMAIL_NAO_VERIFICADO' });
  });

  it('bloqueia a conta apos 5 tentativas falhas e responde 403 CONTA_BLOQUEADA com meta.desbloqueiaEm', async () => {
    const { email } = await criarUsuarioVerificado({ email: 'bloqueio@exemplo.com' });

    // 5 tentativas falhas da mesma origem (consome o limitador por IP+e-mail tambem).
    for (let i = 0; i < 5; i += 1) {
      await request(app)
        .post('/api/v1/autenticacao/entrar')
        .send({ email, senha: 'SenhaErrada@2026' });
    }

    // 6a tentativa de outra origem (X-Forwarded-For): passa pelo limitador
    // por IP (chave diferente) e alcanca o bloqueio por conta no servico.
    const resposta = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .set('X-Forwarded-For', '203.0.113.9')
      .send({ email, senha: 'SenhaErrada@2026' });

    expect(resposta.status).toBe(403);
    expect(resposta.body).toMatchObject({ codigo: 'CONTA_BLOQUEADA' });
    const corpo = resposta.body as { meta?: { desbloqueiaEm?: string } };
    expect(corpo.meta?.desbloqueiaEm).toBeTruthy();
  });

  it('responde 429 LIMITE_EXCEDIDO com Retry-After apos exceder o limite por IP+e-mail', async () => {
    const email = 'limite-taxa@exemplo.com';

    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/v1/autenticacao/entrar').send({ email, senha: 'Qualquer@123' });
    }

    const resposta = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email, senha: 'Qualquer@123' });

    expect(resposta.status).toBe(429);
    expect(resposta.body).toMatchObject({ codigo: 'LIMITE_EXCEDIDO' });
    expect(resposta.headers['retry-after']).toBeTruthy();
  });
});

describe('POST /api/v1/autenticacao/renovar', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('renova com sucesso: 200, novo access token, novo cookie, e o token antigo fica revogado', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'renovar@exemplo.com' });
    const login = await request(app).post('/api/v1/autenticacao/entrar').send({ email, senha });
    const tokenAntigo = extrairTokenDoCookie(login.headers);

    const resposta = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${tokenAntigo}`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ success: true, data: { expiraEm: 900 } });

    const tokenNovo = extrairTokenDoCookie(resposta.headers);
    expect(tokenNovo).toBeTruthy();
    expect(tokenNovo).not.toBe(tokenAntigo);

    const registroAntigo = await prisma.tokenRenovacao.findFirst({
      where: { tokenHash: hashToken(tokenAntigo) },
    });
    const registroNovo = await prisma.tokenRenovacao.findFirst({
      where: { tokenHash: hashToken(tokenNovo) },
    });
    expect(registroAntigo?.revogadoEm).toBeTruthy();
    expect(registroAntigo?.substituidoPorId).toBe(registroNovo?.id);
    expect(registroNovo?.revogadoEm).toBeNull();
  });

  it('o token antigo deixa de funcionar imediatamente apos a rotacao', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'rotacao@exemplo.com' });
    const login = await request(app).post('/api/v1/autenticacao/entrar').send({ email, senha });
    const tokenAntigo = extrairTokenDoCookie(login.headers);

    await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${tokenAntigo}`);

    const segundaTentativa = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${tokenAntigo}`);

    expect(segundaTentativa.status).toBe(401);
    expect(segundaTentativa.body).toMatchObject({ codigo: 'NAO_AUTENTICADO' });
  });

  it('reuso de token revogado invalida TODA a familia (04-API.md §7.3)', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'reuso@exemplo.com' });
    const login = await request(app).post('/api/v1/autenticacao/entrar').send({ email, senha });
    const token1 = extrairTokenDoCookie(login.headers);

    const renovacao1 = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${token1}`);
    const token2 = extrairTokenDoCookie(renovacao1.headers);

    // Reusa o token1, ja revogado pela rotacao anterior.
    const reuso = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${token1}`);
    expect(reuso.status).toBe(401);

    // token2 era valido ate agora, mas a familia inteira foi revogada.
    const tentativaComToken2 = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${token2}`);
    expect(tentativaComToken2.status).toBe(401);

    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });
    const tokensAtivos = await prisma.tokenRenovacao.count({
      where: { usuarioId: usuario.id, revogadoEm: null },
    });
    expect(tokensAtivos).toBe(0);
  });

  it('responde 401 NAO_AUTENTICADO quando o cookie esta ausente', async () => {
    const resposta = await request(app).post('/api/v1/autenticacao/renovar');

    expect(resposta.status).toBe(401);
    expect(resposta.body).toMatchObject({ codigo: 'NAO_AUTENTICADO' });
  });

  it('responde 401 (nao 500) quando o token esta expirado', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'expirado@exemplo.com' });
    const login = await request(app).post('/api/v1/autenticacao/entrar').send({ email, senha });
    const token = extrairTokenDoCookie(login.headers);

    await prisma.tokenRenovacao.updateMany({
      where: { tokenHash: hashToken(token) },
      data: { expiraEm: new Date(Date.now() - 1000) },
    });

    const resposta = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${token}`);

    expect(resposta.status).toBe(401);
    expect(resposta.body).toMatchObject({ codigo: 'NAO_AUTENTICADO' });
  });
});

async function logar(
  email: string,
  senha: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const resposta = await request(app).post('/api/v1/autenticacao/entrar').send({ email, senha });
  const corpo = resposta.body as { data: { accessToken: string } };
  return {
    accessToken: corpo.data.accessToken,
    refreshToken: extrairTokenDoCookie(resposta.headers),
  };
}

describe('POST /api/v1/autenticacao/sair e /sair-todos', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('rejeita sem token de acesso (401 NAO_AUTENTICADO)', async () => {
    const resposta = await request(app).post('/api/v1/autenticacao/sair');

    expect(resposta.status).toBe(401);
    expect(resposta.body).toMatchObject({ codigo: 'NAO_AUTENTICADO' });
  });

  it('sair: 204, limpa o cookie e o refresh token nao renova mais', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'sair@exemplo.com' });
    const { accessToken, refreshToken } = await logar(email, senha);

    const resposta = await request(app)
      .post('/api/v1/autenticacao/sair')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(resposta.status).toBe(204);
    const cookieLimpo = (resposta.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('refreshToken='),
    );
    expect(cookieLimpo).toMatch(/refreshToken=;/);

    const tentativaRenovar = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${refreshToken}`);
    expect(tentativaRenovar.status).toBe(401);
  });

  it('sair-todos: 204 e nenhuma sessao do usuario renova mais', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'sair-todos@exemplo.com' });
    const sessao1 = await logar(email, senha);
    const sessao2 = await logar(email, senha);

    const resposta = await request(app)
      .post('/api/v1/autenticacao/sair-todos')
      .set('Authorization', `Bearer ${sessao1.accessToken}`)
      .set('Cookie', `refreshToken=${sessao1.refreshToken}`);
    expect(resposta.status).toBe(204);

    const renovarSessao1 = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${sessao1.refreshToken}`);
    const renovarSessao2 = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${sessao2.refreshToken}`);

    expect(renovarSessao1.status).toBe(401);
    expect(renovarSessao2.status).toBe(401);
  });
});
