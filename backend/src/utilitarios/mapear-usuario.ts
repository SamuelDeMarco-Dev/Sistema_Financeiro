import type { Perfil, Usuario } from '@prisma/client';

export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  emailVerificado: boolean;
  criadoEm: Date;
}

/** Nunca inclui senhaHash nem tokens — usado por todo endpoint que devolve
 * dados de Usuario ao cliente. */
export function mapearUsuarioPublico(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    emailVerificado: usuario.emailVerificadoEm !== null,
    criadoEm: usuario.criadoEm,
  };
}

export interface PerfilResumo {
  fotoUrl: string | null;
  moedaPadrao: string;
  idioma: string;
  tema: Perfil['tema'];
  timezone: string;
}

export interface UsuarioComPerfilPublico {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilResumo | null;
}

/** Formato de `usuario` devolvido por login/renovar (04-API.md §7.2) —
 * mais enxuto que mapearUsuarioPublico: sem emailVerificado/criadoEm, com
 * o resumo do Perfil que o frontend usa para aplicar tema/timezone/moeda. */
export function mapearUsuarioComPerfil(
  usuario: Usuario,
  perfil: Perfil | null,
): UsuarioComPerfilPublico {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: perfil
      ? {
          fotoUrl: perfil.fotoUrl,
          moedaPadrao: perfil.moedaPadrao,
          idioma: perfil.idioma,
          tema: perfil.tema,
          timezone: perfil.timezone,
        }
      : null,
  };
}
