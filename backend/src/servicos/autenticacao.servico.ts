import { randomBytes } from 'node:crypto';
import { ambiente } from '@/configuracao/ambiente';
import {
  HORAS_EXPIRACAO_TOKEN_VERIFICACAO,
  LIMITE_TENTATIVAS_LOGIN,
  MINUTOS_BLOQUEIO_LOGIN,
} from '@/configuracao/constantes';
import {
  ContaBloqueadaErro,
  CredenciaisInvalidasErro,
  EmailJaCadastradoErro,
  EmailNaoVerificadoErro,
} from '@/erros';
import { TokenRenovacaoRepositorio } from '@/repositorios/token-renovacao.repositorio';
import { UsuarioRepositorio } from '@/repositorios/usuario.repositorio';
import { enviarEmail } from '@/utilitarios/email/enviador';
import { modeloVerificacaoEmail } from '@/utilitarios/email/modelos/verificacao-email';
import { assinarAccessToken, duracaoEmSegundos } from '@/utilitarios/jwt';
import { comparar, gerarHash } from '@/utilitarios/senha';
import { gerarTokenOpaco, hashToken } from '@/utilitarios/token';
import type { CadastrarDTO, EntrarDTO } from '@/validadores/autenticacao.validador';
import type { Perfil, Usuario } from '@prisma/client';

const UMA_HORA_MS = 1000 * 60 * 60;
const UM_DIA_MS = UMA_HORA_MS * 24;

function gerarToken(): string {
  return randomBytes(32).toString('hex');
}

export interface ContextoLogin {
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

  async entrar(dados: EntrarDTO, contexto: ContextoLogin): Promise<ResultadoLogin> {
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
}
