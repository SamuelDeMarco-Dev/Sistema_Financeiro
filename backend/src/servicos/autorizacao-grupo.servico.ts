import { NaoEncontradoErro, PapelInsuficienteErro } from '@/erros';
import { MembroCompartilhadoRepositorio } from '@/repositorios/membro-compartilhado.repositorio';
import type { MembroCompartilhado, PapelMembro } from '@prisma/client';

const membroRepositorio = new MembroCompartilhadoRepositorio();

/** Fonte unica da decisao "este usuario pode agir neste grupo, com este
 * papel?" (02-ARCHITECTURE.md §8.3 nivel 2). Extraida como funcao — nao
 * como metodo de `ContaCompartilhadaServico` — porque varios servicos de
 * dominio (conta/categoria/etiqueta/movimentacao, issue #72) precisam
 * dela, e `ContaCompartilhadaServico` ja depende de `CategoriaServico`
 * (copia de categorias padrao na criacao do grupo, issue #67):
 * `CategoriaServico` importar a CLASSE `ContaCompartilhadaServico`
 * causaria uma dependencia circular na construcao (`new
 * ContaCompartilhadaServico()` construiria um `CategoriaServico`, que
 * construiria outro `ContaCompartilhadaServico`, ...). Importar so esta
 * funcao evita o ciclo. `autorizarCompartilhada` (middleware, issue #68)
 * e `ContaCompartilhadaServico.autorizarPapel` chamam a mesma funcao. */
export async function autorizarPapelNoGrupo(
  contaCompartilhadaId: string,
  usuarioId: string,
  papeisPermitidos: PapelMembro[],
): Promise<MembroCompartilhado> {
  const membro = await membroRepositorio.buscarAtivo(contaCompartilhadaId, usuarioId);
  if (!membro) {
    throw new NaoEncontradoErro('Conta compartilhada nao encontrada.');
  }
  if (papeisPermitidos.length > 0 && !papeisPermitidos.includes(membro.papel)) {
    throw new PapelInsuficienteErro('Seu papel no grupo nao permite esta acao.');
  }
  return membro;
}
