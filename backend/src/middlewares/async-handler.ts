import type { NextFunction, Request, RequestHandler, Response } from 'express';

type ManipuladorAssincrono = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/** Encaminha rejeicoes de handlers async para o tratadorErros — sem isso,
 * uma Promise rejeitada dentro de uma rota nunca chegaria ao Express. */
export function asyncHandler(manipulador: ManipuladorAssincrono): RequestHandler {
  return (req, res, next) => {
    manipulador(req, res, next).catch(next);
  };
}
