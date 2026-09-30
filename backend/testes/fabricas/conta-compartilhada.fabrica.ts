import { prisma } from '@/banco/cliente';
import { fabricarUsuario } from './usuario.fabrica';
import type { ContaCompartilhada, MembroCompartilhado, PapelMembro, Usuario } from '@prisma/client';

let contador = 0;

export interface MembroDeTeste {
  usuario: Usuario;
  accessToken: string;
  membro: MembroCompartilhado;
  papel: PapelMembro;
}

export interface GrupoComMembros {
  grupo: ContaCompartilhada;
  administrador: MembroDeTeste;
  membros: MembroDeTeste[];
}

/** Fixture central da issue #77 (matriz de autorizacao): cria um grupo
 * direto no banco (sem HTTP, mais rapido) com um ADMINISTRADOR e um
 * membro para cada papel em `papeis` — nunca inclui ADMINISTRADOR em
 * `papeis` (RN-28 garante exatamente um, que e sempre `administrador`
 * nesta fixture). Cada membro retornado ja vem com seu proprio usuario
 * e access token, prontos para autenticar requisicoes. */
export async function fabricarGrupoComMembros(
  papeis: PapelMembro[],
  sobrescritasGrupo: Partial<
    Pick<ContaCompartilhada, 'nome' | 'moeda' | 'permiteParticipanteEditarProprias'>
  > = {},
): Promise<GrupoComMembros> {
  contador += 1;
  const { usuario: usuarioAdmin, accessToken: tokenAdmin } = await fabricarUsuario();

  const grupo = await prisma.contaCompartilhada.create({
    data: {
      nome: sobrescritasGrupo.nome ?? `Grupo de Teste ${contador}`,
      moeda: sobrescritasGrupo.moeda ?? 'BRL',
      permiteParticipanteEditarProprias:
        sobrescritasGrupo.permiteParticipanteEditarProprias ?? true,
      criadoPorId: usuarioAdmin.id,
    },
  });

  const membroAdmin = await prisma.membroCompartilhado.create({
    data: { contaCompartilhadaId: grupo.id, usuarioId: usuarioAdmin.id, papel: 'ADMINISTRADOR' },
  });

  const membros: MembroDeTeste[] = [];
  for (const papel of papeis) {
    const { usuario, accessToken } = await fabricarUsuario();
    const membro = await prisma.membroCompartilhado.create({
      data: { contaCompartilhadaId: grupo.id, usuarioId: usuario.id, papel },
    });
    membros.push({ usuario, accessToken, membro, papel });
  }

  return {
    grupo,
    administrador: {
      usuario: usuarioAdmin,
      accessToken: tokenAdmin,
      membro: membroAdmin,
      papel: 'ADMINISTRADOR',
    },
    membros,
  };
}
