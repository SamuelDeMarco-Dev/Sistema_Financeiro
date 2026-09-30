import { describe, expect, it } from 'vitest';
import {
  ConflitoErro,
  ErroInterno,
  LimiteExcedidoErro,
  NaoAutenticadoErro,
  NaoEncontradoErro,
  ProibidoErro,
  RegraNegocioErro,
  ValidacaoErro,
} from '@/erros';
import type { ErroAplicacao } from '@/erros';

describe('subclasses de ErroAplicacao', () => {
  it.each([
    [ValidacaoErro, 400, 'VALIDACAO'],
    [NaoAutenticadoErro, 401, 'NAO_AUTENTICADO'],
    [ProibidoErro, 403, 'PROIBIDO'],
    [NaoEncontradoErro, 404, 'NAO_ENCONTRADO'],
    [ConflitoErro, 409, 'CONFLITO'],
    [RegraNegocioErro, 422, 'REGRA_NEGOCIO'],
    [LimiteExcedidoErro, 429, 'LIMITE_EXCEDIDO'],
    [ErroInterno, 500, 'ERRO_INTERNO'],
  ] as const)('expoe statusHttp %i e codigo %s', (Erro, statusHttp, codigo) => {
    const erro: ErroAplicacao = new Erro('mensagem de teste');

    expect(erro.statusHttp).toBe(statusHttp);
    expect(erro.codigo).toBe(codigo);
    expect(erro.message).toBe('mensagem de teste');
    expect(erro).toBeInstanceOf(Error);
  });
});
