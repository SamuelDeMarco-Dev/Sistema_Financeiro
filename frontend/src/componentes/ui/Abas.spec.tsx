import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Abas, PainelAba } from './Abas';

const ABAS = [
  { id: 'uma', rotulo: 'Uma' },
  { id: 'duas', rotulo: 'Duas' },
  { id: 'tres', rotulo: 'Três' },
];

describe('Abas', () => {
  it('marca só a aba ativa como selecionada', () => {
    render(<Abas abas={ABAS} abaAtiva="duas" aoAlterar={vi.fn()} rotuloLista="Exemplo" />);

    expect(screen.getByRole('tab', { name: 'Duas' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Uma' }).getAttribute('aria-selected')).toBe('false');
  });

  it('só a aba ativa fica na ordem de tabulação (padrão ARIA)', () => {
    render(<Abas abas={ABAS} abaAtiva="duas" aoAlterar={vi.fn()} rotuloLista="Exemplo" />);

    expect(screen.getByRole('tab', { name: 'Duas' }).getAttribute('tabindex')).toBe('0');
    expect(screen.getByRole('tab', { name: 'Uma' }).getAttribute('tabindex')).toBe('-1');
  });

  it('clique avisa quem chama', () => {
    const aoAlterar = vi.fn();
    render(<Abas abas={ABAS} abaAtiva="uma" aoAlterar={aoAlterar} rotuloLista="Exemplo" />);

    fireEvent.click(screen.getByRole('tab', { name: 'Três' }));

    expect(aoAlterar).toHaveBeenCalledWith('tres');
  });

  it('seta direita avança e circula no fim', () => {
    const aoAlterar = vi.fn();
    render(<Abas abas={ABAS} abaAtiva="tres" aoAlterar={aoAlterar} rotuloLista="Exemplo" />);

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });

    expect(aoAlterar).toHaveBeenCalledWith('uma');
  });

  it('seta esquerda retrocede e circula no começo', () => {
    const aoAlterar = vi.fn();
    render(<Abas abas={ABAS} abaAtiva="uma" aoAlterar={aoAlterar} rotuloLista="Exemplo" />);

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' });

    expect(aoAlterar).toHaveBeenCalledWith('tres');
  });

  it('Home e End vão para a primeira e a última', () => {
    const aoAlterar = vi.fn();
    render(<Abas abas={ABAS} abaAtiva="duas" aoAlterar={aoAlterar} rotuloLista="Exemplo" />);
    const lista = screen.getByRole('tablist');

    fireEvent.keyDown(lista, { key: 'Home' });
    expect(aoAlterar).toHaveBeenCalledWith('uma');

    fireEvent.keyDown(lista, { key: 'End' });
    expect(aoAlterar).toHaveBeenCalledWith('tres');
  });

  it('tecla sem significado não muda de aba', () => {
    const aoAlterar = vi.fn();
    render(<Abas abas={ABAS} abaAtiva="duas" aoAlterar={aoAlterar} rotuloLista="Exemplo" />);

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'a' });

    expect(aoAlterar).not.toHaveBeenCalled();
  });

  it('o prefixo liga aba e painel, para dois conjuntos não colidirem', () => {
    render(
      <>
        <Abas abas={ABAS} abaAtiva="uma" aoAlterar={vi.fn()} rotuloLista="Exemplo" prefixo="alfa" />
        <PainelAba id="uma" abaAtiva="uma" prefixo="alfa">
          conteudo
        </PainelAba>
      </>,
    );

    const aba = screen.getByRole('tab', { name: 'Uma' });
    const painel = screen.getByRole('tabpanel');
    expect(aba.getAttribute('aria-controls')).toBe(painel.getAttribute('id'));
    expect(painel.getAttribute('aria-labelledby')).toBe(aba.getAttribute('id'));
  });
});

describe('PainelAba', () => {
  it('monta o conteúdo só quando a aba está ativa', () => {
    const { rerender } = render(
      <PainelAba id="uma" abaAtiva="duas">
        conteudo secreto
      </PainelAba>,
    );

    expect(screen.queryByText('conteudo secreto')).toBeNull();

    rerender(
      <PainelAba id="uma" abaAtiva="uma">
        conteudo secreto
      </PainelAba>,
    );

    expect(screen.getByText('conteudo secreto')).toBeTruthy();
  });
});
