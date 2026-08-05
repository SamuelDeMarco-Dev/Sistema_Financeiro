import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CampoData } from './CampoData';
import type { ReactElement } from 'react';

function CampoDataControlado({
  inicial = null,
  timezone = 'America/Sao_Paulo',
  aoAlterar,
}: {
  inicial?: string | null;
  timezone?: string;
  aoAlterar?: (valor: string | null) => void;
}): ReactElement {
  const [valor, setValor] = useState<string | null>(inicial);
  return (
    <CampoData
      rotulo="Data"
      valor={valor}
      timezone={timezone}
      aoAlterar={(novoValor) => {
        setValor(novoValor);
        aoAlterar?.(novoValor);
      }}
    />
  );
}

describe('CampoData', () => {
  it('digitando "05082026" produz a data ISO "2026-08-05"', () => {
    const aoAlterar = vi.fn();
    render(<CampoDataControlado aoAlterar={aoAlterar} />);

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '05082026' } });

    expect(aoAlterar).toHaveBeenLastCalledWith('2026-08-05');
    expect(screen.getByLabelText<HTMLInputElement>('Data').value).toBe('05/08/2026');
  });

  it('nao chama aoAlterar com uma data de calendario invalida', () => {
    const aoAlterar = vi.fn();
    render(<CampoDataControlado aoAlterar={aoAlterar} />);

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '30022026' } });

    expect(aoAlterar).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>('Data').value).toBe('30/02/2026');
  });

  it('limpar o campo chama aoAlterar com null', () => {
    const aoAlterar = vi.fn();
    render(<CampoDataControlado inicial="2026-08-05" aoAlterar={aoAlterar} />);

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '' } });

    expect(aoAlterar).toHaveBeenLastCalledWith(null);
  });

  it('abre o calendario e seleciona "Hoje" respeitando o timezone do perfil', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    // toFake: ['Date'] congela apenas `new Date()`/`Date.now()` — setTimeout
    // e requestAnimationFrame continuam reais, para nao travar o
    // posicionamento por Popper do Radix nem o user-event.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T02:00:00.000Z'));
    render(<CampoDataControlado timezone="America/Sao_Paulo" aoAlterar={aoAlterar} />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    await usuario.click(screen.getByRole('button', { name: 'Hoje' }));
    vi.useRealTimers();

    // 02h UTC de 1o/jan em America/Sao_Paulo (UTC-3) ainda e 31 de dezembro.
    expect(aoAlterar).toHaveBeenLastCalledWith('2025-12-31');
  });

  it('seleciona "Ontem" um dia antes de hoje no timezone informado', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
    render(<CampoDataControlado timezone="UTC" aoAlterar={aoAlterar} />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    await usuario.click(screen.getByRole('button', { name: 'Ontem' }));
    vi.useRealTimers();

    expect(aoAlterar).toHaveBeenLastCalledWith('2026-08-04');
  });

  it('clicar num dia do calendario seleciona a data e fecha o popover', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    render(<CampoDataControlado inicial="2026-08-05" aoAlterar={aoAlterar} />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    const diaDez = await waitFor(() => {
      const elemento = document.getElementById('dia-calendario-2026-08-10');
      if (!elemento) throw new Error('dia nao encontrado');
      return elemento;
    });
    await usuario.click(diaDez);

    expect(aoAlterar).toHaveBeenLastCalledWith('2026-08-10');
  });

  it('ArrowRight move o foco para o proximo dia dentro do calendario', async () => {
    const usuario = userEvent.setup();
    render(<CampoDataControlado inicial="2026-08-05" />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    const grade = screen.getByRole('grid');
    const diaFocado = await waitFor(() => {
      const elemento = grade.querySelector<HTMLButtonElement>('button[tabindex="0"]');
      if (!elemento) throw new Error('nenhum dia com foco');
      return elemento;
    });
    diaFocado.focus();

    fireEvent.keyDown(grade, { key: 'ArrowRight' });

    await waitFor(() => {
      const novoFocado = document.getElementById('dia-calendario-2026-08-06');
      expect(novoFocado?.getAttribute('tabindex')).toBe('0');
    });
  });

  it('PageDown avanca um mes mantendo o dia', async () => {
    const usuario = userEvent.setup();
    render(<CampoDataControlado inicial="2026-08-05" />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir calendario' }));
    expect(await screen.findByText('Agosto de 2026')).toBeTruthy();

    const grade = screen.getByRole('grid');
    fireEvent.keyDown(grade, { key: 'PageDown' });

    expect(await screen.findByText('Setembro de 2026')).toBeTruthy();
  });

  it('mostra a mensagem de erro quando informada', () => {
    render(
      <CampoData
        rotulo="Data"
        valor={null}
        timezone="UTC"
        aoAlterar={vi.fn()}
        erro="Data obrigatoria."
      />,
    );

    expect(screen.getByText('Data obrigatoria.')).toBeTruthy();
    expect(screen.getByLabelText('Data').getAttribute('aria-invalid')).toBe('true');
  });
});
