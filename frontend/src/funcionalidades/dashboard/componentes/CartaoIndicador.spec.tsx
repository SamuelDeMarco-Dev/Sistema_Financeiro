import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartaoIndicador } from './CartaoIndicador';

describe('CartaoIndicador', () => {
  it('mostra rótulo e valor formatado', () => {
    render(<CartaoIndicador rotulo="Saldo atual" valorFormatado="R$ 1.000,00" icone={<span />} />);

    expect(screen.getByText('Saldo atual')).toBeTruthy();
    expect(screen.getByText('R$ 1.000,00')).toBeTruthy();
  });

  it('nao mostra variacao quando nao informada', () => {
    render(<CartaoIndicador rotulo="Saldo atual" valorFormatado="R$ 1.000,00" icone={<span />} />);

    expect(screen.queryByText(/vs\. período anterior/)).toBeNull();
  });

  // A11Y-01: a variacao nunca depende so da cor — seta e sinal numerico
  // sempre acompanham (verificado pelo texto visivel, nao pela classe CSS).
  it('receitas: variacao positiva mostra seta para cima e sinal "+"', () => {
    render(
      <CartaoIndicador
        rotulo="Receitas"
        valorFormatado="R$ 500,00"
        icone={<span />}
        variacao={5.2}
        direcaoFavoravel="ALTA"
      />,
    );

    expect(screen.getByText('▲')).toBeTruthy();
    expect(screen.getByText('+5.2% vs. período anterior')).toBeTruthy();
  });

  it('receitas: variacao negativa mostra seta para baixo, sem sinal "+"', () => {
    render(
      <CartaoIndicador
        rotulo="Receitas"
        valorFormatado="R$ 500,00"
        icone={<span />}
        variacao={-5.2}
        direcaoFavoravel="ALTA"
      />,
    );

    expect(screen.getByText('▼')).toBeTruthy();
    expect(screen.getByText('-5.2% vs. período anterior')).toBeTruthy();
  });

  it('despesas: uma ALTA e desfavoravel, entao usa a cor de perigo', () => {
    render(
      <CartaoIndicador
        rotulo="Despesas"
        valorFormatado="R$ 200,00"
        icone={<span />}
        variacao={3}
        direcaoFavoravel="BAIXA"
      />,
    );

    const texto = screen.getByText('+3.0% vs. período anterior').closest('p');
    expect(texto?.className).toContain('text-perigo');
  });

  it('despesas: uma BAIXA e favoravel, entao usa a cor de sucesso', () => {
    render(
      <CartaoIndicador
        rotulo="Despesas"
        valorFormatado="R$ 200,00"
        icone={<span />}
        variacao={-3}
        direcaoFavoravel="BAIXA"
      />,
    );

    const texto = screen.getByText('-3.0% vs. período anterior').closest('p');
    expect(texto?.className).toContain('text-sucesso');
  });
});
