import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CampoSenha } from './CampoSenha';

describe('CampoSenha', () => {
  it('comeca oculto e alterna para texto visivel ao clicar em Mostrar/Ocultar', () => {
    render(<CampoSenha rotulo="Senha" defaultValue="SenhaForte@2026" readOnly />);

    const campo = screen.getByLabelText<HTMLInputElement>('Senha');
    expect(campo.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar' }));
    expect(campo.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar' }));
    expect(campo.type).toBe('password');
  });

  it('associa a mensagem de erro ao campo via aria-describedby', () => {
    render(<CampoSenha rotulo="Senha" erro="Senha muito curta." />);

    const campo = screen.getByLabelText('Senha');
    expect(campo.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Senha muito curta.');
  });
});
