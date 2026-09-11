import { asyncHandler } from '@/middlewares/async-handler';
import { MetaServico } from '@/servicos/meta.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  AtualizarMetaDTO,
  CriarMetaDTO,
  IdParamMeta,
  ListarMetasQuery,
} from '@/validadores/metas.validador';
import type { Request, Response } from 'express';

export class MetaControlador {
  private readonly servico = new MetaServico();

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListarMetasQuery;
    const metas = await this.servico.listar(req.usuario.id, query);

    res.status(200).json(respostaSucesso({ metas }, 'Metas listadas.'));
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMeta;
    const meta = await this.servico.buscarPorId(id, req.usuario.id);

    res.status(200).json(respostaSucesso({ meta }, 'Meta encontrada.'));
  });

  criar = asyncHandler(async (req: Request, res: Response) => {
    const meta = await this.servico.criar(req.usuario.id, req.body as CriarMetaDTO);

    res
      .status(201)
      .location(`/api/v1/metas/${meta.id}`)
      .json(respostaSucesso({ meta }, 'Meta criada com sucesso.'));
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMeta;
    const meta = await this.servico.atualizar(id, req.usuario.id, req.body as AtualizarMetaDTO);

    res.status(200).json(respostaSucesso({ meta }, 'Meta atualizada com sucesso.'));
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMeta;
    await this.servico.excluir(id, req.usuario.id);

    res.status(204).send();
  });
}
