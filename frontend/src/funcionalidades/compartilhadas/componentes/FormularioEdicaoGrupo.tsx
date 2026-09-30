import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { notificar } from '@/componentes/feedback';
import { SeletorCor } from '@/componentes/formulario/SeletorCor';
import { Botao } from '@/componentes/ui/Botao';
import { CaixaMarcacao } from '@/componentes/ui/CaixaMarcacao';
import { Campo } from '@/componentes/ui/Campo';
import { normalizarErro } from '@/servicos/erro-api';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { SeletorImagemGrupo } from './SeletorImagemGrupo';
import { useAtualizarGrupo } from '../hooks/useAtualizarGrupo';
import { useAtualizarImagemGrupo } from '../hooks/useAtualizarImagemGrupo';
import { edicaoGrupoSchema } from '../schemas/conta-compartilhada.schema';
import type { EdicaoGrupoFormulario } from '../schemas/conta-compartilhada.schema';
import type { ContaCompartilhadaDetalhe } from '../tipos/conta-compartilhada';
import type { ReactElement } from 'react';

interface FormularioEdicaoGrupoProps {
  grupo: ContaCompartilhadaDetalhe;
}

/** RF-53 na ponta da edição. A moeda não aparece: o grupo já tem
 * lançamentos gravados nela, e trocá-la reinterpretaria valores existentes
 * — a rota de PATCH também não a aceita (04-API.md §16.4). */
export function FormularioEdicaoGrupo({ grupo }: FormularioEdicaoGrupoProps): ReactElement {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<EdicaoGrupoFormulario>({
    resolver: zodResolver(edicaoGrupoSchema),
    defaultValues: {
      nome: grupo.nome,
      // `?? ''` e nao `null`: o input e' um campo de texto controlado pelo
      // RHF, e um valor nulo vira "null" na tela.
      descricao: grupo.descricao ?? '',
      cor: grupo.cor,
      permiteParticipanteEditarProprias: grupo.permiteParticipanteEditarProprias,
    },
  });
  const nomeDigitado = useWatch({ control, name: 'nome' });
  const corSelecionada = useWatch({ control, name: 'cor' });

  const [imagem, setImagem] = useState<Blob | null>(null);

  const atualizar = useAtualizarGrupo(grupo.id);
  const enviarImagem = useAtualizarImagemGrupo();
  const enviandoRef = useRef(false);

  async function aoSubmeter(dados: EdicaoGrupoFormulario): Promise<void> {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    try {
      await atualizar.mutateAsync(dados);

      // A imagem é uma segunda requisição (04-API.md §16): se ela falhar, os
      // demais campos já foram salvos — avisamos em vez de fingir que nada
      // passou.
      if (imagem) {
        try {
          await enviarImagem.mutateAsync({ id: grupo.id, imagem });
          setImagem(null);
        } catch (erro) {
          notificar.erro(
            `Dados salvos, mas a imagem não foi enviada: ${traduzirErroApi(normalizarErro(erro))}.`,
          );
        }
      }
    } catch {
      // A falha do PATCH aparece no próprio formulário, via `atualizar.error`.
    } finally {
      enviandoRef.current = false;
    }
  }

  const enviando = atualizar.isPending || enviarImagem.isPending;

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        void handleSubmit(aoSubmeter)(evento);
      }}
      className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-4"
    >
      <h3 className="text-sm font-semibold text-texto">Dados do grupo</h3>

      {atualizar.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-md bg-perigo/10 p-3 text-sm text-perigo"
        >
          {traduzirErroApi(atualizar.error)}
        </p>
      ) : null}

      <Campo rotulo="Nome" erro={errors.nome?.message} {...register('nome')} />

      <Campo
        rotulo="Descrição (opcional)"
        erro={errors.descricao?.message}
        {...register('descricao')}
      />

      <SeletorCor
        rotulo="Cor"
        valor={corSelecionada}
        aoAlterar={(cor) => {
          setValue('cor', cor, { shouldValidate: true, shouldDirty: true });
        }}
      />

      <SeletorImagemGrupo
        nome={nomeDigitado}
        cor={corSelecionada}
        imagem={imagem}
        aoAlterar={setImagem}
        imagemAtualUrl={grupo.imagemUrl}
      />

      <div className="flex flex-col gap-1">
        <CaixaMarcacao
          rotulo="Participantes podem editar os próprios lançamentos"
          {...register('permiteParticipanteEditarProprias')}
        />
        <p className="text-xs text-textoSuave">
          Desmarcado, só o administrador edita ou exclui lançamentos — inclusive os feitos por
          participantes. A mudança vale para todos os participantes de imediato.
        </p>
      </div>

      <Botao
        type="submit"
        carregando={enviando}
        disabled={enviando || (!isDirty && imagem === null)}
      >
        Salvar alterações
      </Botao>
    </form>
  );
}
