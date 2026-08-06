import { asyncHandler } from '@/middlewares/async-handler';
import { MovimentacaoServico } from '@/servicos/movimentacao.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  CriarMovimentacaoDTO,
  IdParamMovimentacao,
  ListarMovimentacoesQuery,
} from '@/validadores/movimentacoes.validador';
import type { Request, Response } from 'express';

export class MovimentacaoControlador {
  private readonly servico = new MovimentacaoServico();

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListarMovimentacoesQuery;
    const { itens, paginacao, totalizadores } = await this.servico.listar(req.usuario.id, query);

    res.status(200).json(
      respostaSucesso({ movimentacoes: itens }, 'Movimentações listadas com sucesso.', {
        paginacao,
        totalizadores,
      }),
    );
  });

  criar = asyncHandler(async (req: Request, res: Response) => {
    const movimentacao = await this.servico.criar(req.usuario.id, req.body as CriarMovimentacaoDTO);

    res
      .status(201)
      .location(`/api/v1/movimentacoes/${movimentacao.id}`)
      .json(respostaSucesso({ movimentacao }, 'Movimentação criada com sucesso.'));
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const movimentacao = await this.servico.buscarPorId(id, req.usuario.id);

    res.status(200).json(respostaSucesso({ movimentacao }, 'Movimentação encontrada.'));
  });
}
