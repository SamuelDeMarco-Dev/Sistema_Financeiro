import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Botao } from './Botao';
import { DialogoConfirmacao } from './DialogoConfirmacao';
import type { ReactElement } from 'react';

/** Envolve o dialogo num gatilho real: sem um elemento focado antes da
 * abertura nao ha "origem" para o foco voltar, e o teste de devolucao de
 * foco nao provaria nada. */
function ComGatilho({ aoConfirmar = vi.fn() }: { aoConfirmar?: () => void }): ReactElement {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Botao
        onClick={() => {
          setAberto(true);
        }}
      >
        Abrir
      </Botao>
      <DialogoConfirmacao
        aberto={aberto}
        aoFechar={() => {
          setAberto(false);
        }}
        titulo="Remover membro"
        descricao="Os lançamentos permanecem no grupo."
        rotuloConfirmar="Remover"
        aoConfirmar={aoConfirmar}
      />
    </>
  );
}

describe('DialogoConfirmacao', () => {
  it('mostra titulo e descricao e liga a descricao ao dialogo', async () => {
    const usuario = userEvent.setup();
    render(<ComGatilho />);
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));

    const dialogo = screen.getByRole('dialog');
    expect(screen.getByRole('heading', { name: 'Remover membro' })).toBeTruthy();
    expect(dialogo.getAttribute('aria-describedby')).toBeTruthy();
    expect(screen.getByText('Os lançamentos permanecem no grupo.')).toBeTruthy();
  });

  it('fecha com Esc e devolve o foco a origem', async () => {
    const usuario = userEvent.setup();
    render(<ComGatilho />);
    const gatilho = screen.getByRole('button', { name: 'Abrir' });

    // Abre pelo teclado: e' o caso em que a devolucao do foco importa de
    // fato — quem navega por Tab precisa voltar para onde estava, nao para
    // o topo da pagina.
    await usuario.tab();
    expect(document.activeElement).toBe(gatilho);
    await usuario.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeTruthy();

    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    // A devolucao do foco acontece depois da desmontagem, num tique
    // seguinte — por isso `waitFor` e nao uma assercao direta.
    await waitFor(() => {
      expect(document.activeElement).toBe(gatilho);
    });
  });

  it('confirmar dispara a acao', async () => {
    const usuario = userEvent.setup();
    const aoConfirmar = vi.fn();
    render(<ComGatilho aoConfirmar={aoConfirmar} />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));
    await usuario.click(screen.getByRole('button', { name: 'Remover' }));

    expect(aoConfirmar).toHaveBeenCalledOnce();
  });

  it('cancelar fecha sem confirmar', async () => {
    const usuario = userEvent.setup();
    const aoConfirmar = vi.fn();
    render(<ComGatilho aoConfirmar={aoConfirmar} />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(aoConfirmar).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('com texto de confirmacao, o botao so libera com o texto exato', async () => {
    const usuario = userEvent.setup();
    const aoConfirmar = vi.fn();
    render(
      <DialogoConfirmacao
        aberto
        aoFechar={vi.fn()}
        titulo="Excluir Casa"
        descricao="Sem volta."
        rotuloConfirmar="Excluir grupo"
        textoConfirmacao="Casa"
        aoConfirmar={aoConfirmar}
      />,
    );

    const confirmar = screen.getByRole('button', { name: 'Excluir grupo' });
    expect(confirmar.hasAttribute('disabled')).toBe(true);

    const campo = screen.getByLabelText(/Digite/);
    await usuario.type(campo, 'Cas');
    expect(confirmar.hasAttribute('disabled')).toBe(true);

    await usuario.type(campo, 'a');
    expect(confirmar.hasAttribute('disabled')).toBe(false);

    await usuario.click(confirmar);
    expect(aoConfirmar).toHaveBeenCalledOnce();
  });

  it('reabrir limpa a confirmacao digitada', async () => {
    const usuario = userEvent.setup();

    function ComTrava(): ReactElement {
      const [aberto, setAberto] = useState(true);
      return (
        <>
          <Botao
            onClick={() => {
              setAberto(true);
            }}
          >
            Abrir
          </Botao>
          <DialogoConfirmacao
            aberto={aberto}
            aoFechar={() => {
              setAberto(false);
            }}
            titulo="Excluir Casa"
            descricao="Sem volta."
            rotuloConfirmar="Excluir grupo"
            textoConfirmacao="Casa"
            aoConfirmar={vi.fn()}
          />
        </>
      );
    }

    render(<ComTrava />);
    await usuario.type(screen.getByLabelText(/Digite/), 'Casa');
    expect(screen.getByRole('button', { name: 'Excluir grupo' }).hasAttribute('disabled')).toBe(
      false,
    );

    await usuario.keyboard('{Escape}');
    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByLabelText(/Digite/)).toHaveProperty('value', '');
    expect(screen.getByRole('button', { name: 'Excluir grupo' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('erro aparece como alerta', () => {
    render(
      <DialogoConfirmacao
        aberto
        aoFechar={vi.fn()}
        titulo="Sair"
        descricao="Adeus."
        rotuloConfirmar="Sair"
        erro="Você administra este grupo."
        aoConfirmar={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert').textContent).toContain('Você administra este grupo.');
  });

  it('bloqueia a confirmacao quando o chamador pede', () => {
    render(
      <DialogoConfirmacao
        aberto
        aoFechar={vi.fn()}
        titulo="Transferir"
        descricao="Escolha alguém."
        rotuloConfirmar="Transferir"
        confirmarDesabilitado
        aoConfirmar={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Transferir' }).hasAttribute('disabled')).toBe(true);
  });
});
