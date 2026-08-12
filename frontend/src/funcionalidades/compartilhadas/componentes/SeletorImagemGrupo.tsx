import { useEffect, useMemo, useRef, useState } from 'react';
import { notificar } from '@/componentes/feedback';
import { RecorteImagem } from '@/componentes/formulario/RecorteImagem';
import { Botao } from '@/componentes/ui/Botao';
import { ImagemGrupo } from './ImagemGrupo';
import type { ChangeEvent, ReactElement } from 'react';

interface SeletorImagemGrupoProps {
  nome: string;
  cor: string;
  /** Recorte ja confirmado, ou `null` enquanto nao houver imagem. */
  imagem: Blob | null;
  aoAlterar: (imagem: Blob | null) => void;
}

const TAMANHO_MAXIMO_MB = 2;

/** O grupo so existe depois de `POST /contas-compartilhadas`, e a imagem
 * vai numa segunda requisicao — entao aqui o recorte fica retido em
 * memoria e a pre-visualizacao sai de um object URL local, sem upload
 * algum antes de o formulario ser submetido. */
export function SeletorImagemGrupo({
  nome,
  cor,
  imagem,
  aoAlterar,
}: SeletorImagemGrupoProps): ReactElement {
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  const urlPrevia = useMemo(() => (imagem ? URL.createObjectURL(imagem) : null), [imagem]);

  useEffect(() => {
    return () => {
      if (urlPrevia) URL.revokeObjectURL(urlPrevia);
    };
  }, [urlPrevia]);

  function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>): void {
    const arquivo = evento.target.files?.[0];
    // Zerar o input permite reescolher o MESMO arquivo depois de cancelar —
    // sem isto o `change` nao dispara na segunda vez.
    evento.target.value = '';
    if (!arquivo) return;

    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      notificar.erro(`A imagem deve ter no máximo ${TAMANHO_MAXIMO_MB} MB.`);
      return;
    }
    setArquivoSelecionado(arquivo);
  }

  if (arquivoSelecionado) {
    return (
      <RecorteImagem
        arquivo={arquivoSelecionado}
        onConfirmar={(recorte) => {
          aoAlterar(recorte);
          setArquivoSelecionado(null);
        }}
        onCancelar={() => {
          setArquivoSelecionado(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-texto">Imagem (opcional)</span>
      <div className="flex items-center gap-3">
        <ImagemGrupo
          nome={nome || '?'}
          imagemUrl={urlPrevia}
          cor={cor}
          className="h-16 w-16 text-xl"
        />
        <input
          ref={inputArquivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Escolher imagem do grupo"
          onChange={aoEscolherArquivo}
        />
        <Botao variante="secundaria" onClick={() => inputArquivoRef.current?.click()}>
          {imagem ? 'Trocar imagem' : 'Escolher imagem'}
        </Botao>
        {imagem ? (
          <Botao
            variante="secundaria"
            onClick={() => {
              aoAlterar(null);
            }}
          >
            Remover
          </Botao>
        ) : null}
      </div>
    </div>
  );
}
