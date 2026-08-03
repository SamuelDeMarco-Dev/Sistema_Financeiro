import { describe, expect, it } from 'vitest';
import type { PerfilCompleto } from '@/tipos/perfil';
import { mapearPerfilParaUsuario } from './mapear-usuario';

function fabricarPerfil(sobrescritas: Partial<PerfilCompleto> = {}): PerfilCompleto {
  return {
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
    criadoEm: '2026-01-01T00:00:00.000Z',
    ...sobrescritas,
  };
}

describe('mapearPerfilParaUsuario', () => {
  it('reduz PerfilCompleto para a forma enxuta de Usuario', () => {
    const resultado = mapearPerfilParaUsuario(fabricarPerfil());

    expect(resultado).toEqual({
      id: 'usuario-1',
      nome: 'Samuel De Marco',
      email: 'samuel@exemplo.com',
      perfil: {
        fotoUrl: null,
        moedaPadrao: 'BRL',
        idioma: 'pt-BR',
        tema: 'SISTEMA',
        timezone: 'America/Sao_Paulo',
      },
    });
  });

  it('nao inclui campos exclusivos de PerfilCompleto (emailVerificado, formatoData, ...)', () => {
    const resultado = mapearPerfilParaUsuario(fabricarPerfil());

    expect(resultado).not.toHaveProperty('emailVerificado');
    expect(resultado).not.toHaveProperty('formatoData');
    expect(resultado).not.toHaveProperty('notificacoesApp');
  });
});
