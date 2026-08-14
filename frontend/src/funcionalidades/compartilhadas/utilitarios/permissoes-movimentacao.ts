import type { PermissoesGrupo } from '../tipos/conta-compartilhada';

export interface AcoesPermitidasMovimentacao {
  podeEditar: boolean;
  podeExcluir: boolean;
  podeDuplicar: boolean;
}

interface Contexto {
  /** Matriz RN-30/RN-31 já resolvida pelo servidor (04-API.md §16.3). */
  permissoes: PermissoesGrupo;
  /** Autor da movimentação da linha. */
  autorId: string;
  /** Usuário autenticado. `undefined` enquanto a sessão não carregou. */
  usuarioId: string | undefined;
}

/**
 * Escolhe qual coluna da matriz vale para uma linha: a de lançamento
 * próprio ou a de terceiro. Não decide permissão — o servidor já decidiu
 * as duas colunas; aqui só se aplica a que corresponde ao autor da linha
 * (é o que permite ao PARTICIPANTE ver ações apenas nos próprios
 * lançamentos, conforme RN-31).
 *
 * Sem `usuarioId` (sessão ainda carregando), assume-se lançamento de
 * terceiro: errar para o lado restritivo esconde um botão por um instante,
 * enquanto errar para o outro ofereceria uma ação que o servidor recusaria.
 */
export function resolverAcoesMovimentacao({
  permissoes,
  autorId,
  usuarioId,
}: Contexto): AcoesPermitidasMovimentacao {
  const ehPropria = usuarioId !== undefined && autorId === usuarioId;

  return {
    podeEditar: ehPropria
      ? permissoes.podeEditarMovimentacaoPropria
      : permissoes.podeEditarMovimentacaoDeTerceiro,
    podeExcluir: ehPropria
      ? permissoes.podeExcluirMovimentacaoPropria
      : permissoes.podeExcluirMovimentacaoDeTerceiro,
    // Duplicar cria uma movimentação nova, então exige `podeCriarMovimentacao`
    // — mas só é oferecida em linha sobre a qual o papel já age. O servidor
    // aceitaria duplicar o lançamento de outro membro (é uma criação), e
    // ainda assim o PARTICIPANTE não deve ver ação nenhuma numa linha que
    // não é dele: um menu com um único item numa linha "só leitura" passaria
    // a impressão errada de que ele administra o lançamento alheio.
    podeDuplicar:
      permissoes.podeCriarMovimentacao &&
      (ehPropria || permissoes.podeEditarMovimentacaoDeTerceiro),
  };
}
