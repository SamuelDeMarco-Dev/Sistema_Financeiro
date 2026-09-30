import { NaoEncontradoErro } from '@/erros';
import { EtiquetaRepositorio } from '@/repositorios/etiqueta.repositorio';
import { autorizarPapelNoGrupo } from '@/servicos/autorizacao-grupo.servico';
import { mapearEtiqueta } from '@/utilitarios/mapear-etiqueta';
import type { EtiquetaDTO } from '@/utilitarios/mapear-etiqueta';
import type {
  AtualizarEtiquetaDTO,
  CriarEtiquetaDTO,
  ListarEtiquetasQuery,
} from '@/validadores/etiquetas.validador';
import type { Etiqueta, PapelMembro } from '@prisma/client';

export class EtiquetaServico {
  constructor(private readonly repositorio = new EtiquetaRepositorio()) {}

  /** RF-58: `filtros.contaCompartilhadaId` alterna a listagem inteira para
   * o escopo do grupo — qualquer membro ativo pode ver (RN-30). Nunca
   * mistura etiquetas pessoais e de grupo na mesma resposta. */
  async listar(usuarioId: string, filtros: ListarEtiquetasQuery): Promise<EtiquetaDTO[]> {
    const etiquetas = filtros.contaCompartilhadaId
      ? await this.listarDeGrupo(filtros.contaCompartilhadaId, usuarioId)
      : await this.repositorio.listarPorUsuario(usuarioId);

    return Promise.all(etiquetas.map((etiqueta) => this.paraDTO(etiqueta)));
  }

  /** RF-58: `dados.contaCompartilhadaId` cria a etiqueta NO GRUPO —
   * qualquer membro que pode criar movimentacao (ADMINISTRADOR ou
   * PARTICIPANTE, RN-30) tambem pode criar a etiqueta usada para
   * organiza-las; OBSERVADOR nunca. */
  async criar(usuarioId: string, dados: CriarEtiquetaDTO): Promise<EtiquetaDTO> {
    if (dados.contaCompartilhadaId) {
      await autorizarPapelNoGrupo(dados.contaCompartilhadaId, usuarioId, [
        'ADMINISTRADOR',
        'PARTICIPANTE',
      ]);
      const etiqueta = await this.repositorio.criarDeGrupo(dados.contaCompartilhadaId, {
        nome: dados.nome,
        cor: dados.cor,
      });
      return this.paraDTO(etiqueta);
    }

    const etiqueta = await this.repositorio.criar(usuarioId, { nome: dados.nome, cor: dados.cor });
    return this.paraDTO(etiqueta);
  }

  async atualizar(
    id: string,
    usuarioId: string,
    dados: AtualizarEtiquetaDTO,
  ): Promise<EtiquetaDTO> {
    await this.buscarEtiquetaAutorizadaOuFalhar(id, usuarioId, ['ADMINISTRADOR', 'PARTICIPANTE']);

    const atualizada = await this.repositorio.atualizar(id, {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.cor !== undefined && { cor: dados.cor }),
    });

    return this.paraDTO(atualizada);
  }

  /** RF-33: exclusao remove so o vinculo (Cascade em MovimentacaoEtiqueta),
   * a movimentacao em si permanece intacta. */
  async excluir(id: string, usuarioId: string): Promise<void> {
    await this.buscarEtiquetaAutorizadaOuFalhar(id, usuarioId, ['ADMINISTRADOR', 'PARTICIPANTE']);
    await this.repositorio.excluir(id);
  }

  private async listarDeGrupo(
    contaCompartilhadaId: string,
    usuarioId: string,
  ): Promise<Etiqueta[]> {
    await autorizarPapelNoGrupo(contaCompartilhadaId, usuarioId, []);
    return this.repositorio.listarPorGrupo(contaCompartilhadaId);
  }

  /** RN-51: 404 tanto para etiqueta de outro usuario quanto para etiqueta
   * de um grupo do qual o solicitante nao e membro/nao tem o papel exigido. */
  private async buscarEtiquetaAutorizadaOuFalhar(
    id: string,
    usuarioId: string,
    papeisPermitidos: PapelMembro[],
  ): Promise<Etiqueta> {
    const etiqueta = await this.repositorio.buscarPorIdSemEscopo(id);
    if (!etiqueta) {
      throw new NaoEncontradoErro('Etiqueta nao encontrada.');
    }

    if (etiqueta.usuarioId !== null) {
      if (etiqueta.usuarioId !== usuarioId) {
        throw new NaoEncontradoErro('Etiqueta nao encontrada.');
      }
      return etiqueta;
    }
    if (etiqueta.contaCompartilhadaId === null) {
      throw new NaoEncontradoErro('Etiqueta nao encontrada.');
    }

    await autorizarPapelNoGrupo(etiqueta.contaCompartilhadaId, usuarioId, papeisPermitidos);
    return etiqueta;
  }

  private async paraDTO(etiqueta: Etiqueta): Promise<EtiquetaDTO> {
    const quantidadeMovimentacoes = await this.repositorio.contarUso(etiqueta.id);
    return mapearEtiqueta(etiqueta, quantidadeMovimentacoes);
  }
}
