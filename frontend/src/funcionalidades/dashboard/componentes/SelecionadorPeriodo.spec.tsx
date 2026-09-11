import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelecionadorPeriodo } from './SelecionadorPeriodo';

const TIMEZONE = 'America/Sao_Paulo';

describe('SelecionadorPeriodo', () => {
  it('"Este mês" fica marcado como ativo quando o periodo esta vazio (padrao)', () => {
    render(
      <SelecionadorPeriodo
        periodo={{ dataInicio: null, dataFim: null }}
        timezone={TIMEZONE}
        aoAlterar={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Este mês' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('clicar em "Este mês" chama aoAlterar limpando o periodo (deixa o backend decidir)', async () => {
    const aoAlterar = vi.fn();
    render(
      <SelecionadorPeriodo
        periodo={{ dataInicio: '2026-06-01', dataFim: '2026-06-30' }}
        timezone={TIMEZONE}
        aoAlterar={aoAlterar}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Este mês' }));

    expect(aoAlterar).toHaveBeenCalledWith({ dataInicio: null, dataFim: null });
  });

  it('clicar em "Últimos 30 dias" calcula e repassa o intervalo', async () => {
    const aoAlterar = vi.fn();
    render(
      <SelecionadorPeriodo
        periodo={{ dataInicio: null, dataFim: null }}
        timezone={TIMEZONE}
        aoAlterar={aoAlterar}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Últimos 30 dias' }));

    expect(aoAlterar).toHaveBeenCalledOnce();
    const argumento = aoAlterar.mock.calls[0]?.[0] as { dataInicio: string; dataFim: string };
    expect(argumento.dataInicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(argumento.dataFim).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
