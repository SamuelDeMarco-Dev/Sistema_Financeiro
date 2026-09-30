import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CartaoConta } from './CartaoConta';
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

describe('CartaoConta', () => {
  it('mostra nome, tipo e saldo formatado', () => {
    render(<CartaoConta conta={fabricarConta()} onEditar={vi.fn()} onExcluir={vi.fn()} />);

    expect(screen.getByText('Banco Principal')).toBeTruthy();
    expect(screen.getByText('Conta corrente')).toBeTruthy();
    expect(screen.getByText(/1\.000,00/)).toBeTruthy();
  });

  it('saldo negativo mostra o sinal de menos, nao so a cor (A11Y-01)', () => {
    render(
      <CartaoConta
        conta={fabricarConta({ saldoAtual: '-50.00' })}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
      />,
    );

    expect(screen.getByText(/^-R\$/)).toBeTruthy();
  });

  it('abre o menu de acoes e chama onEditar ao clicar em Editar', async () => {
    const usuario = userEvent.setup();
    const onEditar = vi.fn();
    render(<CartaoConta conta={fabricarConta()} onEditar={onEditar} onExcluir={vi.fn()} />);

    await usuario.click(screen.getByRole('button', { name: 'Ações de Banco Principal' }));
    await usuario.click(await screen.findByText('Editar'));

    expect(onEditar).toHaveBeenCalledTimes(1);
  });

  it('mostra "Arquivar" para conta ativa e "Desarquivar" para conta arquivada', async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(
      <CartaoConta conta={fabricarConta()} onEditar={vi.fn()} onExcluir={vi.fn()} />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Ações de Banco Principal' }));
    expect(await screen.findByText('Arquivar')).toBeTruthy();
    expect(screen.queryByText('Desarquivar')).toBeNull();
    await usuario.keyboard('{Escape}');

    rerender(
      <CartaoConta
        conta={fabricarConta({ arquivada: true })}
        onEditar={vi.fn()}
        onExcluir={vi.fn()}
      />,
    );
    await usuario.click(screen.getByRole('button', { name: 'Ações de Banco Principal' }));
    expect(await screen.findByText('Desarquivar')).toBeTruthy();
  });

  it('nao mostra a alca de arrasto quando `arrasto` nao e informado', () => {
    render(<CartaoConta conta={fabricarConta()} onEditar={vi.fn()} onExcluir={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /Reordenar/ })).toBeNull();
  });
});
