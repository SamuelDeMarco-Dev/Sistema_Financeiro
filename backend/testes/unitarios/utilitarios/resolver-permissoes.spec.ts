import { describe, expect, it } from 'vitest';
import { resolverPermissoes } from '@/utilitarios/resolver-permissoes';
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
