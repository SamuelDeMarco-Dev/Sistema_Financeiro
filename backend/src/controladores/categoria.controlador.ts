import { asyncHandler } from '@/middlewares/async-handler';
import { CategoriaServico } from '@/servicos/categoria.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  AtualizarCategoriaDTO,
  CriarCategoriaDTO,
  ExcluirCategoriaQuery,
  IdParamCategoria,
  ListarCategoriasQuery,
} from '@/validadores/categorias.validador';
import type { Request, Response } from 'express';

export class CategoriaControlador {
  private readonly servico = new CategoriaServico();

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListarCategoriasQuery;
    const categorias = await this.servico.listarArvore(req.usuario.id, query);

    res.status(200).json(respostaSucesso({ categorias }, 'Categorias listadas com sucesso.'));
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamCategoria;
    const categoria = await this.servico.buscarPorId(id, req.usuario.id);

    res.status(200).json(respostaSucesso({ categoria }, 'Categoria encontrada.'));
  });

  criar = asyncHandler(async (req: Request, res: Response) => {
    const categoria = await this.servico.criar(req.usuario.id, req.body as CriarCategoriaDTO);

    res
      .status(201)
      .location(`/api/v1/categorias/${categoria.id}`)
      .json(respostaSucesso({ categoria }, 'Categoria criada com sucesso.'));
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamCategoria;
    const categoria = await this.servico.atualizar(
      id,
      req.usuario.id,
      req.body as AtualizarCategoriaDTO,
    );

    res.status(200).json(respostaSucesso({ categoria }, 'Categoria atualizada com sucesso.'));
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamCategoria;
    const { recategorizarPara } = req.query as unknown as ExcluirCategoriaQuery;
    await this.servico.excluir(id, req.usuario.id, recategorizarPara);

    res.status(204).send();
  });
}
