import { describe, expect, it } from 'vitest';
import { gerarTokenOpaco, hashToken } from '@/utilitarios/token';

describe('utilitarios/token', () => {
  it('gerarTokenOpaco produz valores diferentes a cada chamada', () => {
    expect(gerarTokenOpaco()).not.toBe(gerarTokenOpaco());
  });

  it('hashToken e deterministico para o mesmo valor', () => {
    const bruto = gerarTokenOpaco();

    expect(hashToken(bruto)).toBe(hashToken(bruto));
  });

  it('hashToken nunca retorna o valor original (RN-53)', () => {
    const bruto = gerarTokenOpaco();

    expect(hashToken(bruto)).not.toBe(bruto);
  });

  it('hashToken produz hashes diferentes para valores diferentes', () => {
    expect(hashToken(gerarTokenOpaco())).not.toBe(hashToken(gerarTokenOpaco()));
  });
});
