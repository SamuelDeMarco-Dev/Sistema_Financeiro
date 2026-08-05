import type { TipoCategoria } from '@prisma/client';

/** RN-10: categoria de RECEITA so em receita; de DESPESA so em despesa;
 * AMBOS aceita os dois. Exportado para M3 (issue #32) validar a
 * categoria de uma movimentacao antes de grava-la. */
export function validarCompatibilidadeCategoria(
  categoria: { tipo: TipoCategoria },
  tipoMovimentacao: 'RECEITA' | 'DESPESA',
): boolean {
  return categoria.tipo === 'AMBOS' || categoria.tipo === tipoMovimentacao;
}
