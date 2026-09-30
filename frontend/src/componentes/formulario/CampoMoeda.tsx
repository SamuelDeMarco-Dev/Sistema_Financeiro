import { useId, useRef } from 'react';
import { cn } from '@/utilitarios/cn';
import { deCentavos, paraCentavos } from '@/utilitarios/dinheiro';
import { formatarMoeda } from '@/utilitarios/formatadores';
import type { ChangeEvent, FocusEvent, MouseEvent, ReactElement } from 'react';

interface CampoMoedaProps {
  rotulo: string;
  valor: string;
  aoAlterar: (valorApi: string) => void;
  erro?: string | undefined;
  id?: string;
  moeda?: string;
  permiteNegativo?: boolean;
}

/** Mascara de moeda pt-BR: cada digito digitado empurra os anteriores para
 * a esquerda, como numa maquina de calcular — "1" "2" "3" "4" "5" produz
 * "1,23" -> "12,34" -> "123,45", nunca um ponto/virgula decimal digitavel
 * diretamente (por isso ">2 casas decimais" e "valor nao numerico" sao
 * impossiveis por construcao, nao por validacao a posteriori). O sinal (se
 * `permiteNegativo`) e alternado por um botao dedicado, nunca pela tecla
 * "-", para nao criar ambiguidade sobre a posicao do sinal no meio da
 * digitacao. */
export function CampoMoeda({
  rotulo,
  valor,
  aoAlterar,
  erro,
  id,
  moeda = 'BRL',
  permiteNegativo = false,
}: CampoMoedaProps): ReactElement {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idErro = `${idCampo}-erro`;
  const referenciaInput = useRef<HTMLInputElement>(null);

  const centavos = paraCentavos(valor);
  const exibicao = formatarMoeda(valor, moeda);

  function moverCursorParaOFinal(
    evento: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>,
  ): void {
    const tamanho = evento.currentTarget.value.length;
    evento.currentTarget.setSelectionRange(tamanho, tamanho);
  }

  function aoAlterarValor(evento: ChangeEvent<HTMLInputElement>): void {
    const digitos = evento.target.value.replace(/\D/g, '');
    // Limite de 12 digitos inteiros + 2 decimais — alem disso o valor deixa
    // de ser um centavo financeiro plausivel.
    const magnitude = digitos === '' ? 0 : Number(digitos.slice(-14));
    const novosCentavos = centavos < 0 ? -magnitude : magnitude;
    aoAlterar(deCentavos(novosCentavos));
  }

  function alternarSinal(): void {
    aoAlterar(deCentavos(-centavos));
    referenciaInput.current?.focus();
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <div className="flex items-stretch gap-2">
        {permiteNegativo ? (
          <button
            type="button"
            onClick={alternarSinal}
            aria-label={
              centavos < 0
                ? 'Valor negativo — alternar para positivo'
                : 'Valor positivo — alternar para negativo'
            }
            aria-pressed={centavos < 0}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-borda bg-superficie text-lg font-semibold text-texto hover:bg-borda focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
          >
            {centavos < 0 ? '−' : '+'}
          </button>
        ) : null}
        <input
          ref={referenciaInput}
          id={idCampo}
          type="text"
          inputMode="numeric"
          value={exibicao}
          onChange={aoAlterarValor}
          onFocus={moverCursorParaOFinal}
          onClick={moverCursorParaOFinal}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          className={cn(
            'min-h-[44px] flex-1 rounded-md border border-borda bg-superficie px-3 py-2 text-right text-texto',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
            erro && 'border-perigo',
          )}
        />
      </div>
      {erro ? (
        <p id={idErro} role="alert" aria-live="polite" className="text-sm text-perigo">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
