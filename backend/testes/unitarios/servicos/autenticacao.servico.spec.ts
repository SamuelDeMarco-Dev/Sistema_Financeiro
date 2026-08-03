import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import {
  ContaBloqueadaErro,
  CredenciaisInvalidasErro,
  EmailJaCadastradoErro,
  EmailNaoVerificadoErro,
} from '@/erros';
import { TokenRenovacaoRepositorio } from '@/repositorios/token-renovacao.repositorio';
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
