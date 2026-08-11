import { randomBytes } from 'node:crypto';
import { executarTransacao } from '@/banco/transacao';
import { ambiente } from '@/configuracao/ambiente';
import { DIAS_EXPIRACAO_CONVITE } from '@/configuracao/constantes';
import {
  ConviteDuplicadoErro,
  ConviteExpiradoErro,
  JaEMembroErro,
  NaoEncontradoErro,
  PapelInsuficienteErro,
  ProibidoErro,
  RegraNegocioErro,
} from '@/erros';
import { ContaCompartilhadaRepositorio } from '@/repositorios/conta-compartilhada.repositorio';
import { ConviteRepositorio } from '@/repositorios/convite.repositorio';
import type { ConviteComGrupo } from '@/repositorios/convite.repositorio';
import { MembroCompartilhadoRepositorio } from '@/repositorios/membro-compartilhado.repositorio';
import { UsuarioRepositorio } from '@/repositorios/usuario.repositorio';
import { enviarEmail } from '@/utilitarios/email/enviador';
import { modeloConviteEmail } from '@/utilitarios/email/modelos/convite';
import {
  mapearConviteDoGrupo,
  mapearConviteEnviado,
  mapearConviteRecebido,
} from '@/utilitarios/mapear-convite';
import type {
  ConviteDoGrupoDTO,
  ConviteEnviadoDTO,
  ConviteRecebidoDTO,
} from '@/utilitarios/mapear-convite';
import type { EnviarConviteDTO } from '@/validadores/convites.validador';

const UM_DIA_MS = 1000 * 60 * 60 * 24;

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
}

export interface MembroAceiteDTO {
  id: string;
  papel: string;
  situacao: string;
  contaCompartilhada: { id: string; nome: string };
}

function gerarToken(): string {
  return randomBytes(32).toString('hex');
}

export class ConviteServico {
  constructor(
    private readonly repositorio = new ConviteRepositorio(),
    private readonly membroRepositorio = new MembroCompartilhadoRepositorio(),
    private readonly usuarioRepositorio = new UsuarioRepositorio(),
    private readonly contaCompartilhadaRepositorio = new ContaCompartilhadaRepositorio(),
  ) {}

  /** RF-54, RN-36 a RN-38. A autorizacao (administrador do grupo) ja foi
   * decidida pelo middleware de rota — aqui so as regras proprias de
   * convite. */
  async enviar(
    contaCompartilhadaId: string,
    remetente: UsuarioAutenticado,
    dados: EnviarConviteDTO,
  ): Promise<ConviteEnviadoDTO> {
    const email = dados.email.toLowerCase();

    const usuarioExistente = await this.usuarioRepositorio.buscarPorEmail(email);
    if (usuarioExistente) {
      const jaMembro = await this.membroRepositorio.buscarAtivo(
        contaCompartilhadaId,
        usuarioExistente.id,
      );
      if (jaMembro) {
        throw new JaEMembroErro('Este usuario ja e membro deste grupo.');
      }
    }

    const pendente = await this.repositorio.buscarPendentePorEmailEGrupo(
      contaCompartilhadaId,
      email,
    );
    if (pendente) {
      throw new ConviteDuplicadoErro('Ja existe um convite pendente para este e-mail neste grupo.');
    }

    const token = gerarToken();
    const expiraEm = new Date(Date.now() + DIAS_EXPIRACAO_CONVITE * UM_DIA_MS);

    const convite = await this.repositorio.criar({
      contaCompartilhadaId,
      email,
      papel: dados.papel,
      mensagem: dados.mensagem ?? null,
      token,
      enviadoPorId: remetente.id,
      usuarioConvidadoId: usuarioExistente?.id ?? null,
      expiraEm,
    });

    void this.enviarEmailDeConvite(
      contaCompartilhadaId,
      remetente.nome,
      convite.mensagem,
      email,
      token,
    );

    return mapearConviteEnviado(convite, usuarioExistente !== null);
  }

  async listarPorGrupo(contaCompartilhadaId: string): Promise<ConviteDoGrupoDTO[]> {
    const convites = await this.repositorio.listarPorGrupo(contaCompartilhadaId);
    return convites.map(mapearConviteDoGrupo);
  }

  /** RN-37: casado pelo e-mail autenticado, nao pelo id — cobre tambem
   * convites enviados antes do convidado ter se cadastrado. */
  async listarRecebidos(email: string): Promise<ConviteRecebidoDTO[]> {
    const convites = await this.repositorio.listarRecebidosPorEmail(email.toLowerCase());
    return Promise.all(
      convites.map(async (convite) =>
        mapearConviteRecebido(
          convite,
          await this.membroRepositorio.contarAtivos(convite.contaCompartilhadaId),
        ),
      ),
    );
  }

  /** RN-39: cria (ou reativa, se ex-membro) o vinculo com o papel exato do
   * convite, na mesma transacao em que o convite e marcado ACEITO. */
  async aceitar(conviteId: string, usuario: UsuarioAutenticado): Promise<MembroAceiteDTO> {
    const convite = await this.buscarConviteOuFalhar(conviteId);
    this.verificarEmailCoincide(convite, usuario.email);
    this.verificarPodeResponder(convite);

    const membro = await executarTransacao(async (tx) => {
      const membroCriado = await this.membroRepositorio.criarOuReativarMembro(
        convite.contaCompartilhadaId,
        usuario.id,
        convite.papel,
        convite.enviadoPorId,
        tx,
      );
      await this.repositorio.atualizarSituacao(convite.id, 'ACEITO', tx);
      return membroCriado;
    });

    return {
      id: membro.id,
      papel: membro.papel,
      situacao: membro.situacao,
      contaCompartilhada: {
        id: convite.contaCompartilhadaId,
        nome: convite.contaCompartilhada.nome,
      },
    };
  }

  async recusar(conviteId: string, usuario: UsuarioAutenticado): Promise<void> {
    const convite = await this.buscarConviteOuFalhar(conviteId);
    this.verificarEmailCoincide(convite, usuario.email);
    this.verificarPodeResponder(convite);

    await this.repositorio.atualizarSituacao(conviteId, 'RECUSADO');
  }

  /** `DELETE /convites/:id` nao carrega `contaCompartilhadaId` na URL —
   * nao passa pelo middleware `autorizarCompartilhada` de rota. A
   * autorizacao (administrador do grupo DESTE convite) e resolvida aqui,
   * contra a mesma fonte (`membroRepositorio.buscarAtivo`) que o
   * middleware usaria. */
  async cancelar(conviteId: string, administrador: { id: string }): Promise<void> {
    const convite = await this.buscarConviteOuFalhar(conviteId);

    const meuMembro = await this.membroRepositorio.buscarAtivo(
      convite.contaCompartilhadaId,
      administrador.id,
    );
    if (!meuMembro) {
      throw new NaoEncontradoErro('Convite nao encontrado.');
    }
    if (meuMembro.papel !== 'ADMINISTRADOR') {
      throw new PapelInsuficienteErro('Apenas o administrador pode cancelar este convite.');
    }
    if (convite.situacao !== 'PENDENTE') {
      throw new RegraNegocioErro('Este convite ja foi respondido.');
    }

    await this.repositorio.atualizarSituacao(conviteId, 'CANCELADO');
  }

  private async enviarEmailDeConvite(
    contaCompartilhadaId: string,
    nomeRemetente: string,
    mensagem: string | null,
    para: string,
    token: string,
  ): Promise<void> {
    const grupo = await this.contaCompartilhadaRepositorio.buscarPorId(contaCompartilhadaId);
    const linkConvite = `${ambiente.URL_BASE_FRONTEND}/convites/${token}`;
    await enviarEmail({
      para,
      ...modeloConviteEmail({ nomeGrupo: grupo?.nome ?? '', nomeRemetente, mensagem, linkConvite }),
    });
  }

  private async buscarConviteOuFalhar(id: string): Promise<ConviteComGrupo> {
    const convite = await this.repositorio.buscarPorId(id);
    if (!convite) {
      throw new NaoEncontradoErro('Convite nao encontrado.');
    }
    return convite;
  }

  /** RF-55/04-API.md §17.4: quem responde precisa ser o proprio convidado
   * — 403 (nao 404) porque o solicitante ja sabe que o convite existe
   * (chegou por um link/id que ele possui). */
  private verificarEmailCoincide(convite: ConviteComGrupo, emailAutenticado: string): void {
    if (convite.email.toLowerCase() !== emailAutenticado.toLowerCase()) {
      throw new ProibidoErro('Este convite foi enviado para outro e-mail.');
    }
  }

  private verificarPodeResponder(convite: ConviteComGrupo): void {
    const expirado =
      convite.situacao === 'EXPIRADO' ||
      (convite.situacao === 'PENDENTE' && convite.expiraEm.getTime() < Date.now());
    if (expirado) {
      throw new ConviteExpiradoErro('Este convite expirou.');
    }
    if (convite.situacao !== 'PENDENTE') {
      throw new RegraNegocioErro('Este convite ja foi respondido.');
    }
  }
}
