import { FileText, Image as IconeImagem, Paperclip, Trash2, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { cn } from '@/utilitarios/cn';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { VisualizadorAnexo } from './VisualizadorAnexo';
import { useEnviarAnexo } from '../hooks/useEnviarAnexo';
import { useExcluirAnexo } from '../hooks/useExcluirAnexo';
import type { AnexoResumo } from '../tipos/movimentacao';
import type { ChangeEvent, DragEvent, ReactElement } from 'react';

interface GerenciadorAnexosProps {
  movimentacaoId: string;
  anexosIniciais: AnexoResumo[];
}

interface UploadEmAndamento {
  chaveLocal: string;
  nomeArquivo: string;
  progresso: number;
  erro: string | null;
}

// RF-32: PDF, JPEG ou PNG, no maximo 5 por movimentacao — mesmos limites
// documentados em 01-SPECIFICATION.md (o backend e quem valida de fato,
// magic number incluido; isto so evita uma ida ao servidor previsivel).
const LIMITE_ANEXOS = 5;
const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png'];

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IconeAnexo({ tipoMime }: { tipoMime: string }): ReactElement {
  if (tipoMime.startsWith('image/')) {
    return <IconeImagem className="h-5 w-5 text-textoSuave" aria-hidden="true" />;
  }
  return <FileText className="h-5 w-5 text-textoSuave" aria-hidden="true" />;
}

/** RF-32/issue #44: gerencia os anexos de uma movimentação — envia (com
 * progresso, um arquivo por requisição para uma falha não custar os que já
 * subiram), lista, exclui e abre o visualizador. `anexosIniciais` vem da
 * própria movimentação (não há endpoint de listagem separado — 04-API.md
 * §14: o array já viaja dentro do recurso movimentação). */
export function GerenciadorAnexos({
  movimentacaoId,
  anexosIniciais,
}: GerenciadorAnexosProps): ReactElement {
  const [anexos, setAnexos] = useState<AnexoResumo[]>(anexosIniciais);
  const [emAndamento, setEmAndamento] = useState<UploadEmAndamento[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [anexoVisualizado, setAnexoVisualizado] = useState<AnexoResumo | null>(null);
  const idInput = useId();
  const referenciaInput = useRef<HTMLInputElement>(null);

  const enviar = useEnviarAnexo();
  const excluir = useExcluirAnexo();

  const totalAtualEFila = anexos.length + emAndamento.length;

  function enviarArquivos(arquivos: File[]): void {
    const vagas = LIMITE_ANEXOS - totalAtualEFila;
    const aceitos = arquivos.slice(0, Math.max(vagas, 0));

    for (const arquivo of aceitos) {
      const chaveLocal = crypto.randomUUID();
      setEmAndamento((atual) => [
        ...atual,
        { chaveLocal, nomeArquivo: arquivo.name, progresso: 0, erro: null },
      ]);

      enviar.mutate(
        {
          movimentacaoId,
          arquivo,
          aoProgredir: (percentual) => {
            setEmAndamento((atual) =>
              atual.map((item) =>
                item.chaveLocal === chaveLocal ? { ...item, progresso: percentual } : item,
              ),
            );
          },
        },
        {
          onSuccess: (anexoCriado) => {
            setAnexos((atual) => [...atual, anexoCriado]);
            setEmAndamento((atual) => atual.filter((item) => item.chaveLocal !== chaveLocal));
          },
          onError: (erro) => {
            setEmAndamento((atual) =>
              atual.map((item) =>
                item.chaveLocal === chaveLocal ? { ...item, erro: traduzirErroApi(erro) } : item,
              ),
            );
          },
        },
      );
    }
  }

  function aoSelecionarArquivos(evento: ChangeEvent<HTMLInputElement>): void {
    const arquivos = Array.from(evento.target.files ?? []);
    evento.target.value = '';
    enviarArquivos(arquivos);
  }

  function aoSoltar(evento: DragEvent<HTMLDivElement>): void {
    evento.preventDefault();
    setArrastando(false);
    enviarArquivos(Array.from(evento.dataTransfer.files));
  }

  function descartarFalha(chaveLocal: string): void {
    setEmAndamento((atual) => atual.filter((item) => item.chaveLocal !== chaveLocal));
  }

  function aoExcluir(anexo: AnexoResumo): void {
    excluir.mutate(anexo.id, {
      onSuccess: () => {
        setAnexos((atual) => atual.filter((item) => item.id !== anexo.id));
      },
    });
  }

  const atingiuLimite = totalAtualEFila >= LIMITE_ANEXOS;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium text-texto" id={idInput}>
        Anexos ({totalAtualEFila}/{LIMITE_ANEXOS})
      </span>

      {!atingiuLimite ? (
        <div
          role="button"
          tabIndex={0}
          aria-labelledby={idInput}
          onClick={() => {
            referenciaInput.current?.click();
          }}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
              evento.preventDefault();
              referenciaInput.current?.click();
            }
          }}
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => {
            setArrastando(false);
          }}
          onDrop={aoSoltar}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed border-borda p-4 text-center text-sm text-textoSuave',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
            arrastando && 'border-primaria bg-primaria/5',
          )}
        >
          <Paperclip className="h-5 w-5" aria-hidden="true" />
          <span>Arraste arquivos aqui ou clique para selecionar</span>
          <span className="text-xs">PDF, JPEG ou PNG</span>
          <input
            ref={referenciaInput}
            type="file"
            aria-labelledby={idInput}
            accept={TIPOS_ACEITOS.join(',')}
            multiple
            className="sr-only"
            onChange={aoSelecionarArquivos}
          />
        </div>
      ) : null}

      {anexos.length > 0 || emAndamento.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {anexos.map((anexo) => (
            <li
              key={anexo.id}
              className="flex items-center gap-2 rounded-md border border-borda p-2 text-sm"
            >
              <IconeAnexo tipoMime={anexo.tipoMime} />
              <button
                type="button"
                onClick={() => {
                  setAnexoVisualizado(anexo);
                }}
                className="min-w-0 flex-1 truncate text-left text-texto underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
              >
                {anexo.nomeOriginal}
              </button>
              <span className="shrink-0 text-xs text-textoSuave">
                {formatarTamanho(anexo.tamanhoBytes)}
              </span>
              <button
                type="button"
                aria-label={`Excluir ${anexo.nomeOriginal}`}
                onClick={() => {
                  aoExcluir(anexo);
                }}
                className="shrink-0 rounded-md p-1 text-textoSuave hover:bg-perigo/10 hover:text-perigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}

          {emAndamento.map((item) => (
            <li
              key={item.chaveLocal}
              className="flex flex-col gap-1 rounded-md border border-borda p-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-texto">{item.nomeArquivo}</span>
                {item.erro ? (
                  <button
                    type="button"
                    aria-label={`Descartar falha de ${item.nomeArquivo}`}
                    onClick={() => {
                      descartarFalha(item.chaveLocal);
                    }}
                    className="shrink-0 rounded-md p-1 text-textoSuave hover:bg-borda focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="shrink-0 text-xs text-textoSuave">{item.progresso}%</span>
                )}
              </div>
              {item.erro ? (
                <p role="alert" className="text-xs text-perigo">
                  {item.erro}
                </p>
              ) : (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-borda">
                  <div
                    className="h-full rounded-full bg-primaria transition-all"
                    style={{ width: `${item.progresso}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {atingiuLimite ? (
        <p className="text-xs text-textoSuave">
          Limite de {LIMITE_ANEXOS} anexos atingido — exclua um para enviar outro.
        </p>
      ) : null}

      <VisualizadorAnexo
        anexo={anexoVisualizado}
        aoFechar={() => {
          setAnexoVisualizado(null);
        }}
      />
    </div>
  );
}
