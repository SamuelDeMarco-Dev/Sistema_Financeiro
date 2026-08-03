import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import {
  ContaBloqueadaErro,
  CredenciaisInvalidasErro,
  EmailJaCadastradoErro,
  EmailNaoVerificadoErro,
  NaoAutenticadoErro,
  ValidacaoErro,
} from '@/erros';
import {
  type TokenRenovacaoComUsuario,
  TokenRenovacaoRepositorio,
} from '@/repositorios/token-renovacao.repositorio';
import {
  type DadosCriarUsuario,
  type UsuarioComPerfil,
  UsuarioRepositorio,
} from '@/repositorios/usuario.repositorio';
import { AutenticacaoServico } from '@/servicos/autenticacao.servico';
import { enviarEmail } from '@/utilitarios/email/enviador';
import { comparar } from '@/utilitarios/senha';
import type { Perfil } from '@prisma/client';

vi.mock('@/utilitarios/email/enviador');
vi.mock('@/utilitarios/senha', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('@/utilitarios/senha')>();
  return { ...real, comparar: vi.fn() };
});
// Sem isto, renovar() chamaria o prisma.$transaction REAL (precisaria de
// banco) so para invocar callbacks cujo corpo ja e 100% mockado por fora.
vi.mock('@/banco/transacao', () => ({
  executarTransacao: vi.fn((fn: (tx: undefined) => Promise<unknown>) => fn(undefined)),
}));

const enviarEmailMockado = vi.mocked(enviarEmail);
const compararMockado = vi.mocked(comparar);

function fabricarPerfil(sobrescritas: Partial<Perfil> = {}): Perfil {
  return {
    id: 'perfil-1',
    usuarioId: 'usuario-1',
    fotoUrl: null,
    moedaPadrao: 'BRL',
    idioma: 'pt-BR',
    tema: 'SISTEMA',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...sobrescritas,
  };
}

function fabricarUsuario(sobrescritas: Partial<UsuarioComPerfil> = {}): UsuarioComPerfil {
  return {
    id: 'usuario-1',
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    senhaHash: 'hash-fake',
    emailVerificadoEm: new Date(),
    tokenVerificacao: null,
    tokenVerificacaoExpiraEm: null,
    tokenRecuperacao: null,
    tokenRecuperacaoExpiraEm: null,
    tentativasLogin: 0,
    bloqueadoAte: null,
    ultimoLoginEm: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    excluidoEm: null,
    anonimizadoEm: null,
    perfil: fabricarPerfil(),
    ...sobrescritas,
  };
}

function fabricarTokenRenovacao(
  sobrescritas: Partial<TokenRenovacaoComUsuario> = {},
): TokenRenovacaoComUsuario {
  const agora = new Date();
  return {
    id: 'token-1',
    usuarioId: 'usuario-1',
    tokenHash: 'hash-do-token',
    dispositivo: null,
    ip: '127.0.0.1',
    userAgent: 'vitest',
    expiraEm: new Date(agora.getTime() + 7 * 86_400_000),
    revogadoEm: null,
    substituidoPorId: null,
    criadoEm: agora,
    usuario: fabricarUsuario(),
    ...sobrescritas,
  };
}

describe('AutenticacaoServico.cadastrar', () => {
  let servico: AutenticacaoServico;
  let repositorio: MockProxy<UsuarioRepositorio>;
  let tokenRepositorio: MockProxy<TokenRenovacaoRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    tokenRepositorio = mock();
    servico = new AutenticacaoServico(repositorio, tokenRepositorio);
    enviarEmailMockado.mockReset().mockResolvedValue(undefined);
  });

  const dadosCadastro = {
    nome: 'Samuel De Marco',
    email: 'Samuel@Exemplo.com',
    senha: 'SenhaForte@2026',
    confirmacaoSenha: 'SenhaForte@2026',
  };

  it('cria o usuario com e-mail normalizado para minusculas', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);
    repositorio.criar.mockResolvedValue(fabricarUsuario({ email: 'samuel@exemplo.com' }));

    await servico.cadastrar(dadosCadastro);

    expect(repositorio.buscarPorEmail).toHaveBeenCalledWith('samuel@exemplo.com');
    expect(repositorio.criar).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'samuel@exemplo.com' }),
    );
  });

  it('lanca EmailJaCadastradoErro quando o e-mail ja existe (RN duplicidade)', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());

    await expect(servico.cadastrar(dadosCadastro)).rejects.toThrow(EmailJaCadastradoErro);
    expect(repositorio.criar).not.toHaveBeenCalled();
  });

  it('envia o e-mail de verificacao com o mesmo token persistido para o usuario', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);
    repositorio.criar.mockResolvedValue(fabricarUsuario());

    await servico.cadastrar(dadosCadastro);

    expect(repositorio.criar).toHaveBeenCalledOnce();
    const [dadosCriar] = repositorio.criar.mock.calls[0] as [DadosCriarUsuario];

    expect(enviarEmailMockado).toHaveBeenCalledOnce();
    const [chamada] = enviarEmailMockado.mock.calls[0] as [{ para: string; html: string }];
    expect(chamada.para).toBe('samuel@exemplo.com');
    expect(chamada.html).toContain(dadosCriar.tokenVerificacao);
  });

  it('nao aguarda o envio do e-mail para responder (fire-and-forget)', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);
    repositorio.criar.mockResolvedValue(fabricarUsuario());
    // Nunca resolve: se o servico esperasse por isso, o teste travaria ate o timeout.
    enviarEmailMockado.mockReturnValue(new Promise(() => undefined));

    await expect(servico.cadastrar(dadosCadastro)).resolves.toMatchObject({ id: 'usuario-1' });
  });
});

describe('AutenticacaoServico.entrar', () => {
  let servico: AutenticacaoServico;
  let repositorio: MockProxy<UsuarioRepositorio>;
  let tokenRepositorio: MockProxy<TokenRenovacaoRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    tokenRepositorio = mock();
    servico = new AutenticacaoServico(repositorio, tokenRepositorio);
    compararMockado.mockReset();
  });

  const dadosLogin = { email: 'Samuel@Exemplo.com', senha: 'SenhaForte@2026', lembrarMe: false };
  const contexto = { ip: '127.0.0.1', userAgent: 'vitest' };

  it('autentica com sucesso: reseta tentativas, cria refresh token e assina o access token', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());
    compararMockado.mockResolvedValue(true);

    const resultado = await servico.entrar(dadosLogin, contexto);

    expect(resultado.accessToken).toBeTruthy();
    expect(resultado.expiraEmSegundos).toBeGreaterThan(0);
    expect(resultado.refreshTokenBruto).toBeTruthy();
    expect(repositorio.registrarLoginSucesso).toHaveBeenCalledWith('usuario-1');
    expect(tokenRepositorio.criar).toHaveBeenCalledWith(
      expect.objectContaining({ usuarioId: 'usuario-1', ip: '127.0.0.1' }),
    );
  });

  it('lanca CredenciaisInvalidasErro quando o e-mail nao existe (sem revelar isso)', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);

    await expect(servico.entrar(dadosLogin, contexto)).rejects.toThrow(CredenciaisInvalidasErro);
    expect(compararMockado).not.toHaveBeenCalled();
  });

  it('lanca CredenciaisInvalidasErro com a MESMA mensagem quando a senha esta errada', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(null);
    let erroEmailInexistente = '';
    try {
      await servico.entrar(dadosLogin, contexto);
    } catch (erro) {
      erroEmailInexistente = (erro as Error).message;
    }

    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());
    repositorio.registrarTentativaFalha.mockResolvedValue(fabricarUsuario({ tentativasLogin: 1 }));
    compararMockado.mockResolvedValue(false);
    let erroSenhaErrada = '';
    try {
      await servico.entrar(dadosLogin, contexto);
    } catch (erro) {
      erroSenhaErrada = (erro as Error).message;
    }

    expect(erroEmailInexistente).toBe(erroSenhaErrada);
  });

  it('bloqueia a conta ao atingir o limite de tentativas falhas (RN-54)', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());
    repositorio.registrarTentativaFalha.mockResolvedValue(fabricarUsuario({ tentativasLogin: 5 }));
    compararMockado.mockResolvedValue(false);

    await expect(servico.entrar(dadosLogin, contexto)).rejects.toThrow(CredenciaisInvalidasErro);
    expect(repositorio.bloquear).toHaveBeenCalledWith('usuario-1', expect.any(Date));
  });

  it('nao bloqueia antes de atingir o limite', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());
    repositorio.registrarTentativaFalha.mockResolvedValue(fabricarUsuario({ tentativasLogin: 3 }));
    compararMockado.mockResolvedValue(false);

    await expect(servico.entrar(dadosLogin, contexto)).rejects.toThrow(CredenciaisInvalidasErro);
    expect(repositorio.bloquear).not.toHaveBeenCalled();
  });

  it('lanca ContaBloqueadaErro com meta.desbloqueiaEm quando ja esta bloqueada', async () => {
    const desbloqueiaEm = new Date(Date.now() + 5 * 60_000);
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario({ bloqueadoAte: desbloqueiaEm }));

    await expect(servico.entrar(dadosLogin, contexto)).rejects.toThrow(ContaBloqueadaErro);
    expect(compararMockado).not.toHaveBeenCalled();
  });

  it('ignora bloqueadoAte ja expirado e segue a validacao normal', async () => {
    const bloqueioExpirado = new Date(Date.now() - 60_000);
    repositorio.buscarPorEmail.mockResolvedValue(
      fabricarUsuario({ bloqueadoAte: bloqueioExpirado }),
    );
    compararMockado.mockResolvedValue(true);

    await expect(servico.entrar(dadosLogin, contexto)).resolves.toBeDefined();
  });

  it('lanca EmailNaoVerificadoErro quando a senha esta certa mas o e-mail nao foi verificado', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario({ emailVerificadoEm: null }));
    compararMockado.mockResolvedValue(true);

    await expect(servico.entrar(dadosLogin, contexto)).rejects.toThrow(EmailNaoVerificadoErro);
  });

  it('usa REFRESH_TOKEN_EXPIRACAO_DIAS_LEMBRAR quando lembrarMe e true', async () => {
    repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());
    compararMockado.mockResolvedValue(true);

    const antes = Date.now();
    const resultado = await servico.entrar({ ...dadosLogin, lembrarMe: true }, contexto);
    const dias = Math.round((resultado.refreshTokenExpiraEm.getTime() - antes) / 86_400_000);

    expect(dias).toBe(30);
  });
});

describe('AutenticacaoServico.renovar', () => {
  let servico: AutenticacaoServico;
  let repositorio: MockProxy<UsuarioRepositorio>;
  let tokenRepositorio: MockProxy<TokenRenovacaoRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    tokenRepositorio = mock();
    servico = new AutenticacaoServico(repositorio, tokenRepositorio);
  });

  const contexto = { ip: '127.0.0.1', userAgent: 'vitest' };

  it('lanca NaoAutenticadoErro quando o cookie esta ausente', async () => {
    await expect(servico.renovar(undefined, contexto)).rejects.toThrow(NaoAutenticadoErro);
    expect(tokenRepositorio.buscarPorHash).not.toHaveBeenCalled();
  });

  it('lanca NaoAutenticadoErro quando o hash nao e reconhecido', async () => {
    tokenRepositorio.buscarPorHash.mockResolvedValue(null);

    await expect(servico.renovar('token-bruto', contexto)).rejects.toThrow(NaoAutenticadoErro);
  });

  it('lanca NaoAutenticadoErro quando o token esta expirado', async () => {
    tokenRepositorio.buscarPorHash.mockResolvedValue(
      fabricarTokenRenovacao({ expiraEm: new Date(Date.now() - 1000) }),
    );

    await expect(servico.renovar('token-bruto', contexto)).rejects.toThrow(NaoAutenticadoErro);
    expect(tokenRepositorio.revogarTodosDoUsuario).not.toHaveBeenCalled();
  });

  it('detecta reuso de token revogado: revoga a familia inteira e lanca NaoAutenticadoErro', async () => {
    tokenRepositorio.buscarPorHash.mockResolvedValue(
      fabricarTokenRenovacao({ revogadoEm: new Date() }),
    );

    await expect(servico.renovar('token-bruto', contexto)).rejects.toThrow(NaoAutenticadoErro);
    expect(tokenRepositorio.revogarTodosDoUsuario).toHaveBeenCalledWith('usuario-1');
    expect(tokenRepositorio.criar).not.toHaveBeenCalled();
  });

  it('rotaciona com sucesso: revoga o antigo, cria um novo e assina outro access token', async () => {
    tokenRepositorio.buscarPorHash.mockResolvedValue(fabricarTokenRenovacao());
    tokenRepositorio.criar.mockResolvedValue(
      fabricarTokenRenovacao({ id: 'token-2', tokenHash: 'hash-do-token-novo' }),
    );

    const resultado = await servico.renovar('token-bruto', contexto);

    expect(resultado.accessToken).toBeTruthy();
    expect(resultado.refreshTokenBruto).toBeTruthy();
    expect(tokenRepositorio.revogar).toHaveBeenCalledWith('token-1', 'token-2', undefined);
  });

  it('preserva a duracao original do token (lembrarMe) atraves da rotacao', async () => {
    const criadoEm = new Date(Date.now() - 2 * 86_400_000);
    const expiraEm = new Date(criadoEm.getTime() + 30 * 86_400_000); // sessao de 30 dias
    tokenRepositorio.buscarPorHash.mockResolvedValue(
      fabricarTokenRenovacao({ criadoEm, expiraEm }),
    );
    tokenRepositorio.criar.mockResolvedValue(fabricarTokenRenovacao({ id: 'token-2' }));

    const antes = Date.now();
    const resultado = await servico.renovar('token-bruto', contexto);
    const dias = Math.round((resultado.refreshTokenExpiraEm.getTime() - antes) / 86_400_000);

    expect(dias).toBe(30);
  });
});

describe('AutenticacaoServico.sair / sairTodos / buscarUsuarioPorId', () => {
  let servico: AutenticacaoServico;
  let repositorio: MockProxy<UsuarioRepositorio>;
  let tokenRepositorio: MockProxy<TokenRenovacaoRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    tokenRepositorio = mock();
    servico = new AutenticacaoServico(repositorio, tokenRepositorio);
  });

  describe('sair', () => {
    it('nao faz nada quando nao ha cookie', async () => {
      await servico.sair(undefined, 'usuario-1');
      expect(tokenRepositorio.buscarPorHash).not.toHaveBeenCalled();
    });

    it('revoga so o token da sessao atual, do proprio usuario', async () => {
      tokenRepositorio.buscarPorHash.mockResolvedValue(
        fabricarTokenRenovacao({ id: 'token-1', usuarioId: 'usuario-1' }),
      );

      await servico.sair('token-bruto', 'usuario-1');

      expect(tokenRepositorio.revogar).toHaveBeenCalledWith('token-1', null);
    });

    it('nao revoga um token que pertence a outro usuario', async () => {
      tokenRepositorio.buscarPorHash.mockResolvedValue(
        fabricarTokenRenovacao({ id: 'token-1', usuarioId: 'outro-usuario' }),
      );

      await servico.sair('token-bruto', 'usuario-1');

      expect(tokenRepositorio.revogar).not.toHaveBeenCalled();
    });

    it('nao revoga de novo um token ja revogado', async () => {
      tokenRepositorio.buscarPorHash.mockResolvedValue(
        fabricarTokenRenovacao({ id: 'token-1', usuarioId: 'usuario-1', revogadoEm: new Date() }),
      );

      await servico.sair('token-bruto', 'usuario-1');

      expect(tokenRepositorio.revogar).not.toHaveBeenCalled();
    });
  });

  describe('sairTodos', () => {
    it('revoga todos os tokens do usuario', async () => {
      await servico.sairTodos('usuario-1');
      expect(tokenRepositorio.revogarTodosDoUsuario).toHaveBeenCalledWith('usuario-1');
    });
  });

  describe('buscarUsuarioPorId', () => {
    it('delega ao repositorio', async () => {
      const usuario = fabricarUsuario();
      repositorio.buscarPorId.mockResolvedValue(usuario);

      await expect(servico.buscarUsuarioPorId('usuario-1')).resolves.toEqual(usuario);
      expect(repositorio.buscarPorId).toHaveBeenCalledWith('usuario-1');
    });
  });
});

describe('AutenticacaoServico — verificacao, recuperacao e alteracao de senha', () => {
  let servico: AutenticacaoServico;
  let repositorio: MockProxy<UsuarioRepositorio>;
  let tokenRepositorio: MockProxy<TokenRenovacaoRepositorio>;

  beforeEach(() => {
    repositorio = mock();
    tokenRepositorio = mock();
    servico = new AutenticacaoServico(repositorio, tokenRepositorio);
    enviarEmailMockado.mockReset().mockResolvedValue(undefined);
  });

  describe('verificarEmail', () => {
    it('confirma o e-mail quando o token e valido', async () => {
      repositorio.buscarPorTokenVerificacao.mockResolvedValue(
        fabricarUsuario({ tokenVerificacaoExpiraEm: new Date(Date.now() + 60_000) }),
      );

      await servico.verificarEmail({ token: 'token-valido' });

      expect(repositorio.confirmarEmail).toHaveBeenCalledWith('usuario-1');
    });

    it('lanca ValidacaoErro (400) quando o token nao e encontrado (ex.: ja usado)', async () => {
      repositorio.buscarPorTokenVerificacao.mockResolvedValue(null);

      await expect(servico.verificarEmail({ token: 'token-usado' })).rejects.toThrow(ValidacaoErro);
      expect(repositorio.confirmarEmail).not.toHaveBeenCalled();
    });

    it('lanca ValidacaoErro quando o token esta expirado', async () => {
      repositorio.buscarPorTokenVerificacao.mockResolvedValue(
        fabricarUsuario({ tokenVerificacaoExpiraEm: new Date(Date.now() - 1000) }),
      );

      await expect(servico.verificarEmail({ token: 'token-velho' })).rejects.toThrow(ValidacaoErro);
      expect(repositorio.confirmarEmail).not.toHaveBeenCalled();
    });
  });

  describe('reenviarVerificacao', () => {
    it('gera novo token e envia e-mail quando o usuario existe e nao esta verificado', async () => {
      repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario({ emailVerificadoEm: null }));

      await servico.reenviarVerificacao({ email: 'samuel@exemplo.com' });

      expect(repositorio.definirTokenVerificacao).toHaveBeenCalledOnce();
      expect(enviarEmailMockado).toHaveBeenCalledOnce();
    });

    it('nao faz nada quando o e-mail nao existe (sem revelar isso)', async () => {
      repositorio.buscarPorEmail.mockResolvedValue(null);

      await servico.reenviarVerificacao({ email: 'nao-existe@exemplo.com' });

      expect(repositorio.definirTokenVerificacao).not.toHaveBeenCalled();
      expect(enviarEmailMockado).not.toHaveBeenCalled();
    });

    it('nao faz nada quando o e-mail ja esta verificado', async () => {
      repositorio.buscarPorEmail.mockResolvedValue(
        fabricarUsuario({ emailVerificadoEm: new Date() }),
      );

      await servico.reenviarVerificacao({ email: 'samuel@exemplo.com' });

      expect(repositorio.definirTokenVerificacao).not.toHaveBeenCalled();
      expect(enviarEmailMockado).not.toHaveBeenCalled();
    });
  });

  describe('esqueciSenha', () => {
    it('gera token de recuperacao e envia e-mail quando o usuario existe', async () => {
      repositorio.buscarPorEmail.mockResolvedValue(fabricarUsuario());

      await servico.esqueciSenha({ email: 'samuel@exemplo.com' });

      expect(repositorio.definirTokenRecuperacao).toHaveBeenCalledOnce();
      expect(enviarEmailMockado).toHaveBeenCalledOnce();
    });

    it('nao faz nada quando o e-mail nao existe (resposta neutra e responsabilidade do controlador)', async () => {
      repositorio.buscarPorEmail.mockResolvedValue(null);

      await servico.esqueciSenha({ email: 'nao-existe@exemplo.com' });

      expect(repositorio.definirTokenRecuperacao).not.toHaveBeenCalled();
      expect(enviarEmailMockado).not.toHaveBeenCalled();
    });
  });

  describe('redefinirSenha', () => {
    const dados = {
      token: 'token-recuperacao',
      senha: 'NovaSenha@2026',
      confirmacaoSenha: 'NovaSenha@2026',
    };

    it('troca a senha e revoga TODAS as sessoes quando o token e valido', async () => {
      repositorio.buscarPorTokenRecuperacao.mockResolvedValue(
        fabricarUsuario({ tokenRecuperacaoExpiraEm: new Date(Date.now() + 60_000) }),
      );

      await servico.redefinirSenha(dados);

      expect(repositorio.redefinirSenha).toHaveBeenCalledWith(
        'usuario-1',
        expect.any(String),
        undefined,
      );
      expect(tokenRepositorio.revogarTodosDoUsuario).toHaveBeenCalledWith('usuario-1', undefined);
    });

    it('lanca ValidacaoErro quando o token e invalido ou ja foi usado', async () => {
      repositorio.buscarPorTokenRecuperacao.mockResolvedValue(null);

      await expect(servico.redefinirSenha(dados)).rejects.toThrow(ValidacaoErro);
      expect(repositorio.redefinirSenha).not.toHaveBeenCalled();
    });

    it('lanca ValidacaoErro quando o token esta expirado (> 1h)', async () => {
      repositorio.buscarPorTokenRecuperacao.mockResolvedValue(
        fabricarUsuario({ tokenRecuperacaoExpiraEm: new Date(Date.now() - 1000) }),
      );

      await expect(servico.redefinirSenha(dados)).rejects.toThrow(ValidacaoErro);
      expect(repositorio.redefinirSenha).not.toHaveBeenCalled();
    });
  });

  describe('alterarSenha', () => {
    const dados = {
      senhaAtual: 'SenhaForte@2026',
      senhaNova: 'OutraSenha@2026',
      confirmacaoSenha: 'OutraSenha@2026',
    };

    it('altera a senha e revoga as OUTRAS sessoes, preservando a atual', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarUsuario());
      compararMockado.mockResolvedValue(true);

      await servico.alterarSenha('usuario-1', dados, 'token-da-sessao-atual');

      expect(repositorio.atualizarSenha).toHaveBeenCalledWith(
        'usuario-1',
        expect.any(String),
        undefined,
      );
      expect(tokenRepositorio.revogarTodosDoUsuarioExceto).toHaveBeenCalledWith(
        'usuario-1',
        expect.any(String),
        undefined,
      );
    });

    it('lanca ValidacaoErro quando a senha atual esta incorreta', async () => {
      repositorio.buscarPorId.mockResolvedValue(fabricarUsuario());
      compararMockado.mockResolvedValue(false);

      await expect(servico.alterarSenha('usuario-1', dados, 'token')).rejects.toThrow(
        ValidacaoErro,
      );
      expect(repositorio.atualizarSenha).not.toHaveBeenCalled();
    });
  });
});
