import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

function stubMatchMedia(matches: boolean): {
  ouvintes: ((evento: { matches: boolean }) => void)[];
} {
  const ouvintes: ((evento: { matches: boolean }) => void)[] = [];
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      addEventListener: vi.fn(
        (_evento: string, ouvinte: (evento: { matches: boolean }) => void) => {
          ouvintes.push(ouvinte);
        },
      ),
      removeEventListener: vi.fn(),
    }),
  );
  return { ouvintes };
}

describe('usePrefersReducedMotion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('devolve false quando o SO nao pede menos movimento', () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(false);
  });

  it('devolve true quando o SO pede menos movimento', () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => usePrefersReducedMotion());

    expect(result.current).toBe(true);
  });

  it('atualiza quando a preferencia do SO muda em tempo real', () => {
    const { ouvintes } = stubMatchMedia(false);
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      ouvintes.forEach((ouvinte) => {
        ouvinte({ matches: true });
      });
    });

    expect(result.current).toBe(true);
  });
});
