import { asyncHandler } from '@/middlewares/async-handler';
import { AutenticacaoServico } from '@/servicos/autenticacao.servico';
import { mapearUsuarioPublico } from '@/utilitarios/mapear-usuario';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { CadastrarDTO } from '@/validadores/autenticacao.validador';
import type { Request, Response } from 'express';

export class AutenticacaoControlador {
  private readonly servico = new AutenticacaoServico();

  cadastrar = asyncHandler(async (req: Request, res: Response) => {
    const usuario = await this.servico.cadastrar(req.body as CadastrarDTO);

    res
      .status(201)
      .location(`/api/v1/usuarios/${usuario.id}`)
      .json(
        respostaSucesso(
          { usuario: mapearUsuarioPublico(usuario) },
          'Cadastro realizado. Verifique seu e-mail para ativar a conta.',
        ),
      );
  });
}
