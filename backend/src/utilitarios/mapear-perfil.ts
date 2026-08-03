import type { Perfil, Usuario } from '@prisma/client';

export interface PerfilCompleto {
  id: string;
  nome: string;
  email: string;
  emailVerificado: boolean;
  fotoUrl: string | null;
  moedaPadrao: string;
  idioma: string;
  tema: Perfil['tema'];
  timezone: string;
  formatoData: string;
  primeiroDiaSemana: number;
  notificacoesApp: boolean;
  notificacoesEmail: boolean;
  criadoEm: Date;
}

/** 04-API.md §8.1: `GET/PATCH /perfil` devolvem um recorte que mistura
 * Usuario (identidade) e Perfil (preferencias) — nao existe essa entidade
 * combinada no banco, so na resposta. */
export function mapearPerfilCompleto(usuario: Usuario, perfil: Perfil): PerfilCompleto {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    emailVerificado: usuario.emailVerificadoEm !== null,
    fotoUrl: perfil.fotoUrl,
    moedaPadrao: perfil.moedaPadrao,
    idioma: perfil.idioma,
    tema: perfil.tema,
    timezone: perfil.timezone,
    formatoData: perfil.formatoData,
    primeiroDiaSemana: perfil.primeiroDiaSemana,
    notificacoesApp: perfil.notificacoesApp,
    notificacoesEmail: perfil.notificacoesEmail,
    criadoEm: usuario.criadoEm,
  };
}
