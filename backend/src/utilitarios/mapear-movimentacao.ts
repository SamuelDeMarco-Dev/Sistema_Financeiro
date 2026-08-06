import type {
  ContraparteTransferencia,
  MovimentacaoCompleta,
} from '@/repositorios/movimentacao.repositorio';
import { calcularOrdinalOcorrencia, paraDataIso } from './data';
import { mapearAnexo } from './mapear-anexo';
import type { AnexoDTO } from './mapear-anexo';
import type { FrequenciaRecorrencia, Prisma, SentidoTransferencia } from '@prisma/client';

export interface MovimentacaoDTO {
  id: string;
  tipo: MovimentacaoCompleta['tipo'];
  descricao: string;
  observacao: string | null;
  valor: Prisma.Decimal;
  valorPago: Prisma.Decimal;
  situacao: MovimentacaoCompleta['situacao'];
  dataCompetencia: string;
  dataVencimento: string | null;
  dataEfetivacao: string | null;
  conta: { id: string; nome: string; cor: string; icone: string } | null;
  contaCompartilhada: null;
  categoria: {
    id: string;
    nome: string;
    cor: string;
    icone: string;
    categoriaPaiId: string | null;
  } | null;
  cartao: null;
  fatura: null;
  etiquetas: { id: string; nome: string; cor: string }[];
  autor: { id: string; nome: string; fotoUrl: string | null };
  transferencia: {
    transferenciaId: string;
    sentido: SentidoTransferencia;
    contraparte: ContraparteTransferencia;
  } | null;
  recorrencia: {
    modeloId: string;
    frequencia: FrequenciaRecorrencia;
    intervalo: number;
    fimEm: string | null;
    ocorrenciaAtual: number;
  } | null;
  parcelamento: null;
  anexos: AnexoDTO[];
  quantidadeAnexos: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

/** 04-API.md §12.1/§12.2: `transferencia`, `recorrencia` e `parcelamento`
 * sao sempre chaves presentes (null quando nao se aplicam) — o cliente
 * nao precisa checar existencia da propriedade. `contraparte` vem de fora
 * (MovimentacaoRepositorio.buscarContrapartes) porque a outra perna da
 * transferencia nao e uma relacao do Prisma — so uma correlacao por
 * `transferenciaId` — e buscar isso por item aqui dentro geraria N+1. */
export function mapearMovimentacao(
  movimentacao: MovimentacaoCompleta,
  contraparte?: ContraparteTransferencia,
): MovimentacaoDTO {
  const transferencia =
    movimentacao.tipo === 'TRANSFERENCIA' &&
    movimentacao.transferenciaId !== null &&
    movimentacao.sentido !== null &&
    contraparte
      ? {
          transferenciaId: movimentacao.transferenciaId,
          sentido: movimentacao.sentido,
          contraparte,
        }
      : null;

  const modelo = movimentacao.modeloRecorrencia;
  const recorrencia =
    modelo !== null && modelo.frequencia !== null
      ? {
          modeloId: modelo.id,
          frequencia: modelo.frequencia,
          intervalo: modelo.intervaloRecorrencia ?? 1,
          fimEm: modelo.recorrenciaFimEm ? paraDataIso(modelo.recorrenciaFimEm) : null,
          ocorrenciaAtual: calcularOrdinalOcorrencia(
            modelo.dataCompetencia,
            movimentacao.dataCompetencia,
            modelo.frequencia,
            modelo.intervaloRecorrencia ?? 1,
          ),
        }
      : null;

  return {
    id: movimentacao.id,
    tipo: movimentacao.tipo,
    descricao: movimentacao.descricao,
    observacao: movimentacao.observacao,
    valor: movimentacao.valor,
    valorPago: movimentacao.valorPago,
    situacao: movimentacao.situacao,
    dataCompetencia: paraDataIso(movimentacao.dataCompetencia),
    dataVencimento: movimentacao.dataVencimento ? paraDataIso(movimentacao.dataVencimento) : null,
    dataEfetivacao: movimentacao.dataEfetivacao ? paraDataIso(movimentacao.dataEfetivacao) : null,
    conta: movimentacao.conta,
    contaCompartilhada: null,
    categoria: movimentacao.categoria,
    cartao: null,
    fatura: null,
    etiquetas: movimentacao.etiquetas.map((vinculo) => vinculo.etiqueta),
    autor: {
      id: movimentacao.usuario.id,
      nome: movimentacao.usuario.nome,
      fotoUrl: movimentacao.usuario.perfil?.fotoUrl ?? null,
    },
    transferencia,
    recorrencia,
    parcelamento: null,
    anexos: movimentacao.anexos.map(mapearAnexo),
    quantidadeAnexos: movimentacao._count.anexos,
    criadoEm: movimentacao.criadoEm,
    atualizadoEm: movimentacao.atualizadoEm,
  };
}
