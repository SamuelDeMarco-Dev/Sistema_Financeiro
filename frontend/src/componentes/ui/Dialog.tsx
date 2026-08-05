import * as DialogPrimitivo from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utilitarios/cn';
import type { ComponentPropsWithoutRef, ReactElement } from 'react';

export const Dialog = DialogPrimitivo.Root;
export const DialogGatilho = DialogPrimitivo.Trigger;

export function DialogConteudo({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitivo.Content>): ReactElement {
  return (
    <DialogPrimitivo.Portal>
      <DialogPrimitivo.Overlay className="fixed inset-0 z-40 bg-texto/40 data-[state=open]:animate-in data-[state=open]:fade-in" />
      <DialogPrimitivo.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-borda bg-fundo p-6 shadow-lg',
          'focus:outline-none',
          className,
        )}
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
