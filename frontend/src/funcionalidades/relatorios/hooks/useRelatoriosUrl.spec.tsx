import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useRelatoriosUrl } from './useRelatoriosUrl';
import type { ReactElement, ReactNode } from 'react';

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  return <MemoryRouter initialEntries={['/relatorios']}>{children}</MemoryRouter>;
}

describe('useRelatoriosUrl', () => {
  it('usa MENSAL e o ano/mês de hoje como padrão quando a url não tem parâmetros', () => {
    const { result } = renderHook(() => useRelatoriosUrl({ ano: 2026, mes: 8 }), {
      wrapper: Wrapper,
    });

    expect(result.current.aba).toBe('MENSAL');
    expect(result.current.ano).toBe(2026);
    expect(result.current.mes).toBe(8);
  });

  it('definirAba troca a aba e preserva ano/mes', () => {
    const { result } = renderHook(() => useRelatoriosUrl({ ano: 2026, mes: 8 }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.definirAno(2025);
    });
    act(() => {
      result.current.definirAba('POR_CONTA');
    });

    expect(result.current.aba).toBe('POR_CONTA');
    expect(result.current.ano).toBe(2025);
  });

  it('definirMes avança para o próximo mês dentro do mesmo ano', () => {
    const { result } = renderHook(() => useRelatoriosUrl({ ano: 2026, mes: 8 }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.definirMes(9);
    });

    expect(result.current.ano).toBe(2026);
    expect(result.current.mes).toBe(9);
  });

  it('definirMes(13) rola para janeiro do ano seguinte', () => {
    const { result } = renderHook(() => useRelatoriosUrl({ ano: 2026, mes: 12 }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.definirMes(13);
    });

    expect(result.current.ano).toBe(2027);
    expect(result.current.mes).toBe(1);
  });

  it('definirMes(0) rola para dezembro do ano anterior', () => {
    const { result } = renderHook(() => useRelatoriosUrl({ ano: 2026, mes: 1 }), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.definirMes(0);
    });

    expect(result.current.ano).toBe(2025);
    expect(result.current.mes).toBe(12);
  });
});
