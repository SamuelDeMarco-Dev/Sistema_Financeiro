import { asyncHandler } from '@/middlewares/async-handler';
import { ContaServico } from '@/servicos/conta.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  AtualizarContaDTO,
  CriarContaDTO,
  IdParam,
  ListarContasQuery,
  ReordenarContasDTO,
} from '@/validadores/contas.validador';
import type { Request, Response } from 'express';

export class ContaControlador {
  private readonly servico = new ContaServico();

  listar = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ListarContasQuery;
    const { contas, totalizadores } = await this.servico.listar(req.usuario, query);

    res
      .status(200)
      .json(respostaSucesso({ contas }, 'Contas listadas com sucesso.', { totalizadores }));
  });

  listarResumo = asyncHandler(async (req: Request, res: Response) => {
    const contas = await this.servico.listarResumo(req.usuario.id);

    res.status(200).json(respostaSucesso({ contas }, 'Resumo carregado.'));
  });

  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParam;
    const conta = await this.servico.buscarPorId(id, req.usuario);

    res.status(200).json(respostaSucesso({ conta }, 'Conta encontrada.'));
  });

  criar = asyncHandler(async (req: Request, res: Response) => {
    const conta = await this.servico.criar(req.usuario, req.body as CriarContaDTO);

    res
      .status(201)
      .location(`/api/v1/contas/${conta.id}`)
      .json(respostaSucesso({ conta }, 'Conta criada com sucesso.'));
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParam;
    const conta = await this.servico.atualizar(id, req.usuario, req.body as AtualizarContaDTO);

    res.status(200).json(respostaSucesso({ conta }, 'Conta atualizada com sucesso.'));
  });

  arquivar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParam;
    const conta = await this.servico.arquivar(id, req.usuario);

    res.status(200).json(respostaSucesso({ conta }, 'Conta arquivada.'));
  });

  desarquivar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParam;
    const conta = await this.servico.desarquivar(id, req.usuario);

    res.status(200).json(respostaSucesso({ conta }, 'Conta desarquivada.'));
  });

  reordenar = asyncHandler(async (req: Request, res: Response) => {
    await this.servico.reordenar(req.usuario.id, req.body as ReordenarContasDTO);

    res.status(200).json(respostaSucesso({}, 'Contas reordenadas com sucesso.'));
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParam;
    await this.servico.excluir(id, req.usuario);

    res.status(204).send();
  });
}
