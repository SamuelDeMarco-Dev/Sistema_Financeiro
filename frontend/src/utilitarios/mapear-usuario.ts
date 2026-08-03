import type { PerfilCompleto } from '@/tipos/perfil';
import type { Usuario } from '@/tipos/usuario';

/** Reduz a forma rica de GET /perfil (issue #21) para a mesma forma enxuta
 * que /autenticacao/entrar ja devolve — o contexto sempre guarda UM
 * formato de Usuario, nao importa se a sessao veio de login explicito ou
 * de restauracao no boot. */
export function mapearPerfilParaUsuario(perfil: PerfilCompleto): Usuario {
  return {
    id: perfil.id,
    nome: perfil.nome,
    email: perfil.email,
    perfil: {
      fotoUrl: perfil.fotoUrl,
      moedaPadrao: perfil.moedaPadrao,
      idioma: perfil.idioma,
      tema: perfil.tema,
      timezone: perfil.timezone,
    },
  };
}
