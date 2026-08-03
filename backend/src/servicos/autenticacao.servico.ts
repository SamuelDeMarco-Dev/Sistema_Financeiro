import { randomBytes } from 'node:crypto';
import { ambiente } from '@/configuracao/ambiente';
import { HORAS_EXPIRACAO_TOKEN_VERIFICACAO } from '@/configuracao/constantes';
import { EmailJaCadastradoErro } from '@/erros';
import { UsuarioRepositorio } from '@/repositorios/usuario.repositorio';
import { enviarEmail } from '@/utilitarios/email/enviador';
import { modeloVerificacaoEmail } from '@/utilitarios/email/modelos/verificacao-email';
import { gerarHash } from '@/utilitarios/senha';
import type { CadastrarDTO } from '@/validadores/autenticacao.validador';
import type { Usuario } from '@prisma/client';

const UMA_HORA_MS = 1000 * 60 * 60;

function gerarToken(): string {
  return randomBytes(32).toString('hex');
}

export class AutenticacaoServico {
  constructor(private readonly repositorio = new UsuarioRepositorio()) {}

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
}
