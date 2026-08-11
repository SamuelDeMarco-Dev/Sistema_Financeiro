import { ValidacaoErro } from '@/erros';
import { asyncHandler } from '@/middlewares/async-handler';
import { ContaCompartilhadaServico } from '@/servicos/conta-compartilhada.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  AtualizarContaCompartilhadaDTO,
  CriarContaCompartilhadaDTO,
  ExcluirContaCompartilhadaDTO,
  IdParam,
} from '@/validadores/contas-compartilhadas.validador';
import type { Request, Response } from 'express';

export class ContaCompartilhadaControlador {
  private readonly servico = new ContaCompartilhadaServico();

  listar = asyncHandler(async (req: Request, res: Response) => {
    const contasCompartilhadas = await this.servico.listar(req.usuario);

    res
      .status(200)
      .json(respostaSucesso({ contasCompartilhadas }, 'Contas compartilhadas listadas.'));
  });

  // Autorizacao (membro ativo, papel) ja foi decidida pelo middleware
  // `autorizarCompartilhada` — o controlador so le `req.membro.papel`.
  buscarPorId = asyncHandler(async (req: Request, res: Response) => {
    const { contaCompartilhadaId } = req.params as IdParam;
    const contaCompartilhada = await this.servico.buscarPorId(
      contaCompartilhadaId,
      req.membro.papel,
    );

    res.status(200).json(respostaSucesso({ contaCompartilhada }, 'Conta compartilhada carregada.'));
  });

  criar = asyncHandler(async (req: Request, res: Response) => {
    const contaCompartilhada = await this.servico.criar(
      req.usuario,
      req.body as CriarContaCompartilhadaDTO,
    );

    res
      .status(201)
      .location(`/api/v1/contas-compartilhadas/${contaCompartilhada.id}`)
      .json(respostaSucesso({ contaCompartilhada }, 'Conta compartilhada criada com sucesso.'));
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const { contaCompartilhadaId } = req.params as IdParam;
    const contaCompartilhada = await this.servico.atualizar(
      contaCompartilhadaId,
      req.body as AtualizarContaCompartilhadaDTO,
    );

    res
      .status(200)
      .json(respostaSucesso({ contaCompartilhada }, 'Conta compartilhada atualizada com sucesso.'));
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { contaCompartilhadaId } = req.params as IdParam;
    const { confirmacao } = req.body as ExcluirContaCompartilhadaDTO;
    await this.servico.excluir(contaCompartilhadaId, confirmacao);

    res.status(204).send();
  });

  atualizarImagem = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidacaoErro('Envie um arquivo no campo "imagem".');
    }
    const { contaCompartilhadaId } = req.params as IdParam;
    const imagemUrl = await this.servico.atualizarImagem(contaCompartilhadaId, req.file.buffer);

    res.status(200).json(respostaSucesso({ imagemUrl }, 'Imagem atualizada.'));
  });
}
