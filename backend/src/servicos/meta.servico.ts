import { Prisma } from '@prisma/client';
import { NaoEncontradoErro, RegraNegocioErro } from '@/erros';
import { MetaRepositorio } from '@/repositorios/meta.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { autorizarPapelNoGrupo } from '@/servicos/autorizacao-grupo.servico';
import { deDataIso, hojeNoTimezone } from '@/utilitarios/data';
import { mapearMeta } from '@/utilitarios/mapear-meta';
import type { MetaDTO } from '@/utilitarios/mapear-meta';
import type {
  AtualizarMetaDTO,
  CriarMetaDTO,
  ListarMetasQuery,
} from '@/validadores/metas.validador';
import type { Meta, PapelMembro } from '@prisma/client';

export class MetaServico {
  constructor(
    private readonly repositorio = new MetaRepositorio(),
    private readonly perfilRepositorio = new PerfilRepositorio(),
  ) {}

  /** RF-58 (mesmo padrao de categorias/etiquetas): `filtros.contaCompartilhadaId`
   * alterna a listagem inteira para o escopo do grupo — qualquer membro
   * ativo pode ver, nunca mistura metas pessoais e de grupo na resposta. */
  async listar(usuarioId: string, filtros: ListarMetasQuery): Promise<MetaDTO[]> {
    const hoje = await this.hojeDoUsuario(usuarioId);
    const metas = filtros.contaCompartilhadaId
      ? await this.listarDeGrupo(filtros.contaCompartilhadaId, usuarioId, filtros.situacao)
      : await this.repositorio.listar(usuarioId, { situacao: filtros.situacao });

    return metas.map((meta) => mapearMeta(meta, hoje));
  }

  private async listarDeGrupo(
    contaCompartilhadaId: string,
    usuarioId: string,
    situacao: ListarMetasQuery['situacao'],
  ): Promise<Meta[]> {
    await autorizarPapelNoGrupo(contaCompartilhadaId, usuarioId, []);
    return this.repositorio.listarDeGrupo(contaCompartilhadaId, { situacao });
  }

  async buscarPorId(id: string, usuarioId: string): Promise<MetaDTO> {
    const hoje = await this.hojeDoUsuario(usuarioId);
    const meta = await this.buscarMetaAutorizadaOuFalhar(id, usuarioId, []);
    return mapearMeta(meta, hoje);
  }

  /** RF-61: cria no escopo pessoal por padrao; `dados.contaCompartilhadaId`
   * cria no grupo, exigindo apenas membresia ativa (sem restricao de
   * papel, ao contrario de categorias). */
  async criar(usuarioId: string, dados: CriarMetaDTO): Promise<MetaDTO> {
    const hoje = await this.hojeDoUsuario(usuarioId);
    const dadosCriacao = {
      nome: dados.nome,
      descricao: dados.descricao ?? null,
      valorAlvo: new Prisma.Decimal(dados.valorAlvo),
      prazoEm: dados.prazoEm ? deDataIso(dados.prazoEm) : null,
      cor: dados.cor,
      icone: dados.icone,
    };

    const meta = dados.contaCompartilhadaId
      ? await this.criarDeGrupo(dados.contaCompartilhadaId, usuarioId, dadosCriacao)
      : await this.repositorio.criar(usuarioId, dadosCriacao);

    return mapearMeta(meta, hoje);
  }

  private async criarDeGrupo(
    contaCompartilhadaId: string,
    usuarioId: string,
    dados: Parameters<MetaRepositorio['criarDeGrupo']>[1],
  ): Promise<Meta> {
    await autorizarPapelNoGrupo(contaCompartilhadaId, usuarioId, []);
    return this.repositorio.criarDeGrupo(contaCompartilhadaId, dados);
  }

  /** RN-46: reduzir o alvo abaixo do que ja foi acumulado tornaria o
   * progresso incoerente (mais de 100% "de verdade", nao so na exibicao),
   * entao e bloqueado explicitamente em vez de deixar o numero mentir. */
  async atualizar(id: string, usuarioId: string, dados: AtualizarMetaDTO): Promise<MetaDTO> {
    const hoje = await this.hojeDoUsuario(usuarioId);
    const meta = await this.buscarMetaAutorizadaOuFalhar(id, usuarioId, []);

    const novoValorAlvo =
      dados.valorAlvo !== undefined ? new Prisma.Decimal(dados.valorAlvo) : meta.valorAlvo;
    if (novoValorAlvo.lessThan(meta.valorAcumulado)) {
      throw new RegraNegocioErro('O valor-alvo nao pode ser menor que o valor ja acumulado.');
    }

    const atualizada = await this.repositorio.atualizar(id, {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.descricao !== undefined && { descricao: dados.descricao }),
      ...(dados.valorAlvo !== undefined && { valorAlvo: novoValorAlvo }),
      ...(dados.prazoEm !== undefined && {
        prazoEm: dados.prazoEm ? deDataIso(dados.prazoEm) : null,
      }),
      ...(dados.cor !== undefined && { cor: dados.cor }),
      ...(dados.icone !== undefined && { icone: dados.icone }),
    });

    return mapearMeta(atualizada, hoje);
  }

  async excluir(id: string, usuarioId: string): Promise<void> {
    await this.buscarMetaAutorizadaOuFalhar(id, usuarioId, []);
    await this.repositorio.excluirLogicamente(id);
  }

  /** RN-51: 404 tanto para meta de outro usuario quanto para meta de um
   * grupo do qual o solicitante nao e membro — nunca 403, que confirmaria
   * a existencia do recurso. */
  private async buscarMetaAutorizadaOuFalhar(
    id: string,
    usuarioId: string,
    papeisPermitidos: PapelMembro[],
  ): Promise<Meta> {
    const meta = await this.repositorio.buscarPorIdSemEscopo(id);
    if (!meta) {
      throw new NaoEncontradoErro('Meta nao encontrada.');
    }

    if (meta.usuarioId !== null) {
      if (meta.usuarioId !== usuarioId) {
        throw new NaoEncontradoErro('Meta nao encontrada.');
      }
      return meta;
    }
    if (meta.contaCompartilhadaId === null) {
      throw new NaoEncontradoErro('Meta nao encontrada.');
    }

    await autorizarPapelNoGrupo(meta.contaCompartilhadaId, usuarioId, papeisPermitidos);
    return meta;
  }

  private async hojeDoUsuario(usuarioId: string): Promise<Date> {
    const perfil = await this.perfilRepositorio.buscarPorUsuarioId(usuarioId);
    return hojeNoTimezone(perfil?.timezone ?? 'America/Sao_Paulo');
  }
}
