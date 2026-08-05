import { NaoEncontradoErro } from '@/erros';
import { EtiquetaRepositorio } from '@/repositorios/etiqueta.repositorio';
import { mapearEtiqueta } from '@/utilitarios/mapear-etiqueta';
import type { EtiquetaDTO } from '@/utilitarios/mapear-etiqueta';
import type { AtualizarEtiquetaDTO, CriarEtiquetaDTO } from '@/validadores/etiquetas.validador';
import type { Etiqueta } from '@prisma/client';

export class EtiquetaServico {
  constructor(private readonly repositorio = new EtiquetaRepositorio()) {}

  async listar(usuarioId: string): Promise<EtiquetaDTO[]> {
    const etiquetas = await this.repositorio.listarPorUsuario(usuarioId);
    return Promise.all(etiquetas.map((etiqueta) => this.paraDTO(etiqueta)));
  }

  async criar(usuarioId: string, dados: CriarEtiquetaDTO): Promise<EtiquetaDTO> {
    const etiqueta = await this.repositorio.criar(usuarioId, { nome: dados.nome, cor: dados.cor });
    return this.paraDTO(etiqueta);
  }

  async atualizar(
    id: string,
    usuarioId: string,
    dados: AtualizarEtiquetaDTO,
  ): Promise<EtiquetaDTO> {
    await this.buscarEtiquetaOuFalhar(id, usuarioId);

    const atualizada = await this.repositorio.atualizar(id, {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.cor !== undefined && { cor: dados.cor }),
    });

    return this.paraDTO(atualizada);
  }

  /** RF-33: exclusao remove so o vinculo (Cascade em MovimentacaoEtiqueta),
   * a movimentacao em si permanece intacta. */
  async excluir(id: string, usuarioId: string): Promise<void> {
    await this.buscarEtiquetaOuFalhar(id, usuarioId);
    await this.repositorio.excluir(id);
  }

  private async buscarEtiquetaOuFalhar(id: string, usuarioId: string): Promise<Etiqueta> {
    const etiqueta = await this.repositorio.buscarPorId(id, usuarioId);
    if (!etiqueta) {
      throw new NaoEncontradoErro('Etiqueta nao encontrada.');
    }
    return etiqueta;
  }

  private async paraDTO(etiqueta: Etiqueta): Promise<EtiquetaDTO> {
    const quantidadeMovimentacoes = await this.repositorio.contarUso(etiqueta.id);
    return mapearEtiqueta(etiqueta, quantidadeMovimentacoes);
  }
}
