import { ValidacaoErro } from '@/erros';
import { asyncHandler } from '@/middlewares/async-handler';
import { PerfilServico } from '@/servicos/perfil.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { AtualizarPerfilDTO } from '@/validadores/perfil.validador';
import type { Request, Response } from 'express';

export class PerfilControlador {
  private readonly servico = new PerfilServico();

  consultar = asyncHandler(async (req: Request, res: Response) => {
    const perfil = await this.servico.consultar(req.usuario.id);

    res.status(200).json(respostaSucesso({ perfil }, 'Perfil carregado.'));
  });

  atualizar = asyncHandler(async (req: Request, res: Response) => {
    const perfil = await this.servico.atualizar(req.usuario.id, req.body as AtualizarPerfilDTO);

    res.status(200).json(respostaSucesso({ perfil }, 'Perfil atualizado com sucesso.'));
  });

  atualizarFoto = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw new ValidacaoErro('Envie um arquivo no campo "foto".');
    }

    const fotoUrl = await this.servico.atualizarFoto(req.usuario.id, req.file.buffer);

    res.status(200).json(respostaSucesso({ fotoUrl }, 'Foto atualizada.'));
  });

  removerFoto = asyncHandler(async (req: Request, res: Response) => {
    await this.servico.removerFoto(req.usuario.id);

    res.status(204).send();
  });
}
