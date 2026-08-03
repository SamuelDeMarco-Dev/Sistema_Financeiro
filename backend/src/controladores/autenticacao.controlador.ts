import { ambiente } from '@/configuracao/ambiente';
import { CAMINHO_COOKIE_REFRESH, NOME_COOKIE_REFRESH } from '@/configuracao/constantes';
import { asyncHandler } from '@/middlewares/async-handler';
import { AutenticacaoServico } from '@/servicos/autenticacao.servico';
import { mapearUsuarioComPerfil, mapearUsuarioPublico } from '@/utilitarios/mapear-usuario';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { CadastrarDTO, EntrarDTO } from '@/validadores/autenticacao.validador';
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

  entrar = asyncHandler(async (req: Request, res: Response) => {
    const resultado = await this.servico.entrar(req.body as EntrarDTO, {
      ip: req.ip ?? '',
      userAgent: req.get('user-agent') ?? null,
    });

    res.cookie(NOME_COOKIE_REFRESH, resultado.refreshTokenBruto, {
      httpOnly: true,
      secure: ambiente.NODE_ENV === 'production',
      sameSite: 'strict',
      path: CAMINHO_COOKIE_REFRESH,
      maxAge: resultado.refreshTokenExpiraEm.getTime() - Date.now(),
    });

    res.status(200).json(
      respostaSucesso(
        {
          accessToken: resultado.accessToken,
          expiraEm: resultado.expiraEmSegundos,
          usuario: mapearUsuarioComPerfil(resultado.usuario, resultado.perfil),
        },
        'Autenticado com sucesso.',
      ),
    );
  });
}
