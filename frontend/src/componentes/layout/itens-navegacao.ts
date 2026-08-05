// Compartilhado entre MenuLateral (>= lg) e NavegacaoInferior (mobile) —
// uma unica lista, duas apresentacoes. Dashboard/Movimentacoes/etc. chegam
// conforme cada funcionalidade e implementada, uma issue por vez.
export interface ItemNavegacao {
  rotulo: string;
  para: string;
}

export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  { rotulo: 'Contas', para: '/contas' },
  { rotulo: 'Categorias', para: '/categorias' },
  { rotulo: 'Configurações', para: '/configuracoes' },
];
