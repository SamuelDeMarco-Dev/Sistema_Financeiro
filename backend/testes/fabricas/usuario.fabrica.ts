import { prisma } from '@/banco/cliente';
import { assinarAccessToken } from '@/utilitarios/jwt';
import { gerarHash } from '@/utilitarios/senha';
import type { Usuario } from '@prisma/client';

let contador = 0;

/** Cria um usuario direto no banco (sem passar por HTTP) e assina o
 * access token correspondente — mais rapido que cadastrar+entrar via
 * requisicao quando o teste so precisa de um usuario autenticado. */
export async function fabricarUsuario(
  sobrescritas: Partial<Pick<Usuario, 'nome' | 'email'>> = {},
): Promise<{ usuario: Usuario; accessToken: string }> {
  contador += 1;

  const usuario = await prisma.usuario.create({
    data: {
      nome: sobrescritas.nome ?? 'Usuaria de Teste',
      email: sobrescritas.email ?? `fabrica-${contador}@exemplo.com`,
      senhaHash: await gerarHash('SenhaForte@2026'),
      emailVerificadoEm: new Date(),
    },
  });

  const accessToken = assinarAccessToken({ sub: usuario.id, email: usuario.email });

  return { usuario, accessToken };
}
