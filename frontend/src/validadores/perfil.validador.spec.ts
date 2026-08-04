import { describe, expect, it } from 'vitest';
import { perfilNomeSchema, preferenciasSchema } from './perfil.validador';

describe('perfilNomeSchema', () => {
  it('aceita nome valido', () => {
    expect(perfilNomeSchema.safeParse({ nome: 'Samuel De Marco' }).success).toBe(true);
  });

  it('rejeita nome com menos de 3 caracteres', () => {
    expect(perfilNomeSchema.safeParse({ nome: 'Ab' }).success).toBe(false);
  });
});

describe('preferenciasSchema', () => {
  const BASE = {
    tema: 'SISTEMA' as const,
    idioma: 'pt-BR',
    moedaPadrao: 'BRL',
    timezone: 'America/Sao_Paulo',
    formatoData: 'dd/MM/yyyy',
    primeiroDiaSemana: 0,
    notificacoesApp: true,
    notificacoesEmail: true,
  };

  it('aceita dados validos', () => {
    expect(preferenciasSchema.safeParse(BASE).success).toBe(true);
  });

  it('normaliza a moeda para maiusculas', () => {
    const resultado = preferenciasSchema.safeParse({ ...BASE, moedaPadrao: 'brl' });
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.moedaPadrao).toBe('BRL');
    }
  });

  it('rejeita moeda invalida', () => {
    // Intl.NumberFormat so valida a FORMA (3 letras), nao se e' uma moeda
    // real da ISO 4217 — 'XXX', 'ZZZ', 'AAA' etc. passam. Um codigo
    // nao-alfabetico e' o unico jeito de fazer o refine falhar de verdade.
    expect(preferenciasSchema.safeParse({ ...BASE, moedaPadrao: '123' }).success).toBe(false);
  });

  it('rejeita timezone invalido', () => {
    expect(preferenciasSchema.safeParse({ ...BASE, timezone: 'Nao/Existe' }).success).toBe(false);
  });

  it('rejeita tema fora do enum', () => {
    expect(preferenciasSchema.safeParse({ ...BASE, tema: 'AZUL' }).success).toBe(false);
  });

  it('rejeita primeiroDiaSemana fora de 0-6', () => {
    expect(preferenciasSchema.safeParse({ ...BASE, primeiroDiaSemana: 7 }).success).toBe(false);
  });
});
