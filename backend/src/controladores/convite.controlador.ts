import { asyncHandler } from '@/middlewares/async-handler';
import { ConviteServico } from '@/servicos/convite.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { IdParam } from '@/validadores/contas-compartilhadas.validador';
import type { ConviteIdParam, EnviarConviteDTO } from '@/validadores/convites.validador';
import type { Request, Response } from 'express';

export class ConviteControlador {
  private readonly servico = new ConviteServico();

  enviar = asyncHandler(async (req: Request, res: Response) => {
    const { contaCompartilhadaId } = req.params as IdParam;
    const convite = await this.servico.enviar(
      contaCompartilhadaId,
      req.usuario,
      req.body as EnviarConviteDTO,
    );

    res.status(201).json(respostaSucesso({ convite }, `Convite enviado para ${convite.email}.`));
  });

  listarPorGrupo = asyncHandler(async (req: Request, res: Response) => {
    const { contaCompartilhadaId } = req.params as IdParam;
    const convites = await this.servico.listarPorGrupo(contaCompartilhadaId);

    res.status(200).json(respostaSucesso({ convites }, 'Convites listados.'));
  });

  listarRecebidos = asyncHandler(async (req: Request, res: Response) => {
    const convites = await this.servico.listarRecebidos(req.usuario.email);

    res.status(200).json(respostaSucesso({ convites }, 'Convites recebidos.'));
  });

  aceitar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as ConviteIdParam;
    const membro = await this.servico.aceitar(id, req.usuario);

    res
      .status(200)
      .json(
        respostaSucesso({ membro }, `Você agora faz parte de "${membro.contaCompartilhada.nome}".`),
      );
  });

  recusar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as ConviteIdParam;
    await this.servico.recusar(id, req.usuario);

    res.status(204).send();
  });

  cancelar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as ConviteIdParam;
    await this.servico.cancelar(id, req.usuario);

    res.status(204).send();
  });
}
