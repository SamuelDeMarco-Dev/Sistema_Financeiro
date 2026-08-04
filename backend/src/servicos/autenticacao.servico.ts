import { randomBytes } from 'node:crypto';
import { executarTransacao } from '@/banco/transacao';
import { ambiente } from '@/configuracao/ambiente';
import {
  HORAS_EXPIRACAO_TOKEN_RECUPERACAO,
  HORAS_EXPIRACAO_TOKEN_VERIFICACAO,
  LIMITE_TENTATIVAS_LOGIN,
  MINUTOS_BLOQUEIO_LOGIN,
} from '@/configuracao/constantes';
import {
  ContaBloqueadaErro,
  CredenciaisInvalidasErro,
  EmailJaCadastradoErro,
  EmailNaoVerificadoErro,
  NaoAutenticadoErro,
  NaoEncontradoErro,
  ValidacaoErro,
} from '@/erros';
import { TokenRenovacaoRepositorio } from '@/repositorios/token-renovacao.repositorio';
import { UsuarioRepositorio } from '@/repositorios/usuario.repositorio';
import { enviarEmail } from '@/utilitarios/email/enviador';
import { modeloRecuperacaoSenha } from '@/utilitarios/email/modelos/recuperacao-senha';
import { modeloVerificacaoEmail } from '@/utilitarios/email/modelos/verificacao-email';
import { assinarAccessToken, duracaoEmSegundos } from '@/utilitarios/jwt';
import { registrador } from '@/utilitarios/registrador';
import { rotularDispositivo } from '@/utilitarios/rotulo-dispositivo';
import { comparar, gerarHash } from '@/utilitarios/senha';
import { gerarTokenOpaco, hashToken } from '@/utilitarios/token';
import type {
  AlterarSenhaDTO,
  CadastrarDTO,
  EntrarDTO,
  EsqueciSenhaDTO,
  ReenviarVerificacaoDTO,
  RedefinirSenhaDTO,
  VerificarEmailDTO,
} from '@/validadores/autenticacao.validador';
import type { Perfil, Usuario } from '@prisma/client';

const UMA_HORA_MS = 1000 * 60 * 60;
const UM_DIA_MS = UMA_HORA_MS * 24;

function gerarToken(): string {
  return randomBytes(32).toString('hex');
}

export interface ContextoRequisicao {
  ip: string;
  userAgent: string | null;
}

export interface ResultadoLogin {
  usuario: Usuario;
  perfil: Perfil | null;
  accessToken: string;
  expiraEmSegundos: number;
  refreshTokenBruto: string;
  refreshTokenExpiraEm: Date;
}

export interface ResultadoRenovacao {
  accessToken: string;
  expiraEmSegundos: number;
  refreshTokenBruto: string;
  refreshTokenExpiraEm: Date;
}

export interface SessaoResumo {
  id: string;
  dispositivo: string;
  ip: string | null;
  criadoEm: Date;
  expiraEm: Date;
  atual: boolean;
}

export class AutenticacaoServico {
  constructor(
    private readonly repositorio = new UsuarioRepositorio(),
    private readonly tokenRepositorio = new TokenRenovacaoRepositorio(),
  ) {}

  async cadastrar(dados: CadastrarDTO): Promise<Usuario> {
    const email = dados.email.toLowerCase();

    // RN: e-mail e unico, independente de caixa.
    const existente = await this.repositorio.buscarPorEmail(email);
    if (existente) {
      throw new EmailJaCadastradoErro('Este e-mail ja esta cadastrado.');
    }

    const senhaHash = await gerarHash(dados.senha);
    const tokenVerificacao = gerarToken();
    const tokenVerificacaoExpiraEm = new Date(
      Date.now() + HORAS_EXPIRACAO_TOKEN_VERIFICACAO * UMA_HORA_MS,
    );

    const usuario = await this.repositorio.criar({
      nome: dados.nome,
      email,
      senhaHash,
      tokenVerificacao,
      tokenVerificacaoExpiraEm,
    });

    // Nao bloqueia a resposta do cadastro (issue #11): enviarEmail() ja
    // nunca lanca, e o token continua no banco para uma rota de reenvio.
    const linkVerificacao = `${ambiente.URL_BASE_FRONTEND}/verificar-email?token=${tokenVerificacao}`;
    void enviarEmail({
      para: usuario.email,
      ...modeloVerificacaoEmail({ nome: usuario.nome, linkVerificacao }),
    });

    return usuario;
  }

  async entrar(dados: EntrarDTO, contexto: ContextoRequisicao): Promise<ResultadoLogin> {
    const email = dados.email.toLowerCase();
    const usuario = await this.repositorio.buscarPorEmail(email);

    // RN: mesma mensagem para e-mail inexistente e senha errada — nao da
    // para um atacante distinguir se o e-mail esta cadastrado.
    if (!usuario) {
      throw new CredenciaisInvalidasErro('E-mail ou senha incorretos.');
    }

    // RN-54: checado ANTES do bcrypt.compare (caro) — conta bloqueada nao
    // precisa gastar o custo do hash so para rejeitar de qualquer forma.
    if (usuario.bloqueadoAte && usuario.bloqueadoAte.getTime() > Date.now()) {
      throw new ContaBloqueadaErro(
        'Conta temporariamente bloqueada por excesso de tentativas.',
        usuario.bloqueadoAte,
      );
    }

    const senhaCorreta = await comparar(dados.senha, usuario.senhaHash);
    if (!senhaCorreta) {
      const atualizado = await this.repositorio.registrarTentativaFalha(usuario.id);
      if (atualizado.tentativasLogin >= LIMITE_TENTATIVAS_LOGIN) {
        await this.repositorio.bloquear(
          usuario.id,
          new Date(Date.now() + MINUTOS_BLOQUEIO_LOGIN * 60_000),
        );
      }
      throw new CredenciaisInvalidasErro('E-mail ou senha incorretos.');
    }

    // So revela "e-mail nao verificado" a quem ja provou saber a senha —
    // senao vira um jeito de sondar quais e-mails estao cadastrados.
    if (!usuario.emailVerificadoEm) {
      throw new EmailNaoVerificadoErro('Verifique seu e-mail antes de entrar.');
    }

    await this.repositorio.registrarLoginSucesso(usuario.id);

    const dias = dados.lembrarMe
      ? ambiente.REFRESH_TOKEN_EXPIRACAO_DIAS_LEMBRAR
      : ambiente.REFRESH_TOKEN_EXPIRACAO_DIAS;
    const refreshTokenBruto = gerarTokenOpaco();
    const refreshTokenExpiraEm = new Date(Date.now() + dias * UM_DIA_MS);

    await this.tokenRepositorio.criar({
      usuarioId: usuario.id,
      tokenHash: hashToken(refreshTokenBruto),
      ip: contexto.ip,
      userAgent: contexto.userAgent,
      expiraEm: refreshTokenExpiraEm,
    });

    return {
      usuario,
      perfil: usuario.perfil,
      accessToken: assinarAccessToken({ sub: usuario.id, email: usuario.email }),
      expiraEmSegundos: duracaoEmSegundos(ambiente.JWT_EXPIRACAO),
      refreshTokenBruto,
      refreshTokenExpiraEm,
    };
  }

  async renovar(
    tokenBruto: string | undefined,
    contexto: ContextoRequisicao,
  ): Promise<ResultadoRenovacao> {
    if (!tokenBruto) {
      throw new NaoAutenticadoErro('Sessão inválida.');
    }

    const registro = await this.tokenRepositorio.buscarPorHash(hashToken(tokenBruto));

    if (!registro) {
      throw new NaoAutenticadoErro('Sessão inválida.');
    }

    if (registro.revogadoEm) {
      // RN-53: reuso de um token ja revogado e indicio de vazamento —
      // revoga a familia inteira, nao so este token.
      await this.tokenRepositorio.revogarTodosDoUsuario(registro.usuarioId);
      registrador.warn(
        { usuarioId: registro.usuarioId, ip: contexto.ip },
        'Reuso de refresh token revogado detectado — familia de tokens revogada.',
      );
      throw new NaoAutenticadoErro('Sessão inválida.');
    }

    if (registro.expiraEm.getTime() <= Date.now()) {
      throw new NaoAutenticadoErro('Sessão expirada.');
    }

    const refreshTokenBruto = gerarTokenOpaco();
    // Preserva a duracao original da sessao (7 ou 30 dias, conforme
    // lembrarMe no login) atraves das rotacoes seguintes, sem precisar
    // persistir esse booleano em lugar nenhum.
    const duracaoMs = registro.expiraEm.getTime() - registro.criadoEm.getTime();
    const refreshTokenExpiraEm = new Date(Date.now() + duracaoMs);

    await executarTransacao(async (tx) => {
      const novo = await this.tokenRepositorio.criar(
        {
          usuarioId: registro.usuarioId,
          tokenHash: hashToken(refreshTokenBruto),
          ip: contexto.ip,
          userAgent: contexto.userAgent,
          expiraEm: refreshTokenExpiraEm,
        },
        tx,
      );
      await this.tokenRepositorio.revogar(registro.id, novo.id, tx);
    });

    return {
      accessToken: assinarAccessToken({ sub: registro.usuario.id, email: registro.usuario.email }),
      expiraEmSegundos: duracaoEmSegundos(ambiente.JWT_EXPIRACAO),
      refreshTokenBruto,
      refreshTokenExpiraEm,
    };
  }

  /** RF-05: revoga so a sessao do cookie apresentado. Sem cookie ou cookie
   * de outro usuario: nao ha nada para revogar, mas o logout local (limpar
   * o cookie) e responsabilidade do controlador de qualquer forma. */
  async sair(tokenBruto: string | undefined, usuarioId: string): Promise<void> {
    if (!tokenBruto) return;

    const registro = await this.tokenRepositorio.buscarPorHash(hashToken(tokenBruto));
    if (registro?.usuarioId === usuarioId && !registro.revogadoEm) {
      await this.tokenRepositorio.revogar(registro.id, null);
    }
  }

  /** RF-06: revoga todas as sessoes do usuario autenticado. */
  async sairTodos(usuarioId: string): Promise<void> {
    await this.tokenRepositorio.revogarTodosDoUsuario(usuarioId);
  }

  /** Usado por middlewares/autenticar.middleware.ts — middleware nao pode
   * importar repositorio diretamente (fronteiras de camada, issue #8). */
  async buscarUsuarioPorId(id: string): Promise<Usuario | null> {
    return this.repositorio.buscarPorId(id);
  }

  /** RF-02: token de 24h, uso unico — confirmarEmail ja o limpa, entao
   * usar o mesmo token de novo cai no ramo "nao encontrado" abaixo. */
  async verificarEmail(dados: VerificarEmailDTO): Promise<void> {
    const usuario = await this.repositorio.buscarPorTokenVerificacao(dados.token);

    if (
      !usuario?.tokenVerificacaoExpiraEm ||
      usuario.tokenVerificacaoExpiraEm.getTime() <= Date.now()
    ) {
      throw new ValidacaoErro('Token de verificação inválido ou expirado.');
    }

    await this.repositorio.confirmarEmail(usuario.id);
  }

  /** Silencioso como esqueciSenha: nao revela se o e-mail existe, nem se
   * ja foi verificado — o rate limit de 3/hora (rotas) e a defesa real
   * contra abuso, nao a resposta. */
  async reenviarVerificacao(dados: ReenviarVerificacaoDTO): Promise<void> {
    const usuario = await this.repositorio.buscarPorEmail(dados.email.toLowerCase());
    if (!usuario || usuario.emailVerificadoEm) return;

    const tokenVerificacao = gerarToken();
    const tokenVerificacaoExpiraEm = new Date(
      Date.now() + HORAS_EXPIRACAO_TOKEN_VERIFICACAO * UMA_HORA_MS,
    );
    await this.repositorio.definirTokenVerificacao(
      usuario.id,
      tokenVerificacao,
      tokenVerificacaoExpiraEm,
    );

    const linkVerificacao = `${ambiente.URL_BASE_FRONTEND}/verificar-email?token=${tokenVerificacao}`;
    void enviarEmail({
      para: usuario.email,
      ...modeloVerificacaoEmail({ nome: usuario.nome, linkVerificacao }),
    });
  }

  /** 04-API.md §7.6: responde sempre a mesma coisa exista ou nao o
   * e-mail — a neutralidade e responsabilidade do controlador, que nunca
   * inspeciona o resultado desta chamada. */
  async esqueciSenha(dados: EsqueciSenhaDTO): Promise<void> {
    const usuario = await this.repositorio.buscarPorEmail(dados.email.toLowerCase());
    if (!usuario) return;

    const tokenRecuperacao = gerarToken();
    const tokenRecuperacaoExpiraEm = new Date(
      Date.now() + HORAS_EXPIRACAO_TOKEN_RECUPERACAO * UMA_HORA_MS,
    );
    await this.repositorio.definirTokenRecuperacao(
      usuario.id,
      tokenRecuperacao,
      tokenRecuperacaoExpiraEm,
    );

    const linkRecuperacao = `${ambiente.URL_BASE_FRONTEND}/redefinir-senha?token=${tokenRecuperacao}`;
    void enviarEmail({
      para: usuario.email,
      ...modeloRecuperacaoSenha({ nome: usuario.nome, linkRecuperacao }),
    });
  }

  /** RF-07: token de 1h, uso unico, e derruba TODAS as sessoes — se
   * alguem redefiniu a senha por e-mail, nenhuma sessao antiga (talvez de
   * quem invadiu a conta) deve continuar valida. */
  async redefinirSenha(dados: RedefinirSenhaDTO): Promise<void> {
    const usuario = await this.repositorio.buscarPorTokenRecuperacao(dados.token);

    if (
      !usuario?.tokenRecuperacaoExpiraEm ||
      usuario.tokenRecuperacaoExpiraEm.getTime() <= Date.now()
    ) {
      throw new ValidacaoErro('Token de recuperação inválido ou expirado.');
    }

    const senhaHash = await gerarHash(dados.senha);

    await executarTransacao(async (tx) => {
      await this.repositorio.redefinirSenha(usuario.id, senhaHash, tx);
      await this.tokenRepositorio.revogarTodosDoUsuario(usuario.id, tx);
    });
  }

  /** RF-08: exige a senha atual; revoga as OUTRAS sessoes e preserva a
   * que fez a requisicao (identificada pelo proprio cookie de refresh). */
  async alterarSenha(
    usuarioId: string,
    dados: AlterarSenhaDTO,
    tokenAtualBruto: string | undefined,
  ): Promise<void> {
    const usuario = await this.repositorio.buscarPorId(usuarioId);
    if (!usuario) {
      throw new NaoAutenticadoErro('Sessão inválida.');
    }

    const senhaCorreta = await comparar(dados.senhaAtual, usuario.senhaHash);
    if (!senhaCorreta) {
      throw new ValidacaoErro('Senha atual incorreta.', [
        { campo: 'senhaAtual', mensagem: 'Senha atual incorreta.' },
      ]);
    }

    const senhaHash = await gerarHash(dados.senhaNova);
    const tokenHashAtual = tokenAtualBruto ? hashToken(tokenAtualBruto) : undefined;

    await executarTransacao(async (tx) => {
      await this.repositorio.atualizarSenha(usuarioId, senhaHash, tx);
      await this.tokenRepositorio.revogarTodosDoUsuarioExceto(usuarioId, tokenHashAtual, tx);
    });
  }

  /** RF-06 (issue #16): so sessoes ainda validas — nem revogadas, nem
   * expiradas. Marca `atual` comparando o hash do proprio cookie da
   * requisicao, nao um id armazenado em lugar nenhum. */
  async listarSessoes(
    usuarioId: string,
    tokenAtualBruto: string | undefined,
  ): Promise<SessaoResumo[]> {
    const tokens = await this.tokenRepositorio.listarAtivasDoUsuario(usuarioId);
    const hashAtual = tokenAtualBruto ? hashToken(tokenAtualBruto) : undefined;

    return tokens.map((token) => ({
      id: token.id,
      dispositivo: rotularDispositivo(token.userAgent),
      ip: token.ip,
      criadoEm: token.criadoEm,
      expiraEm: token.expiraEm,
      atual: hashAtual !== undefined && token.tokenHash === hashAtual,
    }));
  }

  /** RN-51: sessao de outro usuario responde 404, nunca 403 — nao revela
   * que o id existe. */
  async revogarSessao(usuarioId: string, sessaoId: string): Promise<void> {
    const token = await this.tokenRepositorio.buscarPorId(sessaoId);
    if (token?.usuarioId !== usuarioId) {
      throw new NaoEncontradoErro('Sessão não encontrada.');
    }

    await this.tokenRepositorio.revogar(token.id, null);
  }
}
