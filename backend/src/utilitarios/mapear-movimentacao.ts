import type { MovimentacaoCompleta } from '@/repositorios/movimentacao.repositorio';
import { paraDataIso } from './data';
import type { Prisma } from '@prisma/client';

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
  transferencia: null;
  recorrencia: null;
  parcelamento: null;
  quantidadeAnexos: number;
  criadoEm: Date;
  atualizadoEm: Date;
}

/** 04-API.md §12.1/§12.2: `transferencia`, `recorrencia` e `parcelamento`
 * sao sempre chaves presentes (null quando nao se aplicam) — o cliente
 * nao precisa checar existencia da propriedade. Esta issue (#34) so
 * produz receita/despesa simples; as issues #38/#39 preenchem
 * recorrencia/transferencia de verdade. */
export function mapearMovimentacao(movimentacao: MovimentacaoCompleta): MovimentacaoDTO {
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
    transferencia: null,
    recorrencia: null,
    parcelamento: null,
    quantidadeAnexos: movimentacao._count.anexos,
    criadoEm: movimentacao.criadoEm,
    atualizadoEm: movimentacao.atualizadoEm,
  };
}
