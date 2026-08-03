import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import {
  cadastrar,
  entrar,
  reenviarVerificacao,
  sair,
  verificarEmail,
} from './autenticacao.servico';

vi.mock('./api', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

describe('autenticacao.servico', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
  });

  it('entrar() posta as credenciais em /autenticacao/entrar e devolve data.data desempacotado', async () => {
    const respostaFake = {
      accessToken: 'token-1',
      expiraEm: 900,
      usuario: {
        id: 'usuario-1',
        nome: 'Samuel De Marco',
        email: 'samuel@exemplo.com',
        perfil: {
          fotoUrl: null,
          moedaPadrao: 'BRL',
          idioma: 'pt-BR',
          tema: 'SISTEMA' as const,
          timezone: 'America/Sao_Paulo',
        },
      },
    };
    vi.mocked(api.post).mockResolvedValue({
      data: { success: true, message: 'Autenticado com sucesso.', data: respostaFake },
    });

    const credenciais = { email: 'samuel@exemplo.com', senha: 'SenhaForte@2026' };
    const resultado = await entrar(credenciais);

    expect(api.post).toHaveBeenCalledWith('/autenticacao/entrar', credenciais);
    expect(resultado).toEqual(respostaFake);
  });

  it('cadastrar() posta os dados em /autenticacao/cadastrar e devolve so o usuario', async () => {
    const usuarioFake = {
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: false,
      criadoEm: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(api.post).mockResolvedValue({
      data: {
        success: true,
        message: 'Cadastro realizado. Verifique seu e-mail para ativar a conta.',
        data: { usuario: usuarioFake },
      },
    });

    const dados = {
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      senha: 'SenhaForte@2026',
      confirmacaoSenha: 'SenhaForte@2026',
    };
    const resultado = await cadastrar(dados);

    expect(api.post).toHaveBeenCalledWith('/autenticacao/cadastrar', dados);
    expect(resultado).toEqual(usuarioFake);
  });

  it('sair() posta em /autenticacao/sair sem corpo (204 sem data para desempacotar)', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: undefined });

    await sair();

    expect(api.post).toHaveBeenCalledWith('/autenticacao/sair');
  });

  it('verificarEmail() posta o token em /autenticacao/verificar-email', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: undefined });

    await verificarEmail('token-bruto');

    expect(api.post).toHaveBeenCalledWith('/autenticacao/verificar-email', {
      token: 'token-bruto',
    });
  });

  it('reenviarVerificacao() posta o e-mail em /autenticacao/reenviar-verificacao', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: undefined });

    await reenviarVerificacao('samuel@exemplo.com');

    expect(api.post).toHaveBeenCalledWith('/autenticacao/reenviar-verificacao', {
      email: 'samuel@exemplo.com',
    });
  });
});
