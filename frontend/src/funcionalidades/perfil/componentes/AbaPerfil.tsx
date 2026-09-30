import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { notificar } from '@/componentes/feedback';
import { RecorteImagem } from '@/componentes/formulario/RecorteImagem';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { useAtualizarFoto } from '@/funcionalidades/perfil/hooks/useAtualizarFoto';
import { useAtualizarPerfil } from '@/funcionalidades/perfil/hooks/useAtualizarPerfil';
import { useRemoverFoto } from '@/funcionalidades/perfil/hooks/useRemoverFoto';
import { perfilNomeSchema } from '@/funcionalidades/perfil/schemas/perfil.schema';
import type { PerfilNomeFormulario } from '@/funcionalidades/perfil/schemas/perfil.schema';
import type { PerfilCompleto } from '@/funcionalidades/perfil/tipos/perfil';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import type { ChangeEvent, ReactElement } from 'react';

interface AbaPerfilProps {
  perfil: PerfilCompleto;
}

const TAMANHO_MAXIMO_MB = 2;

export function AbaPerfil({ perfil }: AbaPerfilProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PerfilNomeFormulario>({
    resolver: zodResolver(perfilNomeSchema),
    defaultValues: { nome: perfil.nome },
  });

  const { mutate: salvarNome, isPending: salvandoNome } = useAtualizarPerfil();
  const { mutate: enviarFoto, isPending: enviandoFoto } = useAtualizarFoto();
  const { mutate: excluirFoto, isPending: excluindoFoto } = useRemoverFoto();

  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);

  function aoSalvarNome(dados: PerfilNomeFormulario): void {
    salvarNome(dados, {
      onSuccess: () => {
        notificar.sucesso('Nome atualizado.');
      },
      onError: (erro) => {
        notificar.erro(traduzirErroApi(erro));
      },
    });
  }

  function aoEscolherArquivo(evento: ChangeEvent<HTMLInputElement>): void {
    const arquivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!arquivo) return;

    if (arquivo.size > TAMANHO_MAXIMO_MB * 1024 * 1024) {
      notificar.erro(`A imagem deve ter no máximo ${TAMANHO_MAXIMO_MB} MB.`);
      return;
    }
    setArquivoSelecionado(arquivo);
  }

  function aoConfirmarRecorte(recorte: Blob): void {
    enviarFoto(recorte, {
      onSuccess: () => {
        notificar.sucesso('Foto atualizada.');
        setArquivoSelecionado(null);
      },
      onError: (erro) => {
        notificar.erro(traduzirErroApi(erro));
      },
    });
  }

  function aoRemoverFoto(): void {
    excluirFoto(undefined, {
      onSuccess: () => {
        notificar.sucesso('Foto removida.');
      },
      onError: (erro) => {
        notificar.erro(traduzirErroApi(erro));
      },
    });
  }

  if (arquivoSelecionado) {
    return (
      <RecorteImagem
        arquivo={arquivoSelecionado}
        onConfirmar={aoConfirmarRecorte}
        onCancelar={() => {
          setArquivoSelecionado(null);
        }}
        rotuloConfirmar="Usar esta foto"
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-3" aria-labelledby="titulo-avatar">
        <h2 id="titulo-avatar" className="text-sm font-medium text-texto">
          Foto de perfil
        </h2>
        {perfil.fotoUrl ? (
          <img
            src={perfil.fotoUrl}
            alt=""
            className="h-24 w-24 rounded-full border border-borda object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-24 w-24 items-center justify-center rounded-full border border-borda bg-primaria/10 text-2xl font-semibold text-primaria"
          >
            {perfil.nome.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex gap-2">
          <input
            ref={inputArquivoRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={aoEscolherArquivo}
          />
          <Botao
            variante="secundaria"
            carregando={enviandoFoto}
            onClick={() => inputArquivoRef.current?.click()}
          >
            Alterar foto
          </Botao>
          {perfil.fotoUrl ? (
            <Botao variante="secundaria" carregando={excluindoFoto} onClick={aoRemoverFoto}>
              Remover
            </Botao>
          ) : null}
        </div>
      </section>

      <form
        noValidate
        onSubmit={(evento) => {
          void handleSubmit(aoSalvarNome)(evento);
        }}
        className="flex flex-col gap-4"
      >
        <Campo rotulo="Nome" erro={errors.nome?.message} {...register('nome')} />
        <div>
          <Botao type="submit" carregando={salvandoNome}>
            Salvar nome
          </Botao>
        </div>
      </form>
    </div>
  );
}
