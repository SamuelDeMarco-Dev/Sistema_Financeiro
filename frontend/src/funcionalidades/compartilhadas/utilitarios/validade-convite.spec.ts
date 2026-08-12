import { describe, expect, it } from 'vitest';
import { diasAteExpirar, rotuloValidadeConvite } from './validade-convite';

const AGORA = new Date('2026-08-12T12:00:00.000Z');

describe('diasAteExpirar', () => {
  it('conta os dias inteiros restantes', () => {
    expect(diasAteExpirar('2026-08-19T12:00:00.000Z', AGORA)).toBe(7);
  });

  it('arredonda para cima: faltando 30 minutos, ainda resta 1 dia', () => {
    expect(diasAteExpirar('2026-08-12T12:30:00.000Z', AGORA)).toBe(1);
  });

  it('e zero no instante exato da expiracao', () => {
    expect(diasAteExpirar('2026-08-12T12:00:00.000Z', AGORA)).toBe(0);
  });

  it('e negativo depois de expirado', () => {
    expect(diasAteExpirar('2026-08-10T12:00:00.000Z', AGORA)).toBe(-2);
  });
});

describe('rotuloValidadeConvite', () => {
  it('pluraliza acima de um dia', () => {
    expect(rotuloValidadeConvite('2026-08-19T12:00:00.000Z', AGORA)).toBe('Expira em 7 dias');
  });

  it('usa "Expira hoje" no ultimo dia, em vez de "Expira em 1 dias"', () => {
    expect(rotuloValidadeConvite('2026-08-12T20:00:00.000Z', AGORA)).toBe('Expira hoje');
  });

  it('nunca chama de valido um convite que ja venceu', () => {
    expect(rotuloValidadeConvite('2026-08-11T12:00:00.000Z', AGORA)).toBe('Expirado');
    expect(rotuloValidadeConvite('2026-08-12T12:00:00.000Z', AGORA)).toBe('Expirado');
  });
});
