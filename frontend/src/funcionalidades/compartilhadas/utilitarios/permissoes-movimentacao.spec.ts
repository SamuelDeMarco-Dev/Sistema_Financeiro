import { describe, expect, it } from 'vitest';
import { resolverAcoesMovimentacao } from './permissoes-movimentacao';
import type { PermissoesGrupo } from '../tipos/conta-compartilhada';

/** As três linhas da matriz RN-30 que importam para uma linha da lista,
 * como o servidor as devolve em `minhasPermissoes` (04-API.md §16.3). */
const ADMINISTRADOR: PermissoesGrupo = {
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

const PARTICIPANTE_PODE_EDITAR_PROPRIAS: PermissoesGrupo = {
  ...ADMINISTRADOR,
  podeEditar: false,
  podeExcluir: false,
  podeConvidar: false,
  podeGerenciarMembros: false,
  podeGerenciarCategorias: false,
  podeEditarMovimentacaoDeTerceiro: false,
  podeExcluirMovimentacaoDeTerceiro: false,
  podeVerAuditoria: false,
};

const PARTICIPANTE_SEM_EDITAR_PROPRIAS: PermissoesGrupo = {
  ...PARTICIPANTE_PODE_EDITAR_PROPRIAS,
  podeEditarMovimentacaoPropria: false,
  podeExcluirMovimentacaoPropria: false,
};

const OBSERVADOR: PermissoesGrupo = {
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

const EU = 'usuario-1';
const OUTRO = 'usuario-2';

describe('resolverAcoesMovimentacao', () => {
  it('administrador age em lançamento próprio e de terceiro', () => {
    expect(
      resolverAcoesMovimentacao({ permissoes: ADMINISTRADOR, autorId: EU, usuarioId: EU }),
    ).toEqual({ podeEditar: true, podeExcluir: true, podeDuplicar: true });
    expect(
      resolverAcoesMovimentacao({ permissoes: ADMINISTRADOR, autorId: OUTRO, usuarioId: EU }),
    ).toEqual({ podeEditar: true, podeExcluir: true, podeDuplicar: true });
  });

  it('participante age apenas nos próprios lançamentos (RN-31)', () => {
    expect(
      resolverAcoesMovimentacao({
        permissoes: PARTICIPANTE_PODE_EDITAR_PROPRIAS,
        autorId: EU,
        usuarioId: EU,
      }),
    ).toMatchObject({ podeEditar: true, podeExcluir: true });

    expect(
      resolverAcoesMovimentacao({
        permissoes: PARTICIPANTE_PODE_EDITAR_PROPRIAS,
        autorId: OUTRO,
        usuarioId: EU,
      }),
    ).toMatchObject({ podeEditar: false, podeExcluir: false });
  });

  it('participante em grupo que desliga a edição própria não age nem no que lançou', () => {
    expect(
      resolverAcoesMovimentacao({
        permissoes: PARTICIPANTE_SEM_EDITAR_PROPRIAS,
        autorId: EU,
        usuarioId: EU,
      }),
    ).toMatchObject({ podeEditar: false, podeExcluir: false });
  });

  it('participante pode duplicar o próprio lançamento', () => {
    expect(
      resolverAcoesMovimentacao({
        permissoes: PARTICIPANTE_PODE_EDITAR_PROPRIAS,
        autorId: EU,
        usuarioId: EU,
      }).podeDuplicar,
    ).toBe(true);
  });

  // O servidor aceitaria (duplicar é criar), mas nenhuma ação deve aparecer
  // numa linha que o participante não administra — critério de aceite da #75.
  it('participante não recebe nem duplicar em lançamento de terceiro', () => {
    expect(
      resolverAcoesMovimentacao({
        permissoes: PARTICIPANTE_PODE_EDITAR_PROPRIAS,
        autorId: OUTRO,
        usuarioId: EU,
      }),
    ).toEqual({ podeEditar: false, podeExcluir: false, podeDuplicar: false });
  });

  it('observador não tem nenhuma ação, nem no que lançou antes de ser rebaixado', () => {
    expect(
      resolverAcoesMovimentacao({ permissoes: OBSERVADOR, autorId: EU, usuarioId: EU }),
    ).toEqual({ podeEditar: false, podeExcluir: false, podeDuplicar: false });
    expect(
      resolverAcoesMovimentacao({ permissoes: OBSERVADOR, autorId: OUTRO, usuarioId: EU }),
    ).toEqual({ podeEditar: false, podeExcluir: false, podeDuplicar: false });
  });

  it('sem sessão carregada, trata como lançamento de terceiro (lado restritivo)', () => {
    expect(
      resolverAcoesMovimentacao({
        permissoes: PARTICIPANTE_PODE_EDITAR_PROPRIAS,
        autorId: EU,
        usuarioId: undefined,
      }),
    ).toMatchObject({ podeEditar: false, podeExcluir: false });
  });
});
