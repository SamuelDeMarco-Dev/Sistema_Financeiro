// Compartilhado entre MenuLateral (>= lg) e NavegacaoInferior (mobile) —
// uma unica lista, duas apresentacoes. Relatorios/etc. chegam conforme
// cada funcionalidade e implementada, uma issue por vez.
export interface ItemNavegacao {
  rotulo: string;
  para: string;
  /** NavLink sem `end` considera "/" um prefixo de toda rota — sem isto,
   * "Início" apareceria marcado como ativo em qualquer página. */
  fim?: boolean;
  /** Exibe o distintivo de convites pendentes recebidos (issue #74). Fica
   * aqui, e não numa condição por rótulo dentro de cada navegação, para
   * MenuLateral e NavegacaoInferior lerem a mesma decisão. */
  mostrarConvitesPendentes?: boolean;
}

export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  { rotulo: 'Início', para: '/', fim: true },
  { rotulo: 'Movimentações', para: '/movimentacoes' },
  { rotulo: 'Relatórios', para: '/relatorios' },
  { rotulo: 'Contas', para: '/contas' },
  { rotulo: 'Categorias', para: '/categorias' },
  { rotulo: 'Compartilhadas', para: '/compartilhadas', mostrarConvitesPendentes: true },
  { rotulo: 'Configurações', para: '/configuracoes' },
];
