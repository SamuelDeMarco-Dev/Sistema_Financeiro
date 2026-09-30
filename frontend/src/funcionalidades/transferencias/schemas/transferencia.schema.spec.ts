import { describe, expect, it } from 'vitest';
import { transferenciaSchema } from './transferencia.schema';

function dadosValidos(sobrescritas: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    contaOrigemId: 'conta-1',
    contaDestinoId: 'conta-2',
    valor: '100,00',
    data: '2026-08-06',
    descricao: undefined,
    ...sobrescritas,
  };
}

describe('transferenciaSchema', () => {
  it('aceita dados válidos e normaliza a vírgula do valor', () => {
    const resultado = transferenciaSchema.safeParse(dadosValidos());
    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.valor).toBe('100.00');
    }
  });

  it('rejeita contaOrigemId e contaDestinoId iguais', () => {
    const resultado = transferenciaSchema.safeParse(
      dadosValidos({ contaOrigemId: 'conta-1', contaDestinoId: 'conta-1' }),
    );
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const erro = resultado.error.issues.find((issue) => issue.path[0] === 'contaDestinoId');
      expect(erro?.message).toBe('Escolha uma conta diferente da origem.');
    }
  });

  it('rejeita data nula', () => {
    const resultado = transferenciaSchema.safeParse(dadosValidos({ data: null }));
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      const erro = resultado.error.issues.find((issue) => issue.path[0] === 'data');
      expect(erro?.message).toBe('Informe a data.');
    }
  });

  it('rejeita valor zero ou negativo', () => {
    const resultado = transferenciaSchema.safeParse(dadosValidos({ valor: '0,00' }));
    expect(resultado.success).toBe(false);
  });
});
