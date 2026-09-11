import { Prisma } from '@prisma/client';
import {
  ContaArquivadaErro,
  ContasIguaisErro,
  ErroInterno,
  NaoEncontradoErro,
  RegraNegocioErro,
} from '@/erros';
import { ContaCompartilhadaRepositorio } from '@/repositorios/conta-compartilhada.repositorio';
import { ContaRepositorio } from '@/repositorios/conta.repositorio';
import type { PernaTransferencia } from '@/repositorios/transferencia.repositorio';
import { TransferenciaRepositorio } from '@/repositorios/transferencia.repositorio';
import { AnexoServico } from '@/servicos/anexo.servico';
import { autorizarPapelNoGrupo } from '@/servicos/autorizacao-grupo.servico';
import { deDataIso, paraDataIso } from '@/utilitarios/data';
import { registrador } from '@/utilitarios/registrador';
import type { CriarTransferenciaDTO } from '@/validadores/transferencia.validador';
import type { Conta, SituacaoMovimentacao } from '@prisma/client';

export interface UsuarioAutenticado {
  id: string;
  nome: string;
}

type Escopo =
  { tipo: 'PESSOAL'; id: string; nome: string } | { tipo: 'GRUPO'; id: string; nome: string };

export interface TransferenciaDTO {
  transferenciaId: string;
  valor: string;
  data: string;
  descricao: string;
  situacao: SituacaoMovimentacao;
  saida: {
    movimentacaoId: string;
    conta: { id: string; nome: string; saldoAtual: string };
    escopo: Escopo;
  };
  entrada: {
    movimentacaoId: string;
    conta: { id: string; nome: string; saldoAtual: string };
    escopo: Escopo;
  };
}

export class TransferenciaServico {
  constructor(
    private readonly repositorio = new TransferenciaRepositorio(),
    private readonly contaRepositorio = new ContaRepositorio(),
    private readonly anexoServico = new AnexoServico(),
    private readonly contaCompartilhadaRepositorio = new ContaCompartilhadaRepositorio(),
  ) {}

  /** RN-24/RN-26: contas diferentes, nenhuma arquivada, par criado em
   * transacao. RF-37/RN-27 (issue #73): cada ponta pode ser pessoal OU uma
   * sub-conta de um grupo do qual o usuario e ADMINISTRADOR/PARTICIPANTE —
   * `buscarContaAutorizadaOuFalhar` decide isso olhando a PROPRIA conta,
   * nao um campo de escopo no corpo da requisicao. RN-32: as duas pontas
   * precisam operar na mesma moeda (nao ha conversao na v1.x). */
  async criar(
    usuario: UsuarioAutenticado,
    dados: CriarTransferenciaDTO,
  ): Promise<TransferenciaDTO> {
    if (dados.contaOrigemId === dados.contaDestinoId) {
      throw new ContasIguaisErro('A conta de origem deve ser diferente da conta de destino.', [
        { campo: 'contaDestinoId', mensagem: 'Escolha uma conta diferente da origem.' },
      ]);
    }

    const origem = await this.buscarContaAutorizadaOuFalhar(dados.contaOrigemId, usuario);
    const destino = await this.buscarContaAutorizadaOuFalhar(dados.contaDestinoId, usuario);
    this.garantirNaoArquivada(origem.conta);
    this.garantirNaoArquivada(destino.conta);

    if (origem.conta.moeda !== destino.conta.moeda) {
      throw new RegraNegocioErro('Não é possível transferir entre contas de moedas diferentes.', [
        {
          campo: 'contaDestinoId',
          mensagem: `Origem em ${origem.conta.moeda}, destino em ${destino.conta.moeda}.`,
        },
      ]);
    }

    const descricao = dados.descricao ?? `${this.rotulo(origem)} → ${this.rotulo(destino)}`;

    const transferenciaId = await this.repositorio.criar({
      usuarioId: usuario.id,
      contaOrigemId: origem.conta.id,
      contaDestinoId: destino.conta.id,
      valor: new Prisma.Decimal(dados.valor),
      data: deDataIso(dados.data),
      descricao,
      observacao: dados.observacao ?? null,
      efetivada: dados.efetivada,
    });

    this.registrarAuditoriaSeEnvolverGrupo(
      transferenciaId,
      usuario.id,
      origem.escopo,
      destino.escopo,
    );

    return this.montarDTO(transferenciaId, usuario.id);
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
    await this.anexoServico.excluirPorMovimentacoes(pernas.map((perna) => perna.id));
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
    if (!saida.conta || !entrada.conta) {
      // RN-09: toda movimentacao (transferencia inclusive) sempre tem
      // contaId — rede de seguranca, nao deveria disparar em uso normal.
      throw new ErroInterno('Perna de transferência sem conta associada.');
    }

    const [contaOrigem, contaDestino] = await Promise.all([
      this.contaRepositorio.buscarPorIdSemEscopo(saida.conta.id),
      this.contaRepositorio.buscarPorIdSemEscopo(entrada.conta.id),
    ]);
    if (!contaOrigem || !contaDestino) {
      throw new ErroInterno('Conta da transferência não encontrada.');
    }
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
        escopo: this.escopoDaPerna(saida),
      },
      entrada: {
        movimentacaoId: entrada.id,
        conta: {
          id: entrada.conta.id,
          nome: entrada.conta.nome,
          saldoAtual: saldoDestino.toFixed(2),
        },
        escopo: this.escopoDaPerna(entrada),
      },
    };
  }

  private escopoDaPerna(perna: PernaTransferencia): Escopo {
    if (!perna.conta) {
      throw new ErroInterno('Perna de transferência sem conta associada.');
    }
    if (perna.conta.contaCompartilhadaId !== null) {
      return {
        tipo: 'GRUPO',
        id: perna.conta.contaCompartilhadaId,
        nome: perna.conta.contaCompartilhada?.nome ?? '',
      };
    }
    // chk_conta_escopo garante usuarioId/usuario != null aqui.
    return {
      tipo: 'PESSOAL',
      id: perna.conta.usuarioId ?? '',
      nome: perna.conta.usuario?.nome ?? '',
    };
  }

  /** RN-51: 404 (nunca 403) para conta de outro usuario ou de um grupo do
   * qual o solicitante nao e membro. RF-37/checklist #73: a ponta de grupo
   * exige papel ADMINISTRADOR ou PARTICIPANTE — observador nunca move
   * dinheiro do grupo. */
  private async buscarContaAutorizadaOuFalhar(
    contaId: string,
    usuario: UsuarioAutenticado,
  ): Promise<{ conta: Conta; escopo: Escopo }> {
    const conta = await this.contaRepositorio.buscarPorIdSemEscopo(contaId);
    if (!conta) {
      throw new NaoEncontradoErro('Conta não encontrada.');
    }

    if (conta.usuarioId !== null) {
      if (conta.usuarioId !== usuario.id) {
        throw new NaoEncontradoErro('Conta não encontrada.');
      }
      return { conta, escopo: { tipo: 'PESSOAL', id: usuario.id, nome: usuario.nome } };
    }

    // chk_conta_escopo garante contaCompartilhadaId != null aqui.
    if (conta.contaCompartilhadaId === null) {
      throw new NaoEncontradoErro('Conta não encontrada.');
    }
    await autorizarPapelNoGrupo(conta.contaCompartilhadaId, usuario.id, [
      'ADMINISTRADOR',
      'PARTICIPANTE',
    ]);
    const nomeDoGrupo = await this.nomeDoGrupo(conta.contaCompartilhadaId);
    return { conta, escopo: { tipo: 'GRUPO', id: conta.contaCompartilhadaId, nome: nomeDoGrupo } };
  }

  private async nomeDoGrupo(contaCompartilhadaId: string): Promise<string> {
    const grupo = await this.contaCompartilhadaRepositorio.buscarPorId(contaCompartilhadaId);
    return grupo?.nome ?? '';
  }

  private rotulo({ conta, escopo }: { conta: Conta; escopo: Escopo }): string {
    return escopo.tipo === 'GRUPO' ? `${escopo.nome}/${conta.nome}` : conta.nome;
  }

  /** RF-82/M11: `LogAuditoria` dedicado ainda nao existe — por ora o
   * registro fica no log estruturado da aplicacao, mesmo raciocinio do
   * comentario de RN-15 em `MovimentacaoServico.atualizar`. */
  private registrarAuditoriaSeEnvolverGrupo(
    transferenciaId: string,
    usuarioId: string,
    escopoOrigem: Escopo,
    escopoDestino: Escopo,
  ): void {
    for (const escopo of [escopoOrigem, escopoDestino]) {
      if (escopo.tipo === 'GRUPO') {
        registrador.info(
          { transferenciaId, usuarioId, contaCompartilhadaId: escopo.id },
          'RN-27: transferencia envolvendo conta compartilhada.',
        );
      }
    }
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
