import { useState } from 'react';
import { Botao } from './Botao';
import { Campo } from './Campo';
import { Dialog, DialogConteudo, DialogDescricao, DialogTitulo } from './Dialog';
import type { ReactElement, ReactNode } from 'react';

interface DialogoConfirmacaoProps {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao: ReactNode;
  rotuloConfirmar: string;
  aoConfirmar: () => void;
  carregando?: boolean;
  erro?: string | undefined;
  variante?: 'primaria' | 'perigo';
  /** Quando informado, confirmar só habilita depois de o usuário digitar
   * exatamente este texto — a trava para ações irreversíveis, que um clique
   * distraído não deve conseguir disparar. */
  textoConfirmacao?: string | undefined;
  /** Bloqueia o botão por uma razão externa (ex.: nenhum membro escolhido). */
  confirmarDesabilitado?: boolean;
  /** Conteúdo extra entre a descrição e a confirmação. */
  children?: ReactNode;
}

/** Diálogo de confirmação de ação, proporcional ao risco: um passo de
 * leitura para o reversível, um passo de digitação para o que não volta
 * atrás. Fecha por `Esc` e devolve o foco à origem pelo próprio Radix —
 * quem abriu com o teclado continua de onde estava. */
export function DialogoConfirmacao({
  aberto,
  aoFechar,
  titulo,
  descricao,
  rotuloConfirmar,
  aoConfirmar,
  carregando = false,
  erro,
  variante = 'primaria',
  textoConfirmacao,
  confirmarDesabilitado = false,
  children,
}: DialogoConfirmacaoProps): ReactElement {
  const [digitado, setDigitado] = useState('');

  const confirmacaoPendente =
    textoConfirmacao !== undefined && digitado.trim() !== textoConfirmacao.trim();

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoAberto) => {
        if (!novoAberto) {
          // Radix desmonta o conteudo ao fechar, mas o estado vive aqui
          // fora: sem limpar, reabrir o dialogo traria a confirmacao ja
          // digitada da tentativa anterior — e um passo de seguranca
          // pre-preenchido nao e' um passo de seguranca.
          setDigitado('');
          aoFechar();
        }
      }}
    >
      <DialogConteudo>
        <DialogTitulo>{titulo}</DialogTitulo>
        <DialogDescricao className="mt-2">{descricao}</DialogDescricao>

        {children ? <div className="mt-4">{children}</div> : null}

        {textoConfirmacao !== undefined ? (
          <div className="mt-4">
            <Campo
              rotulo={`Digite “${textoConfirmacao}” para confirmar`}
              value={digitado}
              autoComplete="off"
              onChange={(evento) => {
                setDigitado(evento.target.value);
              }}
            />
          </div>
        ) : null}

        {erro ? (
          <p
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-md bg-perigo/10 p-3 text-sm text-perigo"
          >
            {erro}
          </p>
        ) : null}

        <div className="sm:flex-row sm:justify-end mt-6 flex flex-col-reverse gap-2">
          <Botao variante="secundaria" onClick={aoFechar} disabled={carregando}>
            Cancelar
          </Botao>
          <Botao
            variante={variante}
            carregando={carregando}
            disabled={carregando || confirmacaoPendente || confirmarDesabilitado}
            onClick={aoConfirmar}
          >
            {rotuloConfirmar}
          </Botao>
        </div>
      </DialogConteudo>
    </Dialog>
  );
}
