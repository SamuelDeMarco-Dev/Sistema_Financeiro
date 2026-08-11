import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ambiente } from '@/configuracao/ambiente';
import { NaoAutenticadoErro } from '@/erros';
import { autenticarMetricas } from '@/middlewares/autenticar-metricas.middleware';
import type { Request, Response } from 'express';

function fabricarRequisicao(cabecalho?: string): Request {
  return { get: () => cabecalho } as unknown as Request;
}

describe('autenticarMetricas', () => {
  const tokenOriginal = ambiente.TOKEN_METRICAS;

  beforeEach(() => {
    ambiente.TOKEN_METRICAS = 'token-correto-com-32-caracteres-';
  });

  afterEach(() => {
    ambiente.TOKEN_METRICAS = tokenOriginal;
  });

  it('lanca NaoAutenticadoErro quando o cabecalho Authorization esta ausente', () => {
    const req = fabricarRequisicao(undefined);
    const next = vi.fn();

    expect(() => {
      autenticarMetricas(req, {} as Response, next);
    }).toThrow(NaoAutenticadoErro);
    expect(next).not.toHaveBeenCalled();
  });

  it('lanca NaoAutenticadoErro quando o token nao confere com TOKEN_METRICAS', () => {
    const req = fabricarRequisicao('Bearer token-errado');
    const next = vi.fn();

    expect(() => {
      autenticarMetricas(req, {} as Response, next);
    }).toThrow(NaoAutenticadoErro);
    expect(next).not.toHaveBeenCalled();
  });

  it('lanca NaoAutenticadoErro quando TOKEN_METRICAS nao esta configurado (nunca abre por omissao)', () => {
    ambiente.TOKEN_METRICAS = undefined;
    const req = fabricarRequisicao('Bearer qualquer-coisa');
    const next = vi.fn();

    expect(() => {
      autenticarMetricas(req, {} as Response, next);
    }).toThrow(NaoAutenticadoErro);
  });

  it('chama next() quando o token confere exatamente', () => {
    const req = fabricarRequisicao('Bearer token-correto-com-32-caracteres-');
    const next = vi.fn();

    autenticarMetricas(req, {} as Response, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
