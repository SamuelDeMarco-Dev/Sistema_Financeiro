import { Plus, Search, X } from 'lucide-react';
import { useId, useState } from 'react';
import { Popover, PopoverConteudo, PopoverGatilho } from '@/componentes/ui/Popover';
import { cn } from '@/utilitarios/cn';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { useCriarEtiqueta } from '../hooks/useCriarEtiqueta';
import type { Etiqueta } from '../tipos/etiqueta';
import type { ChangeEvent, ReactElement } from 'react';

const MAXIMO_ETIQUETAS = 10;

interface SelecionadorEtiquetasProps {
  rotulo: string;
  etiquetas: Etiqueta[];
  valor: string[];
  aoAlterar: (etiquetaIds: string[]) => void;
  erro?: string | undefined;
  id?: string;
}

/** #30: multi-selecao de etiquetas com criacao inline (04-API.md §11.2 —
 * nome normalizado para minusculas pelo backend, entao enviamos o termo
 * digitado como veio). O limite de 10 espelha a validacao de
 * `movimentacaoSchema.etiquetaIds` (04-API.md §12, ainda nao implementada
 * nesta milestone) — impor no cliente evita uma viagem de rede so para
 * descobrir o limite. */
export function SelecionadorEtiquetas({
  rotulo,
  etiquetas,
  valor,
  aoAlterar,
  erro,
  id,
}: SelecionadorEtiquetasProps): ReactElement {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;
  const idBusca = `${idCampo}-busca`;

  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const criar = useCriarEtiqueta();

  const selecionadas = etiquetas.filter((etiqueta) => valor.includes(etiqueta.id));
  const noLimite = valor.length >= MAXIMO_ETIQUETAS;

  const termo = busca.trim().toLowerCase();
  const etiquetasFiltradas =
    termo === ''
      ? etiquetas
      : etiquetas.filter((etiqueta) => etiqueta.nome.toLowerCase().includes(termo));
  const existeExata = etiquetas.some((etiqueta) => etiqueta.nome.toLowerCase() === termo);
  const podeCriar = termo !== '' && !existeExata && !noLimite;

  function alternar(etiquetaId: string): void {
    if (valor.includes(etiquetaId)) {
      aoAlterar(valor.filter((id_) => id_ !== etiquetaId));
      return;
    }
    if (noLimite) return;
    aoAlterar([...valor, etiquetaId]);
  }

  function remover(etiquetaId: string): void {
    aoAlterar(valor.filter((id_) => id_ !== etiquetaId));
  }

  function aoCriar(): void {
    criar.mutate(
      { nome: busca.trim() },
      {
        onSuccess: (novaEtiqueta) => {
          aoAlterar([...valor, novaEtiqueta.id]);
          setBusca('');
        },
      },
    );
  }

  function aoBuscar(evento: ChangeEvent<HTMLInputElement>): void {
    setBusca(evento.target.value);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-texto" id={`${idCampo}-rotulo`}>
        {rotulo}
      </span>
      <div
        className={cn(
          'flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-md border border-borda bg-superficie p-1.5',
          erro && 'border-perigo',
        )}
        aria-describedby={erro ? idErro : undefined}
      >
        {selecionadas.map((etiqueta) => (
          <span
            key={etiqueta.id}
            className="flex items-center gap-1 rounded-full bg-borda px-2 py-1 text-xs text-texto"
          >
            {etiqueta.nome}
            <button
              type="button"
              aria-label={`Remover ${etiqueta.nome}`}
              onClick={() => {
                remover(etiqueta.id);
              }}
              className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-fundo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}

        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverGatilho asChild>
            <button
              type="button"
              id={idCampo}
              role="combobox"
              aria-labelledby={`${idCampo}-rotulo`}
              aria-expanded={aberto}
              aria-controls={`${idCampo}-lista`}
              aria-invalid={erro ? true : undefined}
              className="flex min-h-[32px] items-center gap-1 rounded-full px-2 py-1 text-xs text-textoSuave hover:bg-borda focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Adicionar
            </button>
          </PopoverGatilho>

          <PopoverConteudo align="start" className="w-64 p-2">
            <div className="relative mb-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textoSuave"
                aria-hidden="true"
              />
              <label htmlFor={idBusca} className="sr-only">
                Buscar ou criar etiqueta
              </label>
              <input
                id={idBusca}
                type="search"
                value={busca}
                maxLength={40}
                placeholder="Buscar ou criar etiqueta..."
                onChange={aoBuscar}
                className="w-full rounded-md border border-borda bg-superficie py-2 pl-9 pr-3 text-texto placeholder:text-textoSuave focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
              />
            </div>

            {noLimite ? (
              <p className="px-2 py-1 text-xs text-textoSuave">
                Máximo de {MAXIMO_ETIQUETAS} etiquetas.
              </p>
            ) : null}
            {criar.error ? (
              <p role="alert" aria-live="polite" className="px-2 py-1 text-xs text-perigo">
                {traduzirErroApi(criar.error)}
              </p>
            ) : null}

            <div
              id={`${idCampo}-lista`}
              role="listbox"
              aria-multiselectable="true"
              aria-label={rotulo}
              className="max-h-48 overflow-y-auto"
            >
              {etiquetasFiltradas.map((etiqueta) => {
                const selecionada = valor.includes(etiqueta.id);
                return (
                  <button
                    key={etiqueta.id}
                    type="button"
                    role="option"
                    aria-selected={selecionada}
                    disabled={!selecionada && noLimite}
                    onClick={() => {
                      alternar(etiqueta.id);
                    }}
                    className={cn(
                      'flex min-h-[44px] w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-borda',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                      selecionada && 'bg-primaria/10',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: etiqueta.cor }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{etiqueta.nome}</span>
                  </button>
                );
              })}
              {podeCriar ? (
                <button
                  type="button"
                  onClick={aoCriar}
                  disabled={criar.isPending}
                  className="flex min-h-[44px] w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-primaria hover:bg-borda disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    Criar etiqueta &quot;{busca.trim()}&quot;
                  </span>
                </button>
              ) : null}
              {etiquetasFiltradas.length === 0 && !podeCriar ? (
                <p className="px-2 py-2 text-sm text-textoSuave">Nenhuma etiqueta encontrada.</p>
              ) : null}
            </div>
          </PopoverConteudo>
        </Popover>
      </div>
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
