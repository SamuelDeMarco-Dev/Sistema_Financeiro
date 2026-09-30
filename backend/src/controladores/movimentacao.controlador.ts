import { asyncHandler } from '@/middlewares/async-handler';
import { MovimentacaoServico } from '@/servicos/movimentacao.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  AtualizarMovimentacaoDTO,
  CriarMovimentacaoDTO,
  DuplicarMovimentacaoDTO,
  ExcluirMovimentacaoQuery,
  IdParamMovimentacao,
  ListarMovimentacoesQuery,
  PagarMovimentacaoDTO,
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
    const { movimentacao, recorrencia } = await this.servico.criar(
      req.usuario.id,
      req.body as CriarMovimentacaoDTO,
    );
    const mensagem = recorrencia
      ? `Movimentação recorrente criada. ${recorrencia.ocorrenciasGeradas} ocorrências geradas.`
      : 'Movimentação criada com sucesso.';

    res
      .status(201)
      .location(`/api/v1/movimentacoes/${movimentacao.id}`)
      .json(respostaSucesso({ movimentacao }, mensagem, recorrencia ? { recorrencia } : undefined));
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const movimentacao = await this.servico.buscarPorId(id, req.usuario.id);

    res.status(200).json(respostaSucesso({ movimentacao }, 'Movimentação encontrada.'));
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const movimentacao = await this.servico.atualizar(
      id,
      req.usuario.id,
      req.body as AtualizarMovimentacaoDTO,
    );

    res.status(200).json(respostaSucesso({ movimentacao }, 'Movimentação atualizada com sucesso.'));
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const { escopoExclusao } = req.query as ExcluirMovimentacaoQuery;
    await this.servico.excluir(id, req.usuario.id, escopoExclusao);

    res.status(204).send();
  });

  duplicar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const movimentacao = await this.servico.duplicar(
      id,
      req.usuario.id,
      req.body as DuplicarMovimentacaoDTO,
    );

    res
      .status(201)
      .location(`/api/v1/movimentacoes/${movimentacao.id}`)
      .json(respostaSucesso({ movimentacao }, 'Movimentação duplicada com sucesso.'));
  });

  pagar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const movimentacao = await this.servico.pagar(
      id,
      req.usuario.id,
      req.body as PagarMovimentacaoDTO,
    );

    res.status(200).json(respostaSucesso({ movimentacao }, 'Movimentação paga com sucesso.'));
  });

  estornar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const movimentacao = await this.servico.estornar(id, req.usuario.id);

    res.status(200).json(respostaSucesso({ movimentacao }, 'Pagamento estornado com sucesso.'));
  });

  ocorrencias = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacao;
    const resultado = await this.servico.buscarOcorrencias(id, req.usuario.id);

    res.status(200).json(respostaSucesso(resultado, 'Ocorrências listadas.'));
  });
}
