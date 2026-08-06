import path from 'node:path';
import { asyncHandler } from '@/middlewares/async-handler';
import { AnexoServico } from '@/servicos/anexo.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { IdAnexoParam, IdParamMovimentacaoAnexo } from '@/validadores/anexo.validador';
import type { Request, Response } from 'express';

export class AnexoControlador {
  private readonly servico = new AnexoServico();

  enviar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdParamMovimentacaoAnexo;
    const arquivos = (req.files as Express.Multer.File[] | undefined) ?? [];
    const anexos = await this.servico.enviar(id, req.usuario.id, arquivos);

    const plural = anexos.length === 1 ? '' : 's';
    res
      .status(201)
      .json(
        respostaSucesso(
          { anexos },
          `${anexos.length} anexo${plural} enviado${plural} com sucesso.`,
        ),
      );
  });

  baixar = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdAnexoParam;
    const anexo = await this.servico.buscarConteudo(id, req.usuario.id);

    res.sendFile(path.resolve(anexo.caminho), {
      headers: {
        'Content-Type': anexo.tipoMime,
        'Content-Disposition': `inline; filename="${anexo.nomeOriginal}"`,
      },
    });
  });

  excluir = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as IdAnexoParam;
    await this.servico.excluir(id, req.usuario.id);

    res.status(204).send();
  });
}
