import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { executarTransacao } from '@/banco/transacao';
import { ambiente } from '@/configuracao/ambiente';
import { TIPOS_MIME_AVATAR_PERMITIDOS } from '@/configuracao/constantes';
import {
  AdministradorUnicoErro,
  NaoEncontradoErro,
  RegraNegocioErro,
  TipoArquivoInvalidoErro,
  ValidacaoErro,
} from '@/erros';
import { ContaCompartilhadaRepositorio } from '@/repositorios/conta-compartilhada.repositorio';
import { MembroCompartilhadoRepositorio } from '@/repositorios/membro-compartilhado.repositorio';
import { PerfilRepositorio } from '@/repositorios/perfil.repositorio';
import { CategoriaServico } from '@/servicos/categoria.servico';
import { hojeNoTimezone } from '@/utilitarios/data';
import {
  mapearContaCompartilhadaDetalhe,
  mapearContaCompartilhadaLista,
  mapearMembroDoGrupo,
  mapearMembrosDoGrupo,
} from '@/utilitarios/mapear-conta-compartilhada';
import type {
  ContaCompartilhadaDetalheDTO,
  ContaCompartilhadaListaItemDTO,
  MembroDoGrupoDTO,
  TransferenciaAdministracaoDTO,
} from '@/utilitarios/mapear-conta-compartilhada';
import { primeiroEUltimoDiaDoMes } from '@/utilitarios/periodo';
import { resolverPermissoes } from '@/utilitarios/resolver-permissoes';
import type {
  AtualizarContaCompartilhadaDTO,
  CriarContaCompartilhadaDTO,
} from '@/validadores/contas-compartilhadas.validador';
import type { ContaCompartilhada, MembroCompartilhado, PapelMembro } from '@prisma/client';

const QUALIDADE_WEBP = 85;

export interface UsuarioAutenticado {
  id: string;
  nome: string;
}

export class ContaCompartilhadaServico {
  constructor(
    private readonly repositorio = new ContaCompartilhadaRepositorio(),
    private readonly membroRepositorio = new MembroCompartilhadoRepositorio(),
    private readonly categoriaServico = new CategoriaServico(),
    private readonly perfilRepositorio = new PerfilRepositorio(),
  ) {}

  async listar(usuario: UsuarioAutenticado): Promise<ContaCompartilhadaListaItemDTO[]> {
    const vinculos = await this.membroRepositorio.listarGruposAtivosPorUsuario(usuario.id);
    const hoje = await this.hojeDoUsuario(usuario.id);
    const periodo = primeiroEUltimoDiaDoMes(hoje);

    const itens = await Promise.all(
      vinculos.map(async ({ contaCompartilhadaId, papel }) => {
        const grupo = await this.repositorio.buscarPorId(contaCompartilhadaId);
        if (!grupo) return null;

        const [saldoTotal, quantidadeMembros, quantidadeContas, resumo] = await Promise.all([
          this.repositorio.calcularSaldoTotal(grupo.id),
          this.membroRepositorio.contarAtivos(grupo.id),
          this.repositorio.contarContasAtivas(grupo.id),
          this.repositorio.calcularResumoPeriodo(grupo.id, periodo),
        ]);

        return mapearContaCompartilhadaLista(
          grupo,
          papel,
          saldoTotal,
          quantidadeMembros,
          quantidadeContas,
          {
            receitas: resumo.receitas,
            despesas: resumo.despesas,
            resultado: resumo.receitas.minus(resumo.despesas),
          },
        );
      }),
    );

    return itens.filter((item): item is ContaCompartilhadaListaItemDTO => item !== null);
  }

  /** RF-53: grupo, administrador e (opcionalmente) as categorias padrao
   * do sistema nascem juntos, na mesma transacao — RN-28 exige que todo
   * grupo tenha, desde o primeiro instante, exatamente um ADMINISTRADOR. */
  async criar(
    usuario: UsuarioAutenticado,
    dados: CriarContaCompartilhadaDTO,
  ): Promise<ContaCompartilhadaDetalheDTO> {
    const grupo = await executarTransacao(async (tx) => {
      const criado = await this.repositorio.criar(
        usuario.id,
        {
          nome: dados.nome,
          descricao: dados.descricao ?? null,
          moeda: dados.moeda,
          cor: dados.cor,
          permiteParticipanteEditarProprias: dados.permiteParticipanteEditarProprias,
        },
        tx,
      );
      await this.membroRepositorio.criarAdministrador(criado.id, usuario.id, tx);
      if (dados.criarCategoriasPadrao) {
        await this.categoriaServico.copiarPadraoParaGrupo(criado.id, tx);
      }
      return criado;
    });

    return this.paraDetalheDTO(grupo, 'ADMINISTRADOR');
  }

  /** 02-ARCHITECTURE.md §8.3 nivel 2 (issue #68): unico ponto de resolucao
   * do vinculo usuario-grupo, chamado pelo middleware `autorizarCompartilhada`
   * — nunca reimplementado aqui nem em outro servico. */
  async buscarMeuMembroAtivo(
    contaCompartilhadaId: string,
    usuarioId: string,
  ): Promise<MembroCompartilhado | null> {
    return this.membroRepositorio.buscarAtivo(contaCompartilhadaId, usuarioId);
  }

  /** A autorizacao (membro ativo? papel permitido?) ja foi decidida pelo
   * middleware antes do controlador chegar aqui — `meuPapel` vem de
   * `req.membro`, resolvido uma unica vez por requisicao. */
  async buscarPorId(
    id: string,
    meuPapel: MembroCompartilhado['papel'],
  ): Promise<ContaCompartilhadaDetalheDTO> {
    const grupo = await this.buscarGrupoOuFalhar(id);
    return this.paraDetalheDTO(grupo, meuPapel);
  }

  async atualizar(
    id: string,
    dados: AtualizarContaCompartilhadaDTO,
  ): Promise<ContaCompartilhadaDetalheDTO> {
    const atualizado = await this.repositorio.atualizar(id, {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.descricao !== undefined && { descricao: dados.descricao }),
      ...(dados.cor !== undefined && { cor: dados.cor }),
      ...(dados.permiteParticipanteEditarProprias !== undefined && {
        permiteParticipanteEditarProprias: dados.permiteParticipanteEditarProprias,
      }),
    });

    return this.paraDetalheDTO(atualizado, 'ADMINISTRADOR');
  }

  /** RN-33: exclusao logica, restrita ao administrador pelo middleware de
   * rota, exigindo o nome exato do grupo como confirmacao explicita —
   * historico preservado. */
  async excluir(id: string, confirmacao: string): Promise<void> {
    const grupo = await this.buscarGrupoOuFalhar(id);

    if (confirmacao.trim() !== grupo.nome) {
      throw new ValidacaoErro('Confirmacao nao corresponde ao nome do grupo.', [
        { campo: 'confirmacao', mensagem: 'Digite o nome do grupo exatamente como exibido.' },
      ]);
    }

    await this.repositorio.excluirLogicamente(id);
  }

  /** RF-53/§16 route table: restrito ao administrador pelo middleware de
   * rota — mesmo raciocinio de `PerfilServico.atualizarFoto` (nunca
   * confiar no Content-Type declarado, so no magic number do buffer). */
  async atualizarImagem(id: string, arquivo: Buffer): Promise<string> {
    const tipoDetectado = await fileTypeFromBuffer(arquivo);
    if (!tipoDetectado || !TIPOS_MIME_AVATAR_PERMITIDOS.has(tipoDetectado.mime)) {
      throw new TipoArquivoInvalidoErro('Tipo de arquivo não suportado. Envie JPEG, PNG ou WebP.');
    }

    const diretorio = path.join(ambiente.DIRETORIO_UPLOADS, 'grupos');
    await mkdir(diretorio, { recursive: true });
    const caminho = path.join(diretorio, `${id}.webp`);
    await sharp(arquivo).webp({ quality: QUALIDADE_WEBP }).toFile(caminho);

    const imagemUrl = `${ambiente.URL_BASE_API}/uploads/grupos/${id}.webp`;
    await this.repositorio.atualizar(id, { imagemUrl });
    return imagemUrl;
  }

  async listarMembros(contaCompartilhadaId: string): Promise<MembroDoGrupoDTO[]> {
    const membros = await this.membroRepositorio.listarAtivosComUsuario(contaCompartilhadaId);
    return mapearMembrosDoGrupo(membros);
  }

  /** RF-56: proibe alterar o proprio papel (evita o admin se rebaixar por
   * engano e ficar sem acesso as acoes que exercia) e proibe promover a
   * ADMINISTRADOR por aqui — RN-28 so admite essa troca atomica via
   * `transferirAdministracao`, que sempre mantem exatamente um. */
  async alterarPapelMembro(
    contaCompartilhadaId: string,
    membroId: string,
    meuMembroId: string,
    novoPapel: PapelMembro,
  ): Promise<MembroDoGrupoDTO> {
    if (membroId === meuMembroId) {
      throw new RegraNegocioErro('Nao e possivel alterar o proprio papel.');
    }
    if (novoPapel === 'ADMINISTRADOR') {
      throw new RegraNegocioErro(
        'Para tornar outro membro administrador, use POST /transferir-administracao.',
      );
    }

    const membro = await this.buscarMembroAtivoOuFalhar(contaCompartilhadaId, membroId);
    await this.membroRepositorio.atualizarPapel(membro.id, novoPapel);
    const atualizado = await this.membroRepositorio.buscarComUsuarioPorId(membro.id);
    if (!atualizado) {
      throw new NaoEncontradoErro('Membro nao encontrado neste grupo.');
    }
    return mapearMembroDoGrupo(atualizado);
  }

  /** RN-29/RN-34: o administrador nunca e removido por aqui (precisa
   * transferir antes) — as movimentacoes do membro removido permanecem no
   * grupo, atribuidas ao usuario original; so o vinculo muda de situacao. */
  async removerMembro(contaCompartilhadaId: string, membroId: string): Promise<void> {
    const membro = await this.buscarMembroAtivoOuFalhar(contaCompartilhadaId, membroId);
    if (membro.papel === 'ADMINISTRADOR') {
      throw new AdministradorUnicoErro(
        'Transfira a administracao para outro membro antes de remover o administrador atual.',
      );
    }

    await this.membroRepositorio.marcarRemovido(membro.id);
  }

  /** RN-28: unica forma de trocar o administrador — as duas escritas
   * (demover o atual, promover o novo) sao atomicas, garantindo que o
   * grupo jamais fique com dois administradores nem com zero. */
  async transferirAdministracao(
    contaCompartilhadaId: string,
    meuMembroId: string,
    novoAdministradorMembroId: string,
  ): Promise<TransferenciaAdministracaoDTO> {
    const novoAdministrador = await this.buscarMembroAtivoOuFalhar(
      contaCompartilhadaId,
      novoAdministradorMembroId,
    );

    const { antigo, novo } = await executarTransacao((tx) =>
      this.membroRepositorio.transferirAdministracao(meuMembroId, novoAdministrador.id, tx),
    );

    return {
      administradorAnterior: { membroId: antigo.id, papel: antigo.papel },
      novoAdministrador: { membroId: novo.id, papel: novo.papel },
    };
  }

  /** RN-29: o administrador nao pode sair sem transferir a administracao
   * antes — sem essa checagem, o grupo ficaria sem nenhum administrador. */
  async sair(meuMembro: MembroCompartilhado): Promise<void> {
    if (meuMembro.papel === 'ADMINISTRADOR') {
      throw new AdministradorUnicoErro(
        'Transfira a administracao para outro membro antes de sair do grupo.',
      );
    }

    await this.membroRepositorio.marcarSaiu(meuMembro.id);
  }

  private async buscarMembroAtivoOuFalhar(
    contaCompartilhadaId: string,
    membroId: string,
  ): Promise<MembroCompartilhado> {
    const membro = await this.membroRepositorio.buscarAtivoPorId(contaCompartilhadaId, membroId);
    if (!membro) {
      throw new NaoEncontradoErro('Membro nao encontrado neste grupo.');
    }
    return membro;
  }

  private async hojeDoUsuario(usuarioId: string): Promise<Date> {
    const perfil = await this.perfilRepositorio.buscarPorUsuarioId(usuarioId);
    return hojeNoTimezone(perfil?.timezone ?? 'America/Sao_Paulo');
  }

  /** So chega aqui depois do middleware confirmar a existencia do vinculo
   * ativo — esta busca e so uma leitura defensiva do proprio registro do
   * grupo (nunca uma decisao de autorizacao). */
  private async buscarGrupoOuFalhar(id: string): Promise<ContaCompartilhada> {
    const grupo = await this.repositorio.buscarPorId(id);
    if (!grupo) {
      throw new NaoEncontradoErro('Conta compartilhada nao encontrada.');
    }
    return grupo;
  }

  private async paraDetalheDTO(
    grupo: ContaCompartilhada,
    meuPapel: MembroCompartilhado['papel'],
  ): Promise<ContaCompartilhadaDetalheDTO> {
    const [membros, contas, saldoTotal] = await Promise.all([
      this.membroRepositorio.listarAtivosComUsuario(grupo.id),
      this.repositorio.listarContasComSaldo(grupo.id),
      this.repositorio.calcularSaldoTotal(grupo.id),
    ]);

    const permissoes = resolverPermissoes(meuPapel, {
      permiteParticipanteEditarProprias: grupo.permiteParticipanteEditarProprias,
    });

    return mapearContaCompartilhadaDetalhe(
      grupo,
      meuPapel,
      permissoes,
      saldoTotal,
      membros,
      contas,
    );
  }
}
