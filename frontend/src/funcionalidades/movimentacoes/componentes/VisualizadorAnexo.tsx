import { Carregando } from '@/componentes/feedback';
import { Dialog, DialogConteudo, DialogTitulo } from '@/componentes/ui/Dialog';
import { useConteudoAnexo } from '../hooks/useConteudoAnexo';
import type { AnexoResumo } from '../tipos/movimentacao';
import type { ReactElement } from 'react';

interface VisualizadorAnexoProps {
  anexo: AnexoResumo | null;
  aoFechar: () => void;
}

/** RF-32: imagem inline, PDF em `iframe` — o Dialog do Radix já fecha por
 * Esc (`DialogPrimitivo.Content` trata a tecla nativamente), então não há
 * handler próprio a escrever aqui. */
export function VisualizadorAnexo({ anexo, aoFechar }: VisualizadorAnexoProps): ReactElement {
  const { blobUrl, carregando, erro } = useConteudoAnexo(anexo?.url ?? null);
  const ehImagem = anexo?.tipoMime.startsWith('image/') ?? false;
  const ehPdf = anexo?.tipoMime === 'application/pdf';

  return (
    <Dialog
      open={anexo !== null}
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar();
      }}
    >
      <DialogConteudo aria-describedby={undefined} className="max-w-3xl">
        <DialogTitulo>{anexo?.nomeOriginal ?? 'Anexo'}</DialogTitulo>

        <div className="mt-4 flex min-h-[50vh] items-center justify-center">
          {carregando ? <Carregando /> : null}
          {erro ? (
            <p role="alert" className="text-sm text-perigo">
              Não foi possível carregar o anexo.
            </p>
          ) : null}
          {!carregando && !erro && blobUrl && ehImagem ? (
            <img
              src={blobUrl}
              alt={anexo?.nomeOriginal ?? 'Anexo'}
              className="max-h-[70vh] w-auto max-w-full object-contain"
            />
          ) : null}
          {!carregando && !erro && blobUrl && ehPdf ? (
            <iframe
              src={blobUrl}
              title={anexo.nomeOriginal}
              className="h-[70vh] w-full rounded-md border border-borda"
            />
          ) : null}
        </div>
      </DialogConteudo>
    </Dialog>
  );
}
