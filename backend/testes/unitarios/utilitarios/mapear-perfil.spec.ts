import { describe, expect, it } from 'vitest';
import { mapearPerfilCompleto } from '@/utilitarios/mapear-perfil';
import type { Perfil, Usuario } from '@prisma/client';

function fabricarUsuario(sobrescritas: Partial<Usuario> = {}): Usuario {
  return {
    id: 'usuario-1',
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    senhaHash: 'hash-fake',
    emailVerificadoEm: new Date(),
    tokenVerificacao: null,
    tokenVerificacaoExpiraEm: null,
    tokenRecuperacao: null,
    tokenRecuperacaoExpiraEm: null,
    tentativasLogin: 0,
    bloqueadoAte: null,
    ultimoLoginEm: null,
    criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    atualizadoEm: new Date(),
    excluidoEm: null,
    anonimizadoEm: null,
    ...sobrescritas,
  };
}

function fabricarPerfil(sobrescritas: Partial<Perfil> = {}): Perfil {
  return {
    id: 'perfil-1',
    usuarioId: 'usuario-1',
    fotoUrl: null,
    moedaPadrao: 'BRL',
    idioma: 'pt-BR',
    tema: 'SISTEMA',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...sobrescritas,
  };
}

describe('mapearPerfilCompleto', () => {
  it('combina identidade (Usuario) e preferencias (Perfil) num unico objeto', () => {
    const resultado = mapearPerfilCompleto(fabricarUsuario(), fabricarPerfil());

    expect(resultado).toEqual({
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      emailVerificado: true,
      fotoUrl: null,
      moedaPadrao: 'BRL',
      idioma: 'pt-BR',
      tema: 'SISTEMA',
      timezone: 'America/Sao_Paulo',
      formatoData: 'dd/MM/yyyy',
      primeiroDiaSemana: 0,
      notificacoesApp: true,
      notificacoesEmail: true,
      criadoEm: new Date('2026-01-01T00:00:00.000Z'),
    });
  });

  it('emailVerificado e false quando emailVerificadoEm e null', () => {
    const resultado = mapearPerfilCompleto(
      fabricarUsuario({ emailVerificadoEm: null }),
      fabricarPerfil(),
    );

    expect(resultado.emailVerificado).toBe(false);
  });

  it('nunca inclui senhaHash nem tokens', () => {
    const resultado = mapearPerfilCompleto(fabricarUsuario(), fabricarPerfil());

    expect(resultado).not.toHaveProperty('senhaHash');
    expect(resultado).not.toHaveProperty('tokenVerificacao');
    expect(resultado).not.toHaveProperty('tokenRecuperacao');
  });
});
