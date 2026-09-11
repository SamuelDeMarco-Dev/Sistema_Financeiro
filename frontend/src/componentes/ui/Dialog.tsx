import * as DialogPrimitivo from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/utilitarios/cn';
import { ultimoFocoFora } from '@/utilitarios/historico-foco';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

export const Dialog = DialogPrimitivo.Root;
export const DialogGatilho = DialogPrimitivo.Trigger;

export function DialogConteudo({
  className,
  children,
  onCloseAutoFocus,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitivo.Content>): ReactElement {
  // Ao fechar, o Radix devolve o foco ao `Dialog.Trigger`. Os dialogos deste
  // projeto sao controlados por estado (`open={...}`), sem Trigger, e nesse
  // caso o foco cairia no `body` — quem abriu o dialogo pelo teclado
  // perderia o lugar e teria de tabular a pagina inteira de novo.
  //
  // A origem sai do historico global de foco, e nao de uma captura no
  // instante da abertura: um dialogo aberto por item de menu monta quando o
  // elemento ativo ja e' o item do menu — que sai do DOM junto com ele. O
  // historico guarda os anteriores, e o primeiro que ainda esteja no
  // documento e' o destino honesto. Medido no navegador: sem isto, o foco
  // terminava no `body`.
  const conteudoRef = useRef<HTMLDivElement | null>(null);

  return (
    <DialogPrimitivo.Portal>
      <DialogPrimitivo.Overlay className="fixed inset-0 z-40 bg-texto/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitivo.Content
        ref={conteudoRef}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-borda bg-fundo p-6 shadow-lg',
          'focus:outline-none',
          className,
        )}
        onCloseAutoFocus={(evento) => {
          onCloseAutoFocus?.(evento);
          if (evento.defaultPrevented) return;

          const origem = ultimoFocoFora(conteudoRef.current);
          if (origem) {
            evento.preventDefault();
            origem.focus();
          }
        }}
        {...props}
      >
        {children}
        <DialogPrimitivo.Close
          aria-label="Fechar"
          className="absolute right-4 top-4 rounded-md p-1 text-textoSuave transition-colors hover:bg-borda hover:text-texto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </DialogPrimitivo.Close>
      </DialogPrimitivo.Content>
    </DialogPrimitivo.Portal>
  );
}

export function DialogTitulo({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitivo.Title>): ReactElement {
  return (
    <DialogPrimitivo.Title
      className={cn('text-lg font-semibold text-texto', className)}
      {...props}
    />
  );
}

export function DialogDescricao({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitivo.Description>): ReactElement {
  return (
    <DialogPrimitivo.Description className={cn('text-sm text-textoSuave', className)} {...props} />
  );
}

export const DialogFechar = DialogPrimitivo.Close;
