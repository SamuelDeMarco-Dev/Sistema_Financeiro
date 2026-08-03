import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/banco/cliente';
import { criarServidor } from '@/servidor';
import { limparBanco } from '../configuracao/banco-teste';

const app = criarServidor();

const CADASTRO_VALIDO = {
  nome: 'Samuel De Marco',
  email: 'samuel@exemplo.com',
  senha: 'SenhaForte@2026',
  confirmacaoSenha: 'SenhaForte@2026',
};

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
