import { executarTransacao } from '@/banco/transacao';
import { NaoEncontradoErro, RecursoEmUsoErro } from '@/erros';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import type { ContaResumo } from '@/repositorios/conta.repositorio';
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

type CampoOrdenacao = ListarContasQuery['ordenarPor'];

function compararContas(a: ContaDTO, b: ContaDTO, campo: CampoOrdenacao): number {
  if (campo === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
  if (campo === 'saldoAtual') return a.saldoAtual.comparedTo(b.saldoAtual);
  return a.ordem - b.ordem;
}

export class ContaServico {
  constructor(private readonly repositorio = new ContaRepositorio()) {}

  async listar(
    usuario: UsuarioAutenticado,
    filtros: ListarContasQuery,
  ): Promise<{
    contas: ContaDTO[];
    totalizadores: { saldoTotal: Prisma.Decimal; quantidadeContas: number };
  }> {
    const contas = await this.repositorio.listarPorUsuario(usuario.id, {
      tipos: filtros.tipo,
      incluirArquivadas: filtros.incluirArquivadas,
    });

    const linhas = await Promise.all(contas.map((conta) => this.paraDTO(conta, usuario)));
    linhas.sort(
      (a, b) => compararContas(a, b, filtros.ordenarPor) * (filtros.ordem === 'asc' ? 1 : -1),
    );

    return {
      contas: linhas,
      totalizadores: {
        saldoTotal: this.repositorio.calcularSaldoConsolidado(contas),
        quantidadeContas: linhas.length,
      },
    };
  }

  async listarResumo(usuarioId: string): Promise<ContaResumo[]> {
    return this.repositorio.listarResumoPorUsuario(usuarioId);
  }

  async buscarPorId(id: string, usuario: UsuarioAutenticado): Promise<ContaDTO> {
    const conta = await this.buscarContaOuFalhar(id, usuario.id);
    return this.paraDTO(conta, usuario);
  }

  async criar(usuario: UsuarioAutenticado, dados: CriarContaDTO): Promise<ContaDTO> {
    const conta = await this.repositorio.criar(usuario.id, {
      nome: dados.nome,
      tipo: dados.tipo,
      instituicao: dados.instituicao ?? null,
      saldoInicial: deStringApi(dados.saldoInicial),
      cor: dados.cor,
      icone: dados.icone,
      incluirNoSaldoTotal: dados.incluirNoSaldoTotal,
    });

    return this.paraDTO(conta, usuario);
  }

  async atualizar(
    id: string,
    usuario: UsuarioAutenticado,
    dados: AtualizarContaDTO,
  ): Promise<ContaDTO> {
    await this.buscarContaOuFalhar(id, usuario.id);

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
    return this.paraDTO(conta, usuario);
  }

  async arquivar(id: string, usuario: UsuarioAutenticado): Promise<ContaDTO> {
    await this.buscarContaOuFalhar(id, usuario.id);
    const conta = await this.repositorio.arquivar(id);
    return this.paraDTO(conta, usuario);
  }

  async desarquivar(id: string, usuario: UsuarioAutenticado): Promise<ContaDTO> {
    await this.buscarContaOuFalhar(id, usuario.id);
    const conta = await this.repositorio.desarquivar(id);
    return this.paraDTO(conta, usuario);
  }

  /** RN-51: confirma que toda conta da lista pertence ao usuario **antes**
   * de reordenar qualquer uma — evita que uma reordenacao parcial vaze a
   * existencia de uma conta alheia. */
  async reordenar(usuarioId: string, dados: ReordenarContasDTO): Promise<void> {
    const contas = await Promise.all(
      dados.ordens.map((item) => this.repositorio.buscarPorId(item.id, usuarioId)),
    );
    if (contas.some((conta) => conta === null)) {
      throw new NaoEncontradoErro('Conta nao encontrada.');
    }

    await executarTransacao((tx) => this.repositorio.reordenar(dados.ordens, tx));
  }

  async excluir(id: string, usuarioId: string): Promise<void> {
    await this.buscarContaOuFalhar(id, usuarioId);

    const quantidade = await this.repositorio.contarMovimentacoes(id);
    if (quantidade > 0) {
      throw new RecursoEmUsoErro(
        `Esta conta possui ${quantidade} movimentações e não pode ser excluída. Arquive-a para preservar o histórico.`,
        [{ campo: 'id', mensagem: `Existem ${quantidade} movimentações vinculadas.` }],
      );
    }

    await this.repositorio.excluirLogicamente(id);
  }

  private async buscarContaOuFalhar(id: string, usuarioId: string): Promise<Conta> {
    const conta = await this.repositorio.buscarPorId(id, usuarioId);
    if (!conta) {
      throw new NaoEncontradoErro('Conta nao encontrada.');
    }
    return conta;
  }

  private async paraDTO(conta: Conta, usuario: UsuarioAutenticado): Promise<ContaDTO> {
    const quantidadeMovimentacoes = await this.repositorio.contarMovimentacoes(conta.id);
    return mapearConta(
      conta,
      usuario,
      this.repositorio.calcularSaldoAtual(conta),
      this.repositorio.calcularSaldoPrevisto(conta),
      quantidadeMovimentacoes,
    );
  }
}
