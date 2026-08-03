import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import {
  alterarSenha,
  cadastrar,
  entrar,
  esqueciSenha,
  listarSessoes,
  reenviarVerificacao,
  redefinirSenha,
  revogarSessao,
  sair,
  verificarEmail,
} from './autenticacao.servico';

vi.mock('./api', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('autenticacao.servico', () => {
  beforeEach(() => {
    vi.mocked(api.post).mockReset();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.patch).mockReset();
    vi.mocked(api.delete).mockReset();
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

  it('esqueciSenha() posta o e-mail em /autenticacao/esqueci-senha', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: undefined });

    await esqueciSenha('samuel@exemplo.com');

    expect(api.post).toHaveBeenCalledWith('/autenticacao/esqueci-senha', {
      email: 'samuel@exemplo.com',
    });
  });

  it('redefinirSenha() posta token/senha/confirmacaoSenha em /autenticacao/redefinir-senha', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: undefined });

    const dados = {
      token: 'token-bruto',
      senha: 'NovaSenha@2026',
      confirmacaoSenha: 'NovaSenha@2026',
    };
    await redefinirSenha(dados);

    expect(api.post).toHaveBeenCalledWith('/autenticacao/redefinir-senha', dados);
  });

  it('alterarSenha() envia PATCH /autenticacao/alterar-senha', async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: undefined });

    const dados = {
      senhaAtual: 'SenhaForte@2026',
      senhaNova: 'OutraSenha@2026',
      confirmacaoSenha: 'OutraSenha@2026',
    };
    await alterarSenha(dados);

    expect(api.patch).toHaveBeenCalledWith('/autenticacao/alterar-senha', dados);
  });

  it('listarSessoes() busca GET /autenticacao/sessoes e devolve a lista desempacotada', async () => {
    const sessoesFake = [
      {
        id: 'sessao-1',
        dispositivo: 'Chrome · Windows',
        ip: '189.0.0.1',
        criadoEm: '2026-07-28T09:11:00.000Z',
        expiraEm: '2026-08-04T09:11:00.000Z',
        atual: true,
      },
    ];
    vi.mocked(api.get).mockResolvedValue({
      data: { success: true, message: 'Sessões ativas listadas.', data: { sessoes: sessoesFake } },
    });

    const resultado = await listarSessoes();

    expect(api.get).toHaveBeenCalledWith('/autenticacao/sessoes');
    expect(resultado).toEqual(sessoesFake);
  });

  it('revogarSessao() envia DELETE /autenticacao/sessoes/:id', async () => {
    vi.mocked(api.delete).mockResolvedValue({ data: undefined });

    await revogarSessao('sessao-1');

    expect(api.delete).toHaveBeenCalledWith('/autenticacao/sessoes/sessao-1');
  });
});
