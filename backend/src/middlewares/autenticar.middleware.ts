import jwt from 'jsonwebtoken';
import { NaoAutenticadoErro, TokenExpiradoErro } from '@/erros';
import { asyncHandler } from '@/middlewares/async-handler';
import { AutenticacaoServico } from '@/servicos/autenticacao.servico';
import { verificarAccessToken } from '@/utilitarios/jwt';
import type { PayloadAccessToken } from '@/utilitarios/jwt';
import type { Request } from 'express';

const servico = new AutenticacaoServico();

function extrairToken(req: Request): string | undefined {
  const cabecalho = req.get('authorization');
  return cabecalho?.startsWith('Bearer ') ? cabecalho.slice('Bearer '.length) : undefined;
}

/** Popula `req.usuario` (02-ARCHITECTURE.md §8.3, nivel 1). TOKEN_EXPIRADO
 * e NAO_AUTENTICADO sao distinguidos de proposito: o cliente reage
 * diferente a cada um (tenta renovar vs. encerra a sessao). */
export const autenticar = asyncHandler(async (req, _res, next) => {
  const token = extrairToken(req);
  if (!token) {
    throw new NaoAutenticadoErro('Token ausente.');
  }

  let payload: PayloadAccessToken;
  try {
    payload = verificarAccessToken(token);
  } catch (erro) {
    if (erro instanceof jwt.TokenExpiredError) {
      throw new TokenExpiradoErro('Token expirado.');
    }
    throw new NaoAutenticadoErro('Token invalido.');
  }

  // buscarUsuarioPorId ja filtra excluidoEm: null — usuario excluido cai aqui.
  const usuario = await servico.buscarUsuarioPorId(payload.sub);
  if (!usuario) {
    throw new NaoAutenticadoErro('Token invalido.');
  }

  req.usuario = { id: usuario.id, email: usuario.email, nome: usuario.nome };
  next();
});
