import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Botao } from '@/componentes/ui/Botao';
import { Popover, PopoverConteudo, PopoverGatilho } from '@/componentes/ui/Popover';
import { cn } from '@/utilitarios/cn';
import {
  DIAS_SEMANA_ABREV,
  formatarDataBr,
  gerarGradeMes,
  hojeNoTimezone,
  nomeMesAno,
  paraIsoDeBr,
  somarDias,
} from '@/utilitarios/data';
import type { ChangeEvent, KeyboardEvent, ReactElement } from 'react';

interface CampoDataProps {
  rotulo: string;
  valor: string | null;
  aoAlterar: (dataIso: string | null) => void;
  timezone: string;
  erro?: string | undefined;
  id?: string;
}

function mesDeReferencia(valor: string | null, timezone: string): { ano: number; mes: number } {
  const iso = valor ?? hojeNoTimezone(timezone);
  const [ano = 0, mes = 0] = iso.split('-').map(Number);
  return { ano, mes };
}

/** RF-13/RNF-25: "hoje" e "ontem" usam o timezone do perfil, nao o do
 * navegador (ver `utilitarios/data.ts`). O calendario segue o padrao
 * WAI-ARIA de grid navegavel por teclado (setas movem o foco entre dias,
 * PageUp/PageDown trocam de mes). */
export function CampoData({
  rotulo,
  valor,
  aoAlterar,
  timezone,
  erro,
  id,
}: CampoDataProps): ReactElement {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;

  const [texto, setTexto] = useState(() => (valor ? formatarDataBr(valor) : ''));
  const [valorTextoSincronizado, setValorTextoSincronizado] = useState(valor);
  const [aberto, setAberto] = useState(false);
  const [referencia, setReferencia] = useState(() => mesDeReferencia(valor, timezone));
  const [diaComFoco, setDiaComFoco] = useState(() => valor ?? hojeNoTimezone(timezone));
  const grideRef = useRef<HTMLDivElement>(null);

  // Ajuste de estado durante a renderizacao (nao num efeito): quando `valor`
  // muda por uma via externa (calendario, atalhos, reset do formulario), o
  // texto exibido precisa acompanhar; durante a digitacao, porem, `valor` so
  // muda quando NOS chamamos aoAlterar, entao nao ha conflito.
  if (valor !== valorTextoSincronizado) {
    setValorTextoSincronizado(valor);
    setTexto(valor ? formatarDataBr(valor) : '');
  }

  // Move o foco real do DOM para o dia corrente sempre que a navegacao por
  // teclado troca de dia/mes — so quando o foco ja esta dentro da grade,
  // para nao roubar o foco quando o calendario apenas abre ou quando o
  // usuario esta interagindo com outro elemento (ex.: os atalhos "Hoje").
  useEffect(() => {
    const grade = grideRef.current;
    if (!grade?.contains(document.activeElement)) return;
    document.getElementById(`dia-calendario-${diaComFoco}`)?.focus();
  }, [diaComFoco, referencia]);

  function abrirNoValorAtual(): void {
    setReferencia(mesDeReferencia(valor, timezone));
    setDiaComFoco(valor ?? hojeNoTimezone(timezone));
    setAberto(true);
  }

  function aoDigitar(evento: ChangeEvent<HTMLInputElement>): void {
    const digitos = evento.target.value.replace(/\D/g, '').slice(0, 8);
    const partes = [digitos.slice(0, 2), digitos.slice(2, 4), digitos.slice(4, 8)].filter(
      (parte) => parte !== '',
    );
    setTexto(partes.join('/'));

    if (digitos.length === 0) {
      aoAlterar(null);
      return;
    }
    if (digitos.length === 8) {
      const iso = paraIsoDeBr(partes.join('/'));
      if (iso) aoAlterar(iso);
    }
  }

  function selecionar(iso: string): void {
    aoAlterar(iso);
    setAberto(false);
  }

  function mudarMesEFoco(delta: number): void {
    const dataReferencia = new Date(Date.UTC(referencia.ano, referencia.mes - 1, 1));
    const [, , diaAtual = 1] = diaComFoco.split('-').map(Number);
    const novaData = new Date(
      Date.UTC(dataReferencia.getUTCFullYear(), dataReferencia.getUTCMonth() + delta, 1),
    );
    const novoAno = novaData.getUTCFullYear();
    const novoMes = novaData.getUTCMonth() + 1;
    const ultimoDiaNovoMes = new Date(Date.UTC(novoAno, novoMes, 0)).getUTCDate();
    const diaClampado = Math.min(diaAtual, ultimoDiaNovoMes);

    setReferencia({ ano: novoAno, mes: novoMes });
    setDiaComFoco(
      `${String(novoAno).padStart(4, '0')}-${String(novoMes).padStart(2, '0')}-${String(diaClampado).padStart(2, '0')}`,
    );
  }

  function aoTecladoNaGrade(evento: KeyboardEvent<HTMLDivElement>): void {
    const deltas: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: 7,
      ArrowUp: -7,
    };
    const delta = deltas[evento.key];
    if (delta !== undefined) {
      evento.preventDefault();
      const novoDia = somarDias(diaComFoco, delta);
      setDiaComFoco(novoDia);
      const [ano = 0, mes = 0] = novoDia.split('-').map(Number);
      setReferencia({ ano, mes });
      return;
    }
    if (evento.key === 'PageDown') {
      evento.preventDefault();
      mudarMesEFoco(evento.shiftKey ? 12 : 1);
      return;
    }
    if (evento.key === 'PageUp') {
      evento.preventDefault();
      mudarMesEFoco(evento.shiftKey ? -12 : -1);
      return;
    }
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      selecionar(diaComFoco);
    }
  }

  const grade = gerarGradeMes(referencia.ano, referencia.mes);
  const hoje = hojeNoTimezone(timezone);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <Popover
        open={aberto}
        onOpenChange={(novoAberto) => {
          if (novoAberto) abrirNoValorAtual();
          else setAberto(false);
        }}
      >
        <div className="flex items-stretch gap-2">
          <input
            id={idCampo}
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            value={texto}
            onChange={aoDigitar}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            className={cn(
              'min-h-[44px] flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-texto',
              'placeholder:text-textoSuave',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
              erro && 'border-perigo',
            )}
          />
          <PopoverGatilho asChild>
            <button
              type="button"
              aria-label="Abrir calendario"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-borda bg-superficie text-textoSuave hover:bg-borda focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
            >
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </button>
          </PopoverGatilho>
        </div>

        <PopoverConteudo
          align="end"
          className="w-72"
          onOpenAutoFocus={(evento) => {
            evento.preventDefault();
            document.getElementById(`dia-calendario-${diaComFoco}`)?.focus();
          }}
        >
          <div className="mb-2 flex gap-2">
            <Botao
              variante="secundaria"
              className="min-h-0 flex-1 py-1.5 text-xs"
              onClick={() => {
                selecionar(hoje);
              }}
            >
              Hoje
            </Botao>
            <Botao
              variante="secundaria"
              className="min-h-0 flex-1 py-1.5 text-xs"
              onClick={() => {
                selecionar(somarDias(hoje, -1));
              }}
            >
              Ontem
            </Botao>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={() => {
                mudarMesEFoco(-1);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-textoSuave hover:bg-borda"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="text-sm font-medium text-texto">
              {nomeMesAno(referencia.ano, referencia.mes)}
            </span>
            <button
              type="button"
              aria-label="Proximo mes"
              onClick={() => {
                mudarMesEFoco(1);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-md text-textoSuave hover:bg-borda"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div
            ref={grideRef}
            role="grid"
            tabIndex={-1}
            aria-label={nomeMesAno(referencia.ano, referencia.mes)}
            onKeyDown={aoTecladoNaGrade}
          >
            <div role="row" className="grid grid-cols-7">
              {DIAS_SEMANA_ABREV.map((abreviacao) => (
                <span
                  key={abreviacao}
                  role="columnheader"
                  aria-hidden="true"
                  className="flex h-8 items-center justify-center text-xs font-medium text-textoSuave"
                >
                  {abreviacao}
                </span>
              ))}
            </div>
            {grade.map((semana) => (
              <div role="row" key={semana[0]?.iso} className="grid grid-cols-7">
                {semana.map((dia) => {
                  const selecionado = dia.iso === valor;
                  const comFoco = dia.iso === diaComFoco;
                  return (
                    <div key={dia.iso} role="gridcell" aria-selected={selecionado}>
                      <button
                        type="button"
                        id={`dia-calendario-${dia.iso}`}
                        tabIndex={comFoco ? 0 : -1}
                        aria-current={dia.iso === hoje ? 'date' : undefined}
                        onFocus={() => {
                          setDiaComFoco(dia.iso);
                        }}
                        onClick={() => {
                          selecionar(dia.iso);
                        }}
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-md text-sm',
                          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                          dia.foraDoMes && 'text-textoSuave/50',
                          !dia.foraDoMes && !selecionado && 'text-texto hover:bg-borda',
                          selecionado && 'bg-primaria text-fundo',
                          dia.iso === hoje && !selecionado && 'font-semibold text-primaria',
                        )}
                      >
                        {dia.dia}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </PopoverConteudo>
      </Popover>
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
