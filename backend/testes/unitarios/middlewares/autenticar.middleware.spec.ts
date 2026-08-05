import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NaoAutenticadoErro, TokenExpiradoErro } from '@/erros';
import { autenticar } from '@/middlewares/autenticar.middleware';
import { assinarAccessToken } from '@/utilitarios/jwt';
import type { Usuario } from '@prisma/client';
import type { Request, Response } from 'express';

// autenticar.middleware.ts instancia `new AutenticacaoServico()" uma unica
// vez, no escopo do modulo — nao da para trocar a instancia por teste, so
// reconfigurar o mock persistente que ela expoe.
const { buscarUsuarioPorIdMock } = vi.hoisted(() => ({ buscarUsuarioPorIdMock: vi.fn() }));

vi.mock('@/servicos/autenticacao.servico', () => ({
  AutenticacaoServico: vi.fn().mockImplementation(function ServicoFalso() {
    return { buscarUsuarioPorId: buscarUsuarioPorIdMock };
  }),
}));

function fabricarRequisicao(cabecalhoAuthorization?: string): Request {
  return {
    get: (nome: string) =>
      nome.toLowerCase() === 'authorization' ? cabecalhoAuthorization : undefined,
  } as unknown as Request;
}

function fabricarUsuario(): Usuario {
  return {
    id: 'usuario-1',
    nome: 'Samuel De Marco',
    email: 'samuel@exemplo.com',
    senhaHash: 'hash-fake',
    emailVerificadoEm: new Date(),
    tokenVerificacao: null,
    tokenVerificacaoExpiraEm: null,
    tokenRecuperacao: null,
    tokenRecuperacaoExpiraEm: null,
    tentativasLogin: 0,
    bloqueadoAte: null,
    ultimoLoginEm: null,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    excluidoEm: null,
    anonimizadoEm: null,
  };
}

// asyncHandler nao retorna a Promise interna (dispara e esquece, com
// .catch(next)) — esperar pelo proprio next() e o unico jeito confiavel de
// saber que o middleware terminou antes de checar o resultado.
function executarAutenticar(req: Request): Promise<unknown> {
  return new Promise((resolve) => {
    autenticar(req, {} as Response, (erro?: unknown) => {
      resolve(erro);
    });
  });
}

describe('autenticar', () => {
  beforeEach(() => {
    buscarUsuarioPorIdMock.mockReset();
  });

  it('lanca NaoAutenticadoErro quando nao ha cabecalho Authorization', async () => {
    const erro = await executarAutenticar(fabricarRequisicao());
    expect(erro).toBeInstanceOf(NaoAutenticadoErro);
  });

  it('lanca NaoAutenticadoErro quando o cabecalho nao comeca com "Bearer "', async () => {
    const erro = await executarAutenticar(fabricarRequisicao('Basic abc123'));
    expect(erro).toBeInstanceOf(NaoAutenticadoErro);
  });

  it('lanca TokenExpiradoErro (distinto de NaoAutenticadoErro) quando o token expirou', async () => {
    const tokenExpirado = assinarAccessToken({ sub: 'usuario-1', email: 'samuel@exemplo.com' });
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000 * 60 * 60); // muito alem dos 15 min do access token
    const erro = await executarAutenticar(fabricarRequisicao(`Bearer ${tokenExpirado}`));
    vi.useRealTimers();

    expect(erro).toBeInstanceOf(TokenExpiradoErro);
  });

  it('lanca NaoAutenticadoErro quando o token e invalido (assinatura incorreta)', async () => {
    const erro = await executarAutenticar(fabricarRequisicao('Bearer token.invalido.aqui'));
    expect(erro).toBeInstanceOf(NaoAutenticadoErro);
  });

  it('lanca NaoAutenticadoErro quando o usuario do token nao existe mais (ex.: excluido)', async () => {
    const token = assinarAccessToken({ sub: 'usuario-1', email: 'samuel@exemplo.com' });
    buscarUsuarioPorIdMock.mockResolvedValue(null);

    const erro = await executarAutenticar(fabricarRequisicao(`Bearer ${token}`));
    expect(erro).toBeInstanceOf(NaoAutenticadoErro);
  });

  it('popula req.usuario e chama next() sem argumentos quando o token e valido', async () => {
    const token = assinarAccessToken({ sub: 'usuario-1', email: 'samuel@exemplo.com' });
    buscarUsuarioPorIdMock.mockResolvedValue(fabricarUsuario());
    const req = fabricarRequisicao(`Bearer ${token}`);

    const erro = await executarAutenticar(req);

    expect(erro).toBeUndefined();
    expect(req.usuario).toEqual({
      id: 'usuario-1',
      email: 'samuel@exemplo.com',
      nome: 'Samuel De Marco',
    });
  });
});
