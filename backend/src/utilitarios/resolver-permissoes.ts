import type { PapelMembro } from '@prisma/client';

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

export interface ConfiguracaoGrupo {
  permiteParticipanteEditarProprias: boolean;
}

const PERMISSOES_ADMINISTRADOR: PermissoesGrupo = {
  podeEditar: true,
  podeExcluir: true,
  podeConvidar: true,
  podeGerenciarMembros: true,
  podeGerenciarCategorias: true,
  podeCriarMovimentacao: true,
  podeEditarMovimentacaoPropria: true,
  podeEditarMovimentacaoDeTerceiro: true,
  podeExcluirMovimentacaoPropria: true,
  podeExcluirMovimentacaoDeTerceiro: true,
  podeVerAuditoria: true,
};

const PERMISSOES_OBSERVADOR: PermissoesGrupo = {
  podeEditar: false,
  podeExcluir: false,
  podeConvidar: false,
  podeGerenciarMembros: false,
  podeGerenciarCategorias: false,
  podeCriarMovimentacao: false,
  podeEditarMovimentacaoPropria: false,
  podeEditarMovimentacaoDeTerceiro: false,
  podeExcluirMovimentacaoPropria: false,
  podeExcluirMovimentacaoDeTerceiro: false,
  podeVerAuditoria: false,
};

/** RN-30/RN-31: unica funcao que decide a matriz de permissoes de um
 * grupo — servico (#67) e middleware de autorizacao (#68) consomem esta
 * mesma decisao, nunca reimplementam a matriz em outro lugar. Visualizar
 * movimentacoes/historico nao entra aqui: e permitido a qualquer membro
 * ativo, ou seja, a todo chamador que chega a ter um `PapelMembro` para
 * resolver. */
export function resolverPermissoes(
  papel: PapelMembro,
  configuracaoGrupo: ConfiguracaoGrupo,
): PermissoesGrupo {
  if (papel === 'ADMINISTRADOR') return PERMISSOES_ADMINISTRADOR;
  if (papel === 'OBSERVADOR') return PERMISSOES_OBSERVADOR;

  // PARTICIPANTE: RN-31 configura editar/excluir a propria movimentacao;
  // o resto da matriz e fixo (nunca gerencia grupo, categorias ou membros).
  return {
    ...PERMISSOES_OBSERVADOR,
    podeCriarMovimentacao: true,
    podeEditarMovimentacaoPropria: configuracaoGrupo.permiteParticipanteEditarProprias,
    podeExcluirMovimentacaoPropria: configuracaoGrupo.permiteParticipanteEditarProprias,
  };
}

/** RN-30/RN-31 aplicadas a UMA movimentacao especifica: dispensa quem
 * chama de decidir "propria vs. de terceiro" na mao — so informa quem e o
 * autor da movimentacao e quem esta pedindo. Autorizacao de edicao e
 * exclusao seguem a mesma regra (RN-31 nao distingue as duas acoes), por
 * isso uma unica funcao cobre ambas (issue #68, consumida pelas rotas de
 * movimentacao de grupo quando a issue #72 as habilitar). */
export function autorizarEdicaoOuExclusaoMovimentacao(
  papel: PapelMembro,
  configuracaoGrupo: ConfiguracaoGrupo,
  autorDaMovimentacaoId: string,
  solicitanteId: string,
): boolean {
  const permissoes = resolverPermissoes(papel, configuracaoGrupo);
  const ehPropria = autorDaMovimentacaoId === solicitanteId;
  return ehPropria
    ? permissoes.podeEditarMovimentacaoPropria
    : permissoes.podeEditarMovimentacaoDeTerceiro;
}
