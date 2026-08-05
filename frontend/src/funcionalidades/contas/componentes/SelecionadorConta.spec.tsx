import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelecionadorConta } from './SelecionadorConta';
import type { Conta } from '../tipos/conta';

function fabricarConta(sobrescritas: Partial<Conta> = {}): Conta {
  return {
    id: 'conta-1',
    nome: 'Banco Principal',
    tipo: 'CONTA_CORRENTE',
    instituicao: null,
    saldoInicial: '1000.00',
    saldoAtual: '1000.00',
    saldoPrevisto: '1000.00',
    moeda: 'BRL',
    cor: '#2563EB',
    icone: 'wallet',
    incluirNoSaldoTotal: true,
    ordem: 0,
    arquivada: false,
    quantidadeMovimentacoes: 0,
    escopo: { tipo: 'PESSOAL', id: 'usuario-1', nome: 'Samuel De Marco' },
    criadoEm: '2026-01-01T00:00:00.000Z',
    ...sobrescritas,
  };
}

describe('SelecionadorConta', () => {
  it('mostra o placeholder quando nenhuma conta esta selecionada', () => {
    render(
      <SelecionadorConta rotulo="Conta" contas={[fabricarConta()]} valor="" aoAlterar={vi.fn()} />,
    );

    expect(screen.getByText('Selecione uma conta')).toBeTruthy();
  });

  it('mostra nome e saldo da conta selecionada no gatilho', () => {
    render(
      <SelecionadorConta
        rotulo="Conta"
        contas={[fabricarConta()]}
        valor="conta-1"
        aoAlterar={vi.fn()}
      />,
    );

    expect(screen.getByText('Banco Principal')).toBeTruthy();
    expect(screen.getByText(/1\.000,00/)).toBeTruthy();
  });

  it('nao lista contas arquivadas', async () => {
    const usuario = userEvent.setup();
    render(
      <SelecionadorConta
        rotulo="Conta"
        contas={[
          fabricarConta({ id: 'ativa-1', nome: 'Ativa' }),
          fabricarConta({ id: 'arquivada-1', nome: 'Arquivada', arquivada: true }),
        ]}
        valor=""
        aoAlterar={vi.fn()}
      />,
    );

    await usuario.click(screen.getByRole('combobox'));

    expect(await screen.findByText('Ativa')).toBeTruthy();
    expect(screen.queryByText('Arquivada')).toBeNull();
  });

  it('agrupa contas por escopo, com rotulo "Pessoal" para o escopo pessoal', async () => {
    const usuario = userEvent.setup();
    render(
      <SelecionadorConta rotulo="Conta" contas={[fabricarConta()]} valor="" aoAlterar={vi.fn()} />,
    );

    await usuario.click(screen.getByRole('combobox'));

    expect(await screen.findByText('Pessoal')).toBeTruthy();
  });

  it('chama aoAlterar com o id da conta escolhida', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    render(
      <SelecionadorConta
        rotulo="Conta"
        contas={[fabricarConta(), fabricarConta({ id: 'conta-2', nome: 'Carteira' })]}
        valor=""
        aoAlterar={aoAlterar}
      />,
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.click(await screen.findByRole('option', { name: /Carteira/ }));

    expect(aoAlterar).toHaveBeenCalledWith('conta-2');
  });

  it('mostra a mensagem de erro quando informada', () => {
    render(
      <SelecionadorConta
        rotulo="Conta"
        contas={[]}
        valor=""
        aoAlterar={vi.fn()}
        erro="Selecione uma conta."
        id="selecionador-conta"
      />,
    );

    expect(screen.getByText('Selecione uma conta.')).toBeTruthy();
    expect(screen.getByRole('combobox').getAttribute('aria-invalid')).toBe('true');
  });
});
