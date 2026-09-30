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

  // RN-54 fala em tentativas **falhas**. Entrar em varios aparelhos na mesma
  // janela e' uso legitimo e nao pode consumir o limite — o limitador conta
  // so as respostas de erro (`apenasFalhas`).
  it('logins bem-sucedidos nao consomem o limite (RN-54 conta apenas as falhas)', async () => {
    const { email, senha } = await criarUsuarioVerificado({
      email: 'varios-aparelhos@exemplo.com',
    });

    for (let i = 0; i < 8; i += 1) {
      const resposta = await request(app)
        .post('/api/v1/autenticacao/entrar')
        .send({ email, senha });

      expect(resposta.status).toBe(200);
    }
  });

  it('o limite ainda vale quando as falhas se misturam a logins validos', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'mistura@exemplo.com' });

    // Alterna sucesso e falha: so as 5 falhas contam, e a 6a leva 429 antes
    // de o servico sequer avaliar a senha.
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/v1/autenticacao/entrar').send({ email, senha });
      await request(app)
        .post('/api/v1/autenticacao/entrar')
        .send({ email, senha: 'SenhaErrada@2026' });
    }

    const resposta = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email, senha: 'SenhaErrada@2026' });

    expect(resposta.status).toBe(429);
    expect(resposta.body).toMatchObject({ codigo: 'LIMITE_EXCEDIDO' });
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

describe('POST /api/v1/autenticacao/verificar-email', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('verifica o e-mail com um token valido', async () => {
    await request(app)
      .post('/api/v1/autenticacao/cadastrar')
      .send({ ...CADASTRO_VALIDO, email: 'verificar@exemplo.com' });
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { email: 'verificar@exemplo.com' },
    });

    const resposta = await request(app)
      .post('/api/v1/autenticacao/verificar-email')
      .send({ token: usuario.tokenVerificacao });

    expect(resposta.status).toBe(200);
    const atualizado = await prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    expect(atualizado.emailVerificadoEm).toBeTruthy();
    expect(atualizado.tokenVerificacao).toBeNull();
  });

  it('responde 400 VALIDACAO na segunda vez que o mesmo token e usado', async () => {
    await request(app)
      .post('/api/v1/autenticacao/cadastrar')
      .send({ ...CADASTRO_VALIDO, email: 'duplo-uso@exemplo.com' });
    const usuario = await prisma.usuario.findUniqueOrThrow({
      where: { email: 'duplo-uso@exemplo.com' },
    });

    await request(app)
      .post('/api/v1/autenticacao/verificar-email')
      .send({ token: usuario.tokenVerificacao });
    const segundaVez = await request(app)
      .post('/api/v1/autenticacao/verificar-email')
      .send({ token: usuario.tokenVerificacao });

    expect(segundaVez.status).toBe(400);
    expect(segundaVez.body).toMatchObject({ codigo: 'VALIDACAO' });
  });
});

describe('POST /api/v1/autenticacao/esqueci-senha e /redefinir-senha', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('esqueci-senha responde 200 com a MESMA mensagem para e-mail existente e inexistente', async () => {
    await criarUsuarioVerificado({ email: 'existe@exemplo.com' });

    const respostaExistente = await request(app)
      .post('/api/v1/autenticacao/esqueci-senha')
      .send({ email: 'existe@exemplo.com' });
    const respostaInexistente = await request(app)
      .post('/api/v1/autenticacao/esqueci-senha')
      .send({ email: 'nao-existe-mesmo@exemplo.com' });

    expect(respostaExistente.status).toBe(200);
    expect(respostaInexistente.status).toBe(200);
    const corpoExistente = respostaExistente.body as { message: string };
    const corpoInexistente = respostaInexistente.body as { message: string };
    expect(corpoExistente.message).toBe(corpoInexistente.message);
  });

  it('redefine a senha com token valido e revoga TODAS as sessoes', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'redefinir@exemplo.com' });
    await logar(email, senha);
    await logar(email, senha);

    await request(app).post('/api/v1/autenticacao/esqueci-senha').send({ email });
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });

    const resposta = await request(app).post('/api/v1/autenticacao/redefinir-senha').send({
      token: usuario.tokenRecuperacao,
      senha: 'SenhaNova@2026',
      confirmacaoSenha: 'SenhaNova@2026',
    });
    expect(resposta.status).toBe(200);

    const tokensAtivos = await prisma.tokenRenovacao.count({
      where: { usuarioId: usuario.id, revogadoEm: null },
    });
    expect(tokensAtivos).toBe(0);

    // A senha antiga nao funciona mais; a nova sim.
    const loginComSenhaAntiga = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email, senha });
    expect(loginComSenhaAntiga.status).toBe(401);

    const loginComSenhaNova = await request(app)
      .post('/api/v1/autenticacao/entrar')
      .send({ email, senha: 'SenhaNova@2026' });
    expect(loginComSenhaNova.status).toBe(200);
  });

  it('responde 400 quando o token de recuperacao esta expirado (> 1h)', async () => {
    const { email } = await criarUsuarioVerificado({ email: 'token-velho@exemplo.com' });
    await request(app).post('/api/v1/autenticacao/esqueci-senha').send({ email });
    await prisma.usuario.updateMany({
      where: { email },
      data: { tokenRecuperacaoExpiraEm: new Date(Date.now() - 1000) },
    });
    const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email } });

    const resposta = await request(app).post('/api/v1/autenticacao/redefinir-senha').send({
      token: usuario.tokenRecuperacao,
      senha: 'SenhaNova@2026',
      confirmacaoSenha: 'SenhaNova@2026',
    });

    expect(resposta.status).toBe(400);
  });
});

describe('PATCH /api/v1/autenticacao/alterar-senha', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('altera a senha, mantem a sessao atual e revoga as outras', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'alterar-senha@exemplo.com' });
    const sessaoAtual = await logar(email, senha);
    const outraSessao = await logar(email, senha);

    const resposta = await request(app)
      .patch('/api/v1/autenticacao/alterar-senha')
      .set('Authorization', `Bearer ${sessaoAtual.accessToken}`)
      .set('Cookie', `refreshToken=${sessaoAtual.refreshToken}`)
      .send({
        senhaAtual: senha,
        senhaNova: 'OutraSenha@2026',
        confirmacaoSenha: 'OutraSenha@2026',
      });

    expect(resposta.status).toBe(200);

    // A sessao atual continua renovando; a outra, nao.
    const renovarAtual = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${sessaoAtual.refreshToken}`);
    const renovarOutra = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${outraSessao.refreshToken}`);

    expect(renovarAtual.status).toBe(200);
    expect(renovarOutra.status).toBe(401);
  });

  it('responde 400 quando a senha atual esta incorreta', async () => {
    const { email, senha } = await criarUsuarioVerificado({
      email: 'senha-atual-errada@exemplo.com',
    });
    const sessao = await logar(email, senha);

    const resposta = await request(app)
      .patch('/api/v1/autenticacao/alterar-senha')
      .set('Authorization', `Bearer ${sessao.accessToken}`)
      .send({
        senhaAtual: 'SenhaErrada@2026',
        senhaNova: 'OutraSenha@2026',
        confirmacaoSenha: 'OutraSenha@2026',
      });

    expect(resposta.status).toBe(400);
  });

  it('rejeita sem token de acesso (401 NAO_AUTENTICADO)', async () => {
    const resposta = await request(app).patch('/api/v1/autenticacao/alterar-senha').send({
      senhaAtual: 'Qualquer@123',
      senhaNova: 'OutraSenha@2026',
      confirmacaoSenha: 'OutraSenha@2026',
    });

    expect(resposta.status).toBe(401);
  });
});

describe('GET /api/v1/autenticacao/sessoes e DELETE /sessoes/:id', () => {
  beforeEach(async () => {
    await limparBanco();
  });

  afterAll(async () => {
    await limparBanco();
    await prisma.$disconnect();
  });

  it('lista so sessoes ativas, com a atual marcada', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'sessoes@exemplo.com' });
    const sessaoAtual = await logar(email, senha);
    await logar(email, senha);

    const resposta = await request(app)
      .get('/api/v1/autenticacao/sessoes')
      .set('Authorization', `Bearer ${sessaoAtual.accessToken}`)
      .set('Cookie', `refreshToken=${sessaoAtual.refreshToken}`);

    expect(resposta.status).toBe(200);
    const corpo = resposta.body as { data: { sessoes: { id: string; atual: boolean }[] } };
    expect(corpo.data.sessoes).toHaveLength(2);
    expect(corpo.data.sessoes.filter((s) => s.atual)).toHaveLength(1);
  });

  it('nao lista sessoes revogadas', async () => {
    const { email, senha } = await criarUsuarioVerificado({
      email: 'sessoes-revogadas@exemplo.com',
    });
    const sessaoAtual = await logar(email, senha);
    await request(app)
      .post('/api/v1/autenticacao/sair-todos')
      .set('Authorization', `Bearer ${sessaoAtual.accessToken}`);
    const novaSessao = await logar(email, senha);

    const resposta = await request(app)
      .get('/api/v1/autenticacao/sessoes')
      .set('Authorization', `Bearer ${novaSessao.accessToken}`)
      .set('Cookie', `refreshToken=${novaSessao.refreshToken}`);

    const corpo = resposta.body as { data: { sessoes: unknown[] } };
    expect(corpo.data.sessoes).toHaveLength(1);
  });

  it('revoga uma sessao especifica do proprio usuario (204)', async () => {
    const { email, senha } = await criarUsuarioVerificado({ email: 'revogar-uma@exemplo.com' });
    const sessaoAtual = await logar(email, senha);
    const outraSessao = await logar(email, senha);

    const listagem = await request(app)
      .get('/api/v1/autenticacao/sessoes')
      .set('Authorization', `Bearer ${sessaoAtual.accessToken}`)
      .set('Cookie', `refreshToken=${sessaoAtual.refreshToken}`);
    const corpo = listagem.body as { data: { sessoes: { id: string; atual: boolean }[] } };
    const idOutraSessao = corpo.data.sessoes.find((s) => !s.atual)?.id;

    const resposta = await request(app)
      .delete(`/api/v1/autenticacao/sessoes/${idOutraSessao}`)
      .set('Authorization', `Bearer ${sessaoAtual.accessToken}`);
    expect(resposta.status).toBe(204);

    const renovarOutra = await request(app)
      .post('/api/v1/autenticacao/renovar')
      .set('Cookie', `refreshToken=${outraSessao.refreshToken}`);
    expect(renovarOutra.status).toBe(401);
  });

  it('responde 404 (nao 403) ao tentar revogar sessao de outro usuario', async () => {
    const usuario1 = await criarUsuarioVerificado({ email: 'usuario1@exemplo.com' });
    const usuario2 = await criarUsuarioVerificado({ email: 'usuario2@exemplo.com' });
    const sessao1 = await logar(usuario1.email, usuario1.senha);
    const sessao2 = await logar(usuario2.email, usuario2.senha);

    const listagemUsuario2 = await request(app)
      .get('/api/v1/autenticacao/sessoes')
      .set('Authorization', `Bearer ${sessao2.accessToken}`)
      .set('Cookie', `refreshToken=${sessao2.refreshToken}`);
    const corpo = listagemUsuario2.body as { data: { sessoes: { id: string }[] } };
    const idSessaoUsuario2 = corpo.data.sessoes[0]?.id;

    const resposta = await request(app)
      .delete(`/api/v1/autenticacao/sessoes/${idSessaoUsuario2}`)
      .set('Authorization', `Bearer ${sessao1.accessToken}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body).toMatchObject({ codigo: 'NAO_ENCONTRADO' });
  });
});
