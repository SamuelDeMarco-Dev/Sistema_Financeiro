import { describe, expect, it } from 'vitest';
import { contaSchema } from './conta.schema';

function corpoValido(sobrescritas: Record<string, unknown> = {}): unknown {
  return {
    nome: 'Banco Principal',
    tipo: 'CONTA_CORRENTE',
    saldoInicial: '1000.00',
    cor: '#2563EB',
    icone: 'wallet',
    incluirNoSaldoTotal: true,
    ...sobrescritas,
  };
}

describe('conta.schema', () => {
  it('aceita um corpo valido', () => {
    expect(() => contaSchema.parse(corpoValido())).not.toThrow();
  });

  it('rejeita nome com menos de 2 caracteres', () => {
    expect(() => contaSchema.parse(corpoValido({ nome: 'A' }))).toThrow();
  });

  it('rejeita tipo fora do enum', () => {
    expect(() => contaSchema.parse(corpoValido({ tipo: 'CRIPTO' }))).toThrow();
  });

  it('normaliza virgula para ponto no saldo inicial', () => {
    const resultado = contaSchema.parse(corpoValido({ saldoInicial: '1500,50' }));
    expect(resultado.saldoInicial).toBe('1500.50');
  });

  it('rejeita saldo inicial com separador de milhar (sem mascara nesta issue)', () => {
    expect(() => contaSchema.parse(corpoValido({ saldoInicial: '1.500,50' }))).toThrow();
  });

  it('aceita saldo inicial negativo', () => {
    const resultado = contaSchema.parse(corpoValido({ saldoInicial: '-50,00' }));
    expect(resultado.saldoInicial).toBe('-50.00');
  });

  it('rejeita saldo inicial com mais de duas casas decimais', () => {
    expect(() => contaSchema.parse(corpoValido({ saldoInicial: '10.999' }))).toThrow();
  });

  it('rejeita cor fora do formato hex', () => {
    expect(() => contaSchema.parse(corpoValido({ cor: 'azul' }))).toThrow();
  });

  it('transforma instituicao vazia em undefined', () => {
    const resultado = contaSchema.parse(corpoValido({ instituicao: '' }));
    expect(resultado.instituicao).toBeUndefined();
  });

  it('mantem instituicao quando informada', () => {
    const resultado = contaSchema.parse(corpoValido({ instituicao: 'Nubank' }));
    expect(resultado.instituicao).toBe('Nubank');
  });
});
