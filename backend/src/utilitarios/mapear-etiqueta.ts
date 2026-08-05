import type { Etiqueta } from '@prisma/client';

export interface EtiquetaDTO {
  id: string;
  nome: string;
  cor: string;
  quantidadeMovimentacoes: number;
}

export function mapearEtiqueta(etiqueta: Etiqueta, quantidadeMovimentacoes: number): EtiquetaDTO {
  return {
    id: etiqueta.id,
    nome: etiqueta.nome,
    cor: etiqueta.cor,
    quantidadeMovimentacoes,
  };
}
