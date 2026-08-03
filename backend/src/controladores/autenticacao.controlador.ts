import { ambiente } from '@/configuracao/ambiente';
import { CAMINHO_COOKIE_REFRESH, NOME_COOKIE_REFRESH } from '@/configuracao/constantes';
import { asyncHandler } from '@/middlewares/async-handler';
import { AutenticacaoServico } from '@/servicos/autenticacao.servico';
import { mapearUsuarioComPerfil, mapearUsuarioPublico } from '@/utilitarios/mapear-usuario';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  AlterarSenhaDTO,
  CadastrarDTO,
  EntrarDTO,
  EsqueciSenhaDTO,
  ReenviarVerificacaoDTO,
  RedefinirSenhaDTO,
  RevogarSessaoParams,
  VerificarEmailDTO,
} from '@/validadores/autenticacao.validador';
import type { Request, Response } from 'express';

function definirCookieRefresh(res: Response, tokenBruto: string, expiraEm: Date): void {
  res.cookie(NOME_COOKIE_REFRESH, tokenBruto, {
    httpOnly: true,
    secure: ambiente.NODE_ENV === 'production',
    sameSite: 'strict',
    path: CAMINHO_COOKIE_REFRESH,
    maxAge: expiraEm.getTime() - Date.now(),
  });
}

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

    definirCookieRefresh(res, resultado.refreshTokenBruto, resultado.refreshTokenExpiraEm);

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

  renovar = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies as Record<string, string | undefined>;
    const resultado = await this.servico.renovar(cookies[NOME_COOKIE_REFRESH], {
      ip: req.ip ?? '',
      userAgent: req.get('user-agent') ?? null,
    });

    definirCookieRefresh(res, resultado.refreshTokenBruto, resultado.refreshTokenExpiraEm);

    res
      .status(200)
      .json(
        respostaSucesso(
          { accessToken: resultado.accessToken, expiraEm: resultado.expiraEmSegundos },
          'Sessão renovada.',
        ),
      );
  });

  sair = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies as Record<string, string | undefined>;
    await this.servico.sair(cookies[NOME_COOKIE_REFRESH], req.usuario.id);

    res.clearCookie(NOME_COOKIE_REFRESH, { path: CAMINHO_COOKIE_REFRESH });
    res.status(204).send();
  });

  sairTodos = asyncHandler(async (req: Request, res: Response) => {
    await this.servico.sairTodos(req.usuario.id);

    res.clearCookie(NOME_COOKIE_REFRESH, { path: CAMINHO_COOKIE_REFRESH });
    res.status(204).send();
  });

  verificarEmail = asyncHandler(async (req: Request, res: Response) => {
    await this.servico.verificarEmail(req.body as VerificarEmailDTO);

    res.status(200).json(respostaSucesso({}, 'E-mail verificado com sucesso.'));
  });

  reenviarVerificacao = asyncHandler(async (req: Request, res: Response) => {
    await this.servico.reenviarVerificacao(req.body as ReenviarVerificacaoDTO);

    // Mesma mensagem exista ou nao a conta, ou ja esteja verificada —
    // o servico decide silenciosamente o que fazer de verdade.
    res
      .status(200)
      .json(
        respostaSucesso(
          {},
          'Se o e-mail estiver cadastrado e pendente de verificação, você receberá um novo link em instantes.',
        ),
      );
  });

  esqueciSenha = asyncHandler(async (req: Request, res: Response) => {
    await this.servico.esqueciSenha(req.body as EsqueciSenhaDTO);

    // 04-API.md §7.6: sempre 200, sempre a mesma mensagem.
    res
      .status(200)
      .json(
        respostaSucesso(
          {},
          'Se o e-mail estiver cadastrado, você receberá as instruções em instantes.',
        ),
      );
  });

  redefinirSenha = asyncHandler(async (req: Request, res: Response) => {
    await this.servico.redefinirSenha(req.body as RedefinirSenhaDTO);

    res.status(200).json(respostaSucesso({}, 'Senha redefinida com sucesso.'));
  });

  alterarSenha = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies as Record<string, string | undefined>;
    await this.servico.alterarSenha(
      req.usuario.id,
      req.body as AlterarSenhaDTO,
      cookies[NOME_COOKIE_REFRESH],
    );

    res.status(200).json(respostaSucesso({}, 'Senha alterada com sucesso.'));
  });

  sessoes = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies as Record<string, string | undefined>;
    const sessoes = await this.servico.listarSessoes(req.usuario.id, cookies[NOME_COOKIE_REFRESH]);

    res.status(200).json(respostaSucesso({ sessoes }, 'Sessões ativas listadas.'));
  });

  revogarSessao = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as RevogarSessaoParams;
    await this.servico.revogarSessao(req.usuario.id, id);

    res.status(204).send();
  });
}
