import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SelecionadorEtiquetas } from './SelecionadorEtiquetas';
import * as etiquetaServico from '../servicos/etiqueta.servico';
import type { Etiqueta } from '../tipos/etiqueta';
import type { ReactElement, ReactNode } from 'react';

vi.mock('../servicos/etiqueta.servico');

function Wrapper({ children }: { children: ReactNode }): ReactElement {
  const cliente = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}

function fabricarEtiqueta(sobrescritas: Partial<Etiqueta> = {}): Etiqueta {
  return {
    id: 'etiqueta-1',
    nome: 'viagem-chile',
    cor: '#0EA5E9',
    quantidadeMovimentacoes: 0,
    ...sobrescritas,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SelecionadorEtiquetas', () => {
  it('mostra as etiquetas selecionadas como chips removiveis', () => {
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[fabricarEtiqueta()]}
        valor={['etiqueta-1']}
        aoAlterar={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('viagem-chile')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remover viagem-chile' })).toBeTruthy();
  });

  it('remover o chip chama aoAlterar sem aquele id', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[fabricarEtiqueta(), fabricarEtiqueta({ id: 'etiqueta-2', nome: 'essencial' })]}
        valor={['etiqueta-1', 'etiqueta-2']}
        aoAlterar={aoAlterar}
      />,
      { wrapper: Wrapper },
    );

    await usuario.click(screen.getByRole('button', { name: 'Remover viagem-chile' }));

    expect(aoAlterar).toHaveBeenCalledWith(['etiqueta-2']);
  });

  it('selecionar uma opcao da lista adiciona ao valor', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[fabricarEtiqueta()]}
        valor={[]}
        aoAlterar={aoAlterar}
      />,
      { wrapper: Wrapper },
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.click(screen.getByRole('option', { name: /viagem-chile/ }));

    expect(aoAlterar).toHaveBeenCalledWith(['etiqueta-1']);
  });

  it('clicar numa opcao ja selecionada a remove', async () => {
    const usuario = userEvent.setup();
    const aoAlterar = vi.fn();
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[fabricarEtiqueta()]}
        valor={['etiqueta-1']}
        aoAlterar={aoAlterar}
      />,
      { wrapper: Wrapper },
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.click(screen.getByRole('option', { name: /viagem-chile/ }));

    expect(aoAlterar).toHaveBeenCalledWith([]);
  });

  it('oferece criar uma etiqueta nova quando a busca nao acha correspondencia exata', async () => {
    const usuario = userEvent.setup();
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[fabricarEtiqueta()]}
        valor={[]}
        aoAlterar={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.type(screen.getByLabelText('Buscar ou criar etiqueta'), 'essencial');

    expect(screen.getByText('Criar etiqueta "essencial"')).toBeTruthy();
  });

  it('nao oferece criar quando ja existe uma etiqueta com o mesmo nome', async () => {
    const usuario = userEvent.setup();
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[fabricarEtiqueta({ nome: 'essencial' })]}
        valor={[]}
        aoAlterar={vi.fn()}
      />,
      { wrapper: Wrapper },
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.type(screen.getByLabelText('Buscar ou criar etiqueta'), 'essencial');

    expect(screen.queryByText('Criar etiqueta "essencial"')).toBeNull();
  });

  it('criar uma etiqueta nova a adiciona ao valor selecionado', async () => {
    const usuario = userEvent.setup();
    const novaEtiqueta = fabricarEtiqueta({ id: 'etiqueta-nova', nome: 'essencial' });
    vi.mocked(etiquetaServico.criarEtiqueta).mockResolvedValue(novaEtiqueta);
    const aoAlterar = vi.fn();
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[fabricarEtiqueta()]}
        valor={['etiqueta-1']}
        aoAlterar={aoAlterar}
      />,
      { wrapper: Wrapper },
    );

    await usuario.click(screen.getByRole('combobox'));
    await usuario.type(screen.getByLabelText('Buscar ou criar etiqueta'), 'essencial');
    await usuario.click(screen.getByText('Criar etiqueta "essencial"'));

    await waitFor(() => {
      expect(vi.mocked(etiquetaServico.criarEtiqueta).mock.calls[0]?.[0]).toEqual({
        nome: 'essencial',
      });
    });
    await waitFor(() => {
      expect(aoAlterar).toHaveBeenCalledWith(['etiqueta-1', 'etiqueta-nova']);
    });
  });

  it('impede selecionar mais de 10 etiquetas', async () => {
    const usuario = userEvent.setup();
    const etiquetas = Array.from({ length: 11 }, (_, indice) =>
      fabricarEtiqueta({ id: `etiqueta-${indice}`, nome: `etiqueta-${indice}` }),
    );
    const aoAlterar = vi.fn();
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={etiquetas}
        valor={etiquetas.slice(0, 10).map((etiqueta) => etiqueta.id)}
        aoAlterar={aoAlterar}
      />,
      { wrapper: Wrapper },
    );

    await usuario.click(screen.getByRole('combobox'));

    expect(screen.getByText('Máximo de 10 etiquetas.')).toBeTruthy();
    const opcaoNaoSelecionada = screen.getByRole('option', { name: /etiqueta-10/ });
    expect(opcaoNaoSelecionada.hasAttribute('disabled')).toBe(true);
  });

  it('mostra a mensagem de erro quando informada', () => {
    render(
      <SelecionadorEtiquetas
        rotulo="Etiquetas"
        etiquetas={[]}
        valor={[]}
        aoAlterar={vi.fn()}
        erro="Escolha ao menos uma etiqueta."
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByText('Escolha ao menos uma etiqueta.')).toBeTruthy();
  });
});
