import type { Usuario } from '@prisma/client';

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
