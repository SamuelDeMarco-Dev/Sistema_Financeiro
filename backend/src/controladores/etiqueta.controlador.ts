import { asyncHandler } from '@/middlewares/async-handler';
import { EtiquetaServico } from '@/servicos/etiqueta.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  AtualizarEtiquetaDTO,
  CriarEtiquetaDTO,
  IdParamEtiqueta,
  ListarEtiquetasQuery,
} from '@/validadores/etiquetas.validador';
import type { Request, Response } from 'express';

export class EtiquetaControlador {
  private readonly servico = new EtiquetaServico();

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListarEtiquetasQuery;
    const etiquetas = await this.servico.listar(req.usuario.id, query);

    res.status(200).json(respostaSucesso({ etiquetas }, 'Etiquetas listadas.'));
  });

  criar = asyncHandler(async (req: Request, res: Response) => {
    const etiqueta = await this.servico.criar(req.usuario.id, req.body as CriarEtiquetaDTO);

    res
      .status(201)
      .location(`/api/v1/etiquetas/${etiqueta.id}`)
      .json(respostaSucesso({ etiqueta }, 'Etiqueta criada com sucesso.'));
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamEtiqueta;
    const etiqueta = await this.servico.atualizar(
      id,
      req.usuario.id,
      req.body as AtualizarEtiquetaDTO,
    );

    res.status(200).json(respostaSucesso({ etiqueta }, 'Etiqueta atualizada com sucesso.'));
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamEtiqueta;
    await this.servico.excluir(id, req.usuario.id);

    res.status(204).send();
  });
}
