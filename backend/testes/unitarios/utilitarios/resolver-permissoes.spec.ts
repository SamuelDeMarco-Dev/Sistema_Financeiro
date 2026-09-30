import { describe, expect, it } from 'vitest';
import {
  autorizarEdicaoOuExclusaoMovimentacao,
  resolverPermissoes,
} from '@/utilitarios/resolver-permissoes';
import type { PermissoesGrupo } from '@/utilitarios/resolver-permissoes';
import type { PapelMembro } from '@prisma/client';

const CAMPOS_SEMPRE_ADMIN_ONLY: (keyof PermissoesGrupo)[] = [
  'podeEditar',
  'podeExcluir',
  'podeConvidar',
  'podeGerenciarMembros',
  'podeGerenciarCategorias',
  'podeEditarMovimentacaoDeTerceiro',
  'podeExcluirMovimentacaoDeTerceiro',
  'podeVerAuditoria',
];

describe('resolverPermissoes (RN-30, RN-31)', () => {
  it('ADMINISTRADOR: todas as permissoes da matriz sao verdadeiras', () => {
    const permissoes = resolverPermissoes('ADMINISTRADOR', {
      permiteParticipanteEditarProprias: false,
    });

    expect(Object.values(permissoes).every((valor) => valor === true)).toBe(true);
  });

  it('OBSERVADOR: todas as permissoes da matriz sao falsas', () => {
    const permissoes = resolverPermissoes('OBSERVADOR', {
      permiteParticipanteEditarProprias: true,
    });

    expect(Object.values(permissoes).every((valor) => valor === false)).toBe(true);
  });

  it.each(CAMPOS_SEMPRE_ADMIN_ONLY)(
    'PARTICIPANTE: %s e falso independente de permiteParticipanteEditarProprias',
    (campo) => {
      const comPermissao = resolverPermissoes('PARTICIPANTE', {
        permiteParticipanteEditarProprias: true,
      });
      const semPermissao = resolverPermissoes('PARTICIPANTE', {
        permiteParticipanteEditarProprias: false,
      });

      expect(comPermissao[campo]).toBe(false);
      expect(semPermissao[campo]).toBe(false);
    },
  );

  it('PARTICIPANTE: pode sempre criar movimentacao, independente da configuracao do grupo', () => {
    const permissoes = resolverPermissoes('PARTICIPANTE', {
      permiteParticipanteEditarProprias: false,
    });
    expect(permissoes.podeCriarMovimentacao).toBe(true);
  });

  it('RN-31: permiteParticipanteEditarProprias=true libera editar/excluir a propria movimentacao', () => {
    const permissoes = resolverPermissoes('PARTICIPANTE', {
      permiteParticipanteEditarProprias: true,
    });
    expect(permissoes.podeEditarMovimentacaoPropria).toBe(true);
    expect(permissoes.podeExcluirMovimentacaoPropria).toBe(true);
  });

  it('RN-31: permiteParticipanteEditarProprias=false bloqueia editar/excluir a propria movimentacao', () => {
    const permissoes = resolverPermissoes('PARTICIPANTE', {
      permiteParticipanteEditarProprias: false,
    });
    expect(permissoes.podeEditarMovimentacaoPropria).toBe(false);
    expect(permissoes.podeExcluirMovimentacaoPropria).toBe(false);
  });

  it('a configuracao do grupo nao afeta ADMINISTRADOR nem OBSERVADOR (so PARTICIPANTE)', () => {
    const papeis: PapelMembro[] = ['ADMINISTRADOR', 'OBSERVADOR'];
    for (const papel of papeis) {
      const comPermissao = resolverPermissoes(papel, { permiteParticipanteEditarProprias: true });
      const semPermissao = resolverPermissoes(papel, { permiteParticipanteEditarProprias: false });
      expect(comPermissao).toEqual(semPermissao);
    }
  });
});

describe('autorizarEdicaoOuExclusaoMovimentacao (RN-30, RN-31 — issue #68)', () => {
  it('ADMINISTRADOR pode editar/excluir movimentacao de terceiro', () => {
    const permitido = autorizarEdicaoOuExclusaoMovimentacao(
      'ADMINISTRADOR',
      { permiteParticipanteEditarProprias: false },
      'autor-1',
      'solicitante-2',
    );
    expect(permitido).toBe(true);
  });

  it('ADMINISTRADOR pode editar/excluir a propria movimentacao', () => {
    const permitido = autorizarEdicaoOuExclusaoMovimentacao(
      'ADMINISTRADOR',
      { permiteParticipanteEditarProprias: false },
      'autor-1',
      'autor-1',
    );
    expect(permitido).toBe(true);
  });

  it('OBSERVADOR nunca pode editar/excluir, propria ou de terceiro', () => {
    expect(
      autorizarEdicaoOuExclusaoMovimentacao(
        'OBSERVADOR',
        { permiteParticipanteEditarProprias: true },
        'autor-1',
        'autor-1',
      ),
    ).toBe(false);
    expect(
      autorizarEdicaoOuExclusaoMovimentacao(
        'OBSERVADOR',
        { permiteParticipanteEditarProprias: true },
        'autor-1',
        'solicitante-2',
      ),
    ).toBe(false);
  });

  it('PARTICIPANTE nunca pode editar/excluir movimentacao de terceiro, mesmo com permiteParticipanteEditarProprias', () => {
    const permitido = autorizarEdicaoOuExclusaoMovimentacao(
      'PARTICIPANTE',
      { permiteParticipanteEditarProprias: true },
      'autor-1',
      'solicitante-2',
    );
    expect(permitido).toBe(false);
  });

  it('PARTICIPANTE pode editar/excluir a propria movimentacao quando permiteParticipanteEditarProprias=true', () => {
    const permitido = autorizarEdicaoOuExclusaoMovimentacao(
      'PARTICIPANTE',
      { permiteParticipanteEditarProprias: true },
      'autor-1',
      'autor-1',
    );
    expect(permitido).toBe(true);
  });

  it('PARTICIPANTE nao pode editar/excluir nem a propria movimentacao quando permiteParticipanteEditarProprias=false', () => {
    const permitido = autorizarEdicaoOuExclusaoMovimentacao(
      'PARTICIPANTE',
      { permiteParticipanteEditarProprias: false },
      'autor-1',
      'autor-1',
    );
    expect(permitido).toBe(false);
  });
});
