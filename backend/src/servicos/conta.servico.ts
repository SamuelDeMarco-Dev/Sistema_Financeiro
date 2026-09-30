import { executarTransacao } from '@/banco/transacao';
import { NaoEncontradoErro, RecursoEmUsoErro } from '@/erros';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import type { ContaResumo } from '@/repositorios/conta.repositorio';
import { ContaCompartilhadaServico } from '@/servicos/conta-compartilhada.servico';
import { deStringApi } from '@/utilitarios/dinheiro';
import { mapearConta } from '@/utilitarios/mapear-conta';
import type { ContaDTO } from '@/utilitarios/mapear-conta';
import type {
  AtualizarContaDTO,
  CriarContaDTO,
  ListarContasQuery,
  ReordenarContasDTO,
} from '@/validadores/contas.validador';
import type { Conta, Prisma } from '@prisma/client';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
}

interface Escopo {
  tipo: 'PESSOAL' | 'GRUPO';
  id: string;
  nome: string;
}
type CampoOrdenacao = ListarContasQuery['ordenarPor'];

function compararContas(a: ContaDTO, b: ContaDTO, campo: CampoOrdenacao): number {
  if (campo === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
  if (campo === 'saldoAtual') return a.saldoAtual.comparedTo(b.saldoAtual);
  return a.ordem - b.ordem;
}

export class ContaServico {
  constructor(
    private readonly repositorio = new ContaRepositorio(),
    private readonly contaCompartilhadaServico = new ContaCompartilhadaServico(),
  ) {}

  /** RF-58: `filtros.contaCompartilhadaId` alterna a listagem inteira para
   * o escopo do grupo — nunca mistura contas pessoais e de grupo na mesma
   * resposta (qualquer membro ativo pode ver, RN-30). Sem o filtro, o
   * comportamento pessoal e exatamente o de antes da issue #72. */
  async listar(
    usuario: UsuarioAutenticado,
    filtros: ListarContasQuery,
  ): Promise<{
    contas: ContaDTO[];
    totalizadores: { saldoTotal: Prisma.Decimal; quantidadeContas: number };
  }> {
    const filtrosRepositorio = {
      tipos: filtros.tipo,
      incluirArquivadas: filtros.incluirArquivadas,
    };

    let contas: Conta[];
    let escopo: Escopo;
    if (filtros.contaCompartilhadaId) {
      const grupo = await this.autorizarGrupoOuFalhar(filtros.contaCompartilhadaId, usuario.id, []);
      contas = await this.repositorio.listarPorGrupo(grupo.id, filtrosRepositorio);
      escopo = { tipo: 'GRUPO', id: grupo.id, nome: grupo.nome };
    } else {
      contas = await this.repositorio.listarPorUsuario(usuario.id, filtrosRepositorio);
      escopo = this.escopoPessoal(usuario);
    }

    const [linhas, saldoTotal] = await Promise.all([
      Promise.all(contas.map((conta) => this.paraDTO(conta, escopo))),
      this.repositorio.calcularSaldoConsolidado(contas),
    ]);
    linhas.sort(
      (a, b) => compararContas(a, b, filtros.ordenarPor) * (filtros.ordem === 'asc' ? 1 : -1),
    );

    return {
      contas: linhas,
      totalizadores: { saldoTotal, quantidadeContas: linhas.length },
    };
  }

  async listarResumo(usuarioId: string): Promise<ContaResumo[]> {
    return this.repositorio.listarResumoPorUsuario(usuarioId);
  }

  async buscarPorId(id: string, usuario: UsuarioAutenticado): Promise<ContaDTO> {
    const { conta, escopo } = await this.buscarContaAutorizadaOuFalhar(id, usuario, []);
    return this.paraDTO(conta, escopo);
  }

  /** RF-58: `dados.contaCompartilhadaId` cria a conta NO GRUPO em vez de
   * na conta do usuario — restrito a ADMINISTRADOR (04-API.md §9.3). A
   * moeda nunca vem do cliente: e sempre a do grupo (RN-32), mesmo
   * raciocinio de contas pessoais (que tambem nao expoem `moeda` no
   * corpo — sempre BRL por omissao do schema). */
  async criar(usuario: UsuarioAutenticado, dados: CriarContaDTO): Promise<ContaDTO> {
    if (dados.contaCompartilhadaId) {
      const grupo = await this.autorizarGrupoOuFalhar(dados.contaCompartilhadaId, usuario.id, [
        'ADMINISTRADOR',
      ]);
      const conta = await this.repositorio.criarDeGrupo(dados.contaCompartilhadaId, {
        nome: dados.nome,
        tipo: dados.tipo,
        instituicao: dados.instituicao ?? null,
        saldoInicial: deStringApi(dados.saldoInicial),
        cor: dados.cor,
        icone: dados.icone,
        incluirNoSaldoTotal: dados.incluirNoSaldoTotal,
        moeda: grupo.moeda,
      });
      return this.paraDTO(conta, { tipo: 'GRUPO', id: grupo.id, nome: grupo.nome });
    }

    const conta = await this.repositorio.criar(usuario.id, {
      nome: dados.nome,
      tipo: dados.tipo,
      instituicao: dados.instituicao ?? null,
      saldoInicial: deStringApi(dados.saldoInicial),
      cor: dados.cor,
      icone: dados.icone,
      incluirNoSaldoTotal: dados.incluirNoSaldoTotal,
    });

    return this.paraDTO(conta, this.escopoPessoal(usuario));
  }

  async atualizar(
    id: string,
    usuario: UsuarioAutenticado,
    dados: AtualizarContaDTO,
  ): Promise<ContaDTO> {
    const { escopo } = await this.buscarContaAutorizadaOuFalhar(id, usuario, ['ADMINISTRADOR']);

    const dadosPrisma: Prisma.ContaUpdateInput = {
      ...(dados.nome !== undefined && { nome: dados.nome }),
      ...(dados.tipo !== undefined && { tipo: dados.tipo }),
      ...(dados.instituicao !== undefined && { instituicao: dados.instituicao }),
      ...(dados.saldoInicial !== undefined && { saldoInicial: deStringApi(dados.saldoInicial) }),
      ...(dados.cor !== undefined && { cor: dados.cor }),
      ...(dados.icone !== undefined && { icone: dados.icone }),
      ...(dados.incluirNoSaldoTotal !== undefined && {
        incluirNoSaldoTotal: dados.incluirNoSaldoTotal,
      }),
    };

    const conta = await this.repositorio.atualizar(id, dadosPrisma);
    return this.paraDTO(conta, escopo);
  }

  async arquivar(id: string, usuario: UsuarioAutenticado): Promise<ContaDTO> {
    const { escopo } = await this.buscarContaAutorizadaOuFalhar(id, usuario, ['ADMINISTRADOR']);
    const conta = await this.repositorio.arquivar(id);
    return this.paraDTO(conta, escopo);
  }

  async desarquivar(id: string, usuario: UsuarioAutenticado): Promise<ContaDTO> {
    const { escopo } = await this.buscarContaAutorizadaOuFalhar(id, usuario, ['ADMINISTRADOR']);
    const conta = await this.repositorio.desarquivar(id);
    return this.paraDTO(conta, escopo);
  }

  /** RN-51: confirma que toda conta da lista pertence ao usuario **antes**
   * de reordenar qualquer uma — evita que uma reordenacao parcial vaze a
   * existencia de uma conta alheia. Escopo pessoal apenas — reordenar
   * contas de grupo fica para quando essa necessidade surgir. */
  async reordenar(usuarioId: string, dados: ReordenarContasDTO): Promise<void> {
    const contas = await Promise.all(
      dados.ordens.map((item) => this.repositorio.buscarPorId(item.id, usuarioId)),
    );
    if (contas.some((conta) => conta === null)) {
      throw new NaoEncontradoErro('Conta nao encontrada.');
    }

    await executarTransacao((tx) => this.repositorio.reordenar(dados.ordens, tx));
  }

  async excluir(id: string, usuario: UsuarioAutenticado): Promise<void> {
    await this.buscarContaAutorizadaOuFalhar(id, usuario, ['ADMINISTRADOR']);

    const quantidade = await this.repositorio.contarMovimentacoes(id);
    if (quantidade > 0) {
      throw new RecursoEmUsoErro(
        `Esta conta possui ${quantidade} movimentações e não pode ser excluída. Arquive-a para preservar o histórico.`,
        [{ campo: 'id', mensagem: `Existem ${quantidade} movimentações vinculadas.` }],
      );
    }

    await this.repositorio.excluirLogicamente(id);
  }

  /** RN-51: 404 tanto para conta de outro usuario quanto para conta de um
   * grupo do qual o solicitante nao e membro — em nenhum dos dois casos
   * o solicitante deveria saber que a conta existe. `papeisPermitidos`
   * vazio aceita qualquer membro ativo (leitura); com papeis, restringe
   * mutacoes de conta de grupo a eles (hoje, sempre ADMINISTRADOR). */
  private async buscarContaAutorizadaOuFalhar(
    id: string,
    usuario: UsuarioAutenticado,
    papeisPermitidos: ('ADMINISTRADOR' | 'PARTICIPANTE' | 'OBSERVADOR')[],
  ): Promise<{ conta: Conta; escopo: Escopo }> {
    const conta = await this.repositorio.buscarPorIdSemEscopo(id);
    if (!conta) {
      throw new NaoEncontradoErro('Conta nao encontrada.');
    }

    if (conta.usuarioId !== null) {
      if (conta.usuarioId !== usuario.id) {
        throw new NaoEncontradoErro('Conta nao encontrada.');
      }
      return { conta, escopo: this.escopoPessoal(usuario) };
    }

    // chk_conta_escopo garante contaCompartilhadaId != null aqui.
    if (conta.contaCompartilhadaId === null) {
      throw new NaoEncontradoErro('Conta nao encontrada.');
    }
    const grupo = await this.autorizarGrupoOuFalhar(
      conta.contaCompartilhadaId,
      usuario.id,
      papeisPermitidos,
    );
    return { conta, escopo: { tipo: 'GRUPO', id: grupo.id, nome: grupo.nome } };
  }

  private async autorizarGrupoOuFalhar(
    contaCompartilhadaId: string,
    usuarioId: string,
    papeisPermitidos: ('ADMINISTRADOR' | 'PARTICIPANTE' | 'OBSERVADOR')[],
  ) {
    await this.contaCompartilhadaServico.autorizarPapel(
      contaCompartilhadaId,
      usuarioId,
      papeisPermitidos,
    );
    return this.contaCompartilhadaServico.buscarGrupoOuFalhar(contaCompartilhadaId);
  }

  private escopoPessoal(usuario: UsuarioAutenticado): Escopo {
    return { tipo: 'PESSOAL', id: usuario.id, nome: usuario.nome };
  }

  private async paraDTO(conta: Conta, escopo: Escopo): Promise<ContaDTO> {
    const [quantidadeMovimentacoes, saldoAtual, saldoPrevisto] = await Promise.all([
      this.repositorio.contarMovimentacoes(conta.id),
      this.repositorio.calcularSaldoAtual(conta),
      this.repositorio.calcularSaldoPrevisto(conta),
    ]);
    return mapearConta(conta, escopo, saldoAtual, saldoPrevisto, quantidadeMovimentacoes);
  }
}
