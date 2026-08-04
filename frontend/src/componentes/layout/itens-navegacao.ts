// Compartilhado entre MenuLateral (>= lg) e NavegacaoInferior (mobile) —
// uma unica lista, duas apresentacoes. So "Configuracoes" existe nesta
// milestone; Dashboard/Movimentacoes/etc. chegam a partir de M2, uma
// issue por vez.
export interface ItemNavegacao {
  rotulo: string;
  para: string;
}

export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  { rotulo: 'Configurações', para: '/configuracoes' },
];
