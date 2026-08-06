import { Prisma } from '@prisma/client';
import { ContaArquivadaErro, ContasIguaisErro, ErroInterno, NaoEncontradoErro } from '@/erros';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import { TransferenciaRepositorio } from '@/repositorios/transferencia.repositorio';
import { deDataIso, paraDataIso } from '@/utilitarios/data';
import type { CriarTransferenciaDTO } from '@/validadores/transferencia.validador';
import type { Conta, SituacaoMovimentacao } from '@prisma/client';

export interface TransferenciaDTO {
  transferenciaId: string;
  valor: string;
  data: string;
  descricao: string;
  situacao: SituacaoMovimentacao;
  saida: { movimentacaoId: string; conta: { id: string; nome: string; saldoAtual: string } };
  entrada: { movimentacaoId: string; conta: { id: string; nome: string; saldoAtual: string } };
}

export class TransferenciaServico {
  constructor(
    private readonly repositorio = new TransferenciaRepositorio(),
    private readonly contaRepositorio = new ContaRepositorio(),
  ) {}

  /** RN-24/RN-26: contas diferentes, ambas do usuario e nenhuma arquivada,
   * par criado em transacao. RN-27 (conta compartilhada) e moot em M3 —
   * ContaRepositorio.buscarPorId so conhece contas pessoais, uma conta de
   * grupo simplesmente nao existiria ainda e responderia 404. */
  async criar(usuarioId: string, dados: CriarTransferenciaDTO): Promise<TransferenciaDTO> {
    if (dados.contaOrigemId === dados.contaDestinoId) {
      throw new ContasIguaisErro('A conta de origem deve ser diferente da conta de destino.', [
        { campo: 'contaDestinoId', mensagem: 'Escolha uma conta diferente da origem.' },
      ]);
    }

    const contaOrigem = await this.buscarContaOuFalhar(dados.contaOrigemId, usuarioId);
    const contaDestino = await this.buscarContaOuFalhar(dados.contaDestinoId, usuarioId);
    this.garantirNaoArquivada(contaOrigem);
    this.garantirNaoArquivada(contaDestino);

    const descricao = dados.descricao ?? `${contaOrigem.nome} → ${contaDestino.nome}`;

    const transferenciaId = await this.repositorio.criar({
      usuarioId,
      contaOrigemId: contaOrigem.id,
      contaDestinoId: contaDestino.id,
      valor: new Prisma.Decimal(dados.valor),
      data: deDataIso(dados.data),
      descricao,
      observacao: dados.observacao ?? null,
      efetivada: dados.efetivada,
    });

    return this.montarDTO(transferenciaId, usuarioId);
  }

  async buscarPorId(transferenciaId: string, usuarioId: string): Promise<TransferenciaDTO> {
    return this.montarDTO(transferenciaId, usuarioId);
  }

  /** RN-26/RN-39: exclui os dois lados atomicamente — a mesma operacao que
   * `MovimentacaoServico.excluir` delega a este metodo quando `id` e um
   * dos lados de uma transferencia. */
  async excluir(transferenciaId: string, usuarioId: string): Promise<void> {
    const pernas = await this.repositorio.buscarPorTransferenciaId(transferenciaId, usuarioId);
    if (pernas.length === 0) {
      throw new NaoEncontradoErro('Transferência não encontrada.');
    }
    await this.repositorio.excluirPorTransferenciaId(transferenciaId);
  }

  private async montarDTO(transferenciaId: string, usuarioId: string): Promise<TransferenciaDTO> {
    const pernas = await this.repositorio.buscarPorTransferenciaId(transferenciaId, usuarioId);
    if (pernas.length === 0) {
      throw new NaoEncontradoErro('Transferência não encontrada.');
    }
    const saida = pernas.find((perna) => perna.sentido === 'SAIDA');
    const entrada = pernas.find((perna) => perna.sentido === 'ENTRADA');
    if (!saida || !entrada) {
      // RN-26 garante que as duas pernas nascem e morrem juntas — so
      // chegaria aqui por uma corrupcao de dados fora do controle da API.
      throw new ErroInterno('Transferência com par incompleto.');
    }
    if (saida.contaId === null || entrada.contaId === null || !saida.conta || !entrada.conta) {
      // RN-09: toda movimentacao (transferencia inclusive) tem contaId —
      // contaCompartilhadaId so chega em M6. Rede de seguranca, nao deveria
      // disparar em uso normal da API.
      throw new ErroInterno('Perna de transferência sem conta associada.');
    }

    const [contaOrigem, contaDestino] = await Promise.all([
      this.buscarContaOuFalhar(saida.contaId, usuarioId),
      this.buscarContaOuFalhar(entrada.contaId, usuarioId),
    ]);
    const [saldoOrigem, saldoDestino] = await Promise.all([
      this.contaRepositorio.calcularSaldoAtual(contaOrigem),
      this.contaRepositorio.calcularSaldoAtual(contaDestino),
    ]);

    return {
      transferenciaId,
      valor: saida.valor.toFixed(2),
      data: paraDataIso(saida.dataCompetencia),
      descricao: saida.descricao,
      situacao: saida.situacao,
      saida: {
        movimentacaoId: saida.id,
        conta: { id: saida.conta.id, nome: saida.conta.nome, saldoAtual: saldoOrigem.toFixed(2) },
      },
      entrada: {
        movimentacaoId: entrada.id,
        conta: {
          id: entrada.conta.id,
          nome: entrada.conta.nome,
          saldoAtual: saldoDestino.toFixed(2),
        },
      },
    };
  }

  /** RN-51: 404 (nunca 403) para conta de outro usuario. */
  private async buscarContaOuFalhar(contaId: string, usuarioId: string): Promise<Conta> {
    const conta = await this.contaRepositorio.buscarPorId(contaId, usuarioId);
    if (!conta) {
      throw new NaoEncontradoErro('Conta não encontrada.');
    }
    return conta;
  }

  private garantirNaoArquivada(conta: Conta): void {
    if (conta.arquivadaEm !== null) {
      throw new ContaArquivadaErro(
        'Esta conta esta arquivada e nao pode participar de uma transferencia.',
        [{ campo: 'contaId', mensagem: 'Desarquive a conta antes de transferir.' }],
      );
    }
  }
}
