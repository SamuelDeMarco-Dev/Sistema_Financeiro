export const PAPEIS_MEMBRO = ['ADMINISTRADOR', 'PARTICIPANTE', 'OBSERVADOR'] as const;

export type PapelMembro = (typeof PAPEIS_MEMBRO)[number];

export const ROTULO_PAPEL: Record<PapelMembro, string> = {
  ADMINISTRADOR: 'Administrador',
  PARTICIPANTE: 'Participante',
  OBSERVADOR: 'Observador',
};

/** Texto exibido ao convidar e ao explicar o que cada papel pode fazer —
 * derivado da matriz RN-30, nunca uma segunda fonte de verdade sobre ela:
 * a decisao real vem de `minhasPermissoes`, resolvida no servidor. */
export const DESCRICAO_PAPEL: Record<PapelMembro, string> = {
  ADMINISTRADOR: 'Administra o grupo, convida e remove membros e edita tudo.',
  PARTICIPANTE: 'Registra movimentações e contas do grupo.',
  OBSERVADOR: 'Apenas visualiza; não registra nem edita nada.',
};

export type SituacaoMembro = 'ATIVO' | 'REMOVIDO' | 'SAIU';

/** 04-API.md §16.3: matriz RN-30/RN-31 ja resolvida pelo servidor para o
 * solicitante. O frontend le esta decisao; reimplementar a matriz no
 * cliente seria uma segunda fonte de verdade — e nao seria seguranca. */
export interface PermissoesGrupo {
  podeEditar: boolean;
  podeExcluir: boolean;
  podeConvidar: boolean;
  podeGerenciarMembros: boolean;
  podeGerenciarCategorias: boolean;
  podeCriarMovimentacao: boolean;
  podeEditarMovimentacaoPropria: boolean;
  podeEditarMovimentacaoDeTerceiro: boolean;
  podeExcluirMovimentacaoPropria: boolean;
  podeExcluirMovimentacaoDeTerceiro: boolean;
  podeVerAuditoria: boolean;
}

export interface ResumoMes {
  receitas: string;
  despesas: string;
  resultado: string;
}

export interface ContaCompartilhadaListaItem {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  moeda: string;
  cor: string;
  permiteParticipanteEditarProprias: boolean;
  meuPapel: PapelMembro;
  saldoTotal: string;
  quantidadeMembros: number;
  quantidadeContas: number;
  resumoMesAtual: ResumoMes;
  criadoEm: string;
}

export interface MembroDoGrupo {
  id: string;
  papel: PapelMembro;
  situacao: SituacaoMembro;
  entrouEm: string;
  usuario: { id: string; nome: string; email: string; fotoUrl: string | null };
}

export interface ContaDoGrupo {
  id: string;
  nome: string;
  tipo: string;
  saldoAtual: string;
  cor: string;
  icone: string;
}

export interface ContaCompartilhadaDetalhe {
  id: string;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  moeda: string;
  cor: string;
  permiteParticipanteEditarProprias: boolean;
  meuPapel: PapelMembro;
  minhasPermissoes: PermissoesGrupo;
  saldoTotal: string;
  membros: MembroDoGrupo[];
  contas: ContaDoGrupo[];
  criadoEm: string;
}
