import { describe, expect, it } from 'vitest';
import {
  cadastroSchema,
  esqueciSenhaSchema,
  loginSchema,
  redefinirSenhaSchema,
} from './autenticacao.schema';

describe('loginSchema', () => {
  it('aceita credenciais validas', () => {
    const resultado = loginSchema.safeParse({
      email: 'samuel@exemplo.com',
      senha: 'qualquercoisa',
      lembrarMe: false,
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita e-mail invalido', () => {
    const resultado = loginSchema.safeParse({
      email: 'nao-e-email',
      senha: 'qualquercoisa',
      lembrarMe: false,
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita senha vazia', () => {
    const resultado = loginSchema.safeParse({
      email: 'samuel@exemplo.com',
      senha: '',
      lembrarMe: false,
    });
    expect(resultado.success).toBe(false);
  });

  it('nao aplica regras de forca na senha de login (so exige nao-vazia)', () => {
    const resultado = loginSchema.safeParse({
      email: 'samuel@exemplo.com',
      senha: 'fraca',
      lembrarMe: false,
    });
    expect(resultado.success).toBe(true);
  });
});

describe('cadastroSchema', () => {
  const BASE = {
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    senha: 'SenhaForte@2026',
    confirmacaoSenha: 'SenhaForte@2026',
  };

  it('aceita dados validos', () => {
    expect(cadastroSchema.safeParse(BASE).success).toBe(true);
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    const resultado = cadastroSchema.safeParse({ ...BASE, nome: 'Ab' });
    expect(resultado.success).toBe(false);
  });

  it('rejeita senha sem simbolo', () => {
    const resultado = cadastroSchema.safeParse({
      ...BASE,
      senha: 'SenhaForte2026',
      confirmacaoSenha: 'SenhaForte2026',
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita senha sem digito', () => {
    const resultado = cadastroSchema.safeParse({
      ...BASE,
      senha: 'SenhaForte@',
      confirmacaoSenha: 'SenhaForte@',
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita confirmacao de senha diferente, apontando o erro para o campo certo', () => {
    const resultado = cadastroSchema.safeParse({ ...BASE, confirmacaoSenha: 'Outra@2026' });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toEqual(['confirmacaoSenha']);
    }
  });
});

describe('esqueciSenhaSchema', () => {
  it('aceita um e-mail valido', () => {
    expect(esqueciSenhaSchema.safeParse({ email: 'samuel@exemplo.com' }).success).toBe(true);
  });

  it('rejeita e-mail invalido', () => {
    expect(esqueciSenhaSchema.safeParse({ email: 'nao-e-email' }).success).toBe(false);
  });

  it('rejeita e-mail vazio', () => {
    expect(esqueciSenhaSchema.safeParse({ email: '' }).success).toBe(false);
  });
});

describe('redefinirSenhaSchema', () => {
  it('aceita senha forte com confirmacao igual', () => {
    const resultado = redefinirSenhaSchema.safeParse({
      senha: 'NovaSenha@2026',
      confirmacaoSenha: 'NovaSenha@2026',
    });
    expect(resultado.success).toBe(true);
  });

  it('rejeita senha fraca (mesmas regras do cadastro)', () => {
    const resultado = redefinirSenhaSchema.safeParse({
      senha: 'fraca',
      confirmacaoSenha: 'fraca',
    });
    expect(resultado.success).toBe(false);
  });

  it('rejeita confirmacao diferente, apontando o erro para o campo certo', () => {
    const resultado = redefinirSenhaSchema.safeParse({
      senha: 'NovaSenha@2026',
      confirmacaoSenha: 'Diferente@2026',
    });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toEqual(['confirmacaoSenha']);
    }
  });
});
