import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartaoSaldoTotal } from './CartaoSaldoTotal';

describe('CartaoSaldoTotal', () => {
  it('mostra o saldo formatado e a quantidade de contas', () => {
    render(<CartaoSaldoTotal saldoTotal="4332.35" quantidadeContas={3} />);

    expect(screen.getByText(/4\.332,35/)).toBeTruthy();
    expect(screen.getByText('3 contas no saldo total')).toBeTruthy();
  });

  it('usa o singular quando ha apenas uma conta', () => {
    render(<CartaoSaldoTotal saldoTotal="100.00" quantidadeContas={1} />);

    expect(screen.getByText('1 conta no saldo total')).toBeTruthy();
  });

  it('mostra o sinal de menos para saldo negativo (A11Y-01)', () => {
    render(<CartaoSaldoTotal saldoTotal="-100.00" quantidadeContas={2} />);

    expect(screen.getByText(/^-R\$/)).toBeTruthy();
  });
});
