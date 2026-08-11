import { NaoEncontradoErro, PapelInsuficienteErro } from '@/erros';
import { asyncHandler } from '@/middlewares/async-handler';
import { ContaCompartilhadaServico } from '@/servicos/conta-compartilhada.servico';
import type { PapelMembro } from '@prisma/client';
import type { RequestHandler } from 'express';

const servico = new ContaCompartilhadaServico();

/** 02-ARCHITECTURE.md §8.3, nivel 2 (issue #68) — o unico ponto de decisao
 * de autorizacao em contas compartilhadas. Resolve o vinculo do usuario
 * autenticado com o grupo de `req.params.contaCompartilhadaId`, exige
 * `situacao: ATIVO` (RN-51: nao membro OU membro removido/que saiu recebe
 * `404`, nunca `403` — perde o acesso como se o grupo nao existisse) e,
 * quando `papeisPermitidos` e informado, valida o papel contra a matriz
 * RN-30. Sem argumentos, aceita qualquer papel ativo (rotas de leitura,
 * ex.: `GET /contas-compartilhadas/:contaCompartilhadaId`). Popula
 * `req.membro` para o controlador/servico nao precisarem repetir a
 * mesma consulta. */
export function autorizarCompartilhada(...papeisPermitidos: PapelMembro[]): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const { contaCompartilhadaId } = req.params as { contaCompartilhadaId: string };
    const membro = await servico.buscarMeuMembroAtivo(contaCompartilhadaId, req.usuario.id);
    if (!membro) {
      throw new NaoEncontradoErro('Conta compartilhada nao encontrada.');
    }
    if (papeisPermitidos.length > 0 && !papeisPermitidos.includes(membro.papel)) {
      throw new PapelInsuficienteErro('Seu papel no grupo nao permite esta acao.');
    }

    req.membro = membro;
    next();
  });
}
