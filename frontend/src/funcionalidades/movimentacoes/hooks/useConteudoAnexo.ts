import { useEffect, useState } from 'react';
import { baixarConteudoAnexo } from '../servicos/anexo.servico';

interface ConteudoAnexo {
  blobUrl: string | null;
  carregando: boolean;
  erro: boolean;
}

/** `/anexos/:id/conteudo` exige `Authorization: Bearer` (RN-51 — anexo é
 * documento privado, não um `/uploads` público como o avatar) — um
 * `<img src>`/`<iframe src>` direto não manda esse header. Busca o blob
 * pela instância `api` (que manda) e expõe um object URL local. */
export function useConteudoAnexo(url: string | null): ConteudoAnexo {
  const [urlAnterior, setUrlAnterior] = useState(url);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(() => url !== null);
  const [erro, setErro] = useState(false);

  // Ajuste de estado durante a renderizacao (nao num efeito, mesmo
  // raciocinio de `CampoData.tsx`): trocar de anexo so descarta o blob
  // anterior, nao sincroniza com nada externo — nao precisa de efeito. O
  // fetch em si (a sincronizacao real com o servidor) fica so no efeito
  // abaixo, e so seta estado dentro dos callbacks da promise — nunca no
  // corpo sincrono do efeito (react-hooks/set-state-in-effect).
  if (url !== urlAnterior) {
    setUrlAnterior(url);
    setBlobUrl(null);
    setErro(false);
    setCarregando(url !== null);
  }

  useEffect(() => {
    if (!url) return;

    let objectUrlAtual: string | null = null;
    let cancelado = false;

    baixarConteudoAnexo(url)
      .then((blob) => {
        if (cancelado) return;
        objectUrlAtual = URL.createObjectURL(blob);
        setBlobUrl(objectUrlAtual);
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
      if (objectUrlAtual) URL.revokeObjectURL(objectUrlAtual);
    };
  }, [url]);

  return { blobUrl, carregando, erro };
}
