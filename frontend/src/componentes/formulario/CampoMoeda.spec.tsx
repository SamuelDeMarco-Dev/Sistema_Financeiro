import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CampoMoeda } from './CampoMoeda';
import type { ReactElement } from 'react';

function CampoMoedaControlado({
  inicial = '0.00',
  permiteNegativo = false,
  aoAlterar,
}: {
  inicial?: string;
  permiteNegativo?: boolean;
  aoAlterar?: (valor: string) => void;
}): ReactElement {
  const [valor, setValor] = useState(inicial);
  return (
    <CampoMoeda
      rotulo="Valor"
      valor={valor}
      permiteNegativo={permiteNegativo}
      aoAlterar={(novoValor) => {
        setValor(novoValor);
        aoAlterar?.(novoValor);
      }}
    />
  );
}

function digitar(campo: HTMLElement, teclas: string): void {
  for (const tecla of teclas) {
    const valorAtual = (campo as HTMLInputElement).value;
    fireEvent.change(campo, { target: { value: `${valorAtual}${tecla}` } });
  }
}

describe('CampoMoeda', () => {
  it('digitando 12345 produz "123.45" na submissao', () => {
    const aoAlterar = vi.fn();
    render(<CampoMoedaControlado aoAlterar={aoAlterar} />);

    digitar(screen.getByLabelText('Valor'), '12345');

    expect(aoAlterar).toHaveBeenLastCalledWith('123.45');
    expect(screen.getByLabelText<HTMLInputElement>('Valor').value).toContain('123,45');
  });

  it('backspace remove o ultimo digito, deslocando para a direita', () => {
    const aoAlterar = vi.fn();
    render(<CampoMoedaControlado inicial="123.45" aoAlterar={aoAlterar} />);

    const campo = screen.getByLabelText<HTMLInputElement>('Valor');
    fireEvent.change(campo, { target: { value: campo.value.slice(0, -1) } });

    expect(aoAlterar).toHaveBeenLastCalledWith('12.34');
  });

  it('ignora caracteres nao numericos digitados', () => {
    const aoAlterar = vi.fn();
    render(<CampoMoedaControlado aoAlterar={aoAlterar} />);

    const campo = screen.getByLabelText<HTMLInputElement>('Valor');
    fireEvent.change(campo, { target: { value: `${campo.value}abc` } });

    expect(aoAlterar).toHaveBeenLastCalledWith('0.00');
  });

  it('nunca produz mais de duas casas decimais, por construcao', () => {
    const aoAlterar = vi.fn();
    render(<CampoMoedaControlado aoAlterar={aoAlterar} />);

    digitar(screen.getByLabelText('Valor'), '1234567');

    const ultimoValor = aoAlterar.mock.calls.at(-1)?.[0] as string;
    expect(ultimoValor.split('.')[1]).toHaveLength(2);
    expect(ultimoValor).toBe('12345.67');
  });

  it('sem permiteNegativo, nao mostra o botao de alternar sinal', () => {
    render(<CampoMoedaControlado />);

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('com permiteNegativo, alterna o sinal ao clicar no botao', () => {
    const aoAlterar = vi.fn();
    render(<CampoMoedaControlado inicial="123.45" permiteNegativo aoAlterar={aoAlterar} />);

    fireEvent.click(screen.getByRole('button', { name: /alternar para negativo/ }));

    expect(aoAlterar).toHaveBeenLastCalledWith('-123.45');
    expect(screen.getByLabelText<HTMLInputElement>('Valor').value).toContain('-');
  });

  it('mostra a mensagem de erro quando informada', () => {
    render(
      <CampoMoeda rotulo="Valor" valor="0.00" aoAlterar={vi.fn()} erro="Valor obrigatorio." />,
    );

    expect(screen.getByText('Valor obrigatorio.')).toBeTruthy();
    expect(screen.getByLabelText('Valor').getAttribute('aria-invalid')).toBe('true');
  });
});
