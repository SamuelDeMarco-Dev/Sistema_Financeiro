import { asyncHandler } from '@/middlewares/async-handler';
import { TransferenciaServico } from '@/servicos/transferencia.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  CriarTransferenciaDTO,
  IdTransferenciaParam,
} from '@/validadores/transferencia.validador';
import type { Request, Response } from 'express';

export class TransferenciaControlador {
  private readonly servico = new TransferenciaServico();

  criar = asyncHandler(async (req: Request, res: Response) => {
    const transferencia = await this.servico.criar(
      req.usuario.id,
      req.body as CriarTransferenciaDTO,
    );

    res
      .status(201)
      .location(`/api/v1/transferencias/${transferencia.transferenciaId}`)
      .json(respostaSucesso({ transferencia }, 'Transferência realizada com sucesso.'));
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { transferenciaId } = req.params as IdTransferenciaParam;
    const transferencia = await this.servico.buscarPorId(transferenciaId, req.usuario.id);

    res.status(200).json(respostaSucesso({ transferencia }, 'Transferência encontrada.'));
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { transferenciaId } = req.params as IdTransferenciaParam;
    await this.servico.excluir(transferenciaId, req.usuario.id);

    res.status(204).send();
  });
}
