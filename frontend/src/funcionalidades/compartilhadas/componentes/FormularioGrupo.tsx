import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { notificar } from '@/componentes/feedback';
import { SeletorCor } from '@/componentes/formulario/SeletorCor';
import { Botao } from '@/componentes/ui/Botao';
import { CaixaMarcacao } from '@/componentes/ui/CaixaMarcacao';
import { Campo } from '@/componentes/ui/Campo';
import { Dialog, DialogConteudo, DialogTitulo } from '@/componentes/ui/Dialog';
import { Selecao } from '@/componentes/ui/Selecao';
import { normalizarErro } from '@/servicos/erro-api';
import { obterOpcoesMoeda } from '@/utilitarios/opcoes-preferencias';
import { traduzirErroApi } from '@/utilitarios/traduzir-erro-api';
import { SeletorImagemGrupo } from './SeletorImagemGrupo';
import { useAtualizarImagemGrupo } from '../hooks/useAtualizarImagemGrupo';
import { useCriarGrupo } from '../hooks/useCriarGrupo';
import { grupoSchema } from '../schemas/conta-compartilhada.schema';
import type { GrupoFormulario } from '../schemas/conta-compartilhada.schema';
import type { ReactElement } from 'react';

interface FormularioGrupoProps {
  aberto: boolean;
  aoFechar: () => void;
}

const VALORES_INICIAIS: GrupoFormulario = {
  nome: '',
  descricao: undefined,
  moeda: 'BRL',
  cor: '#2563EB',
  permiteParticipanteEditarProprias: true,
  criarCategoriasPadrao: true,
};

/** Radix Dialog so monta o conteudo quando `open`, entao cada abertura
 * comeca com o formulario limpo — sem useEffect + reset(). */
export function FormularioGrupo({ aberto, aoFechar }: FormularioGrupoProps): ReactElement {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<GrupoFormulario>({
    resolver: zodResolver(grupoSchema),
    defaultValues: VALORES_INICIAIS,
  });
  // useWatch em vez de watch(): watch() nao e' compativel com o React
  // Compiler (react-hooks/incompatible-library).
  const nomeDigitado = useWatch({ control, name: 'nome' });
  const corSelecionada = useWatch({ control, name: 'cor' });

  const [imagem, setImagem] = useState<Blob | null>(null);

  const criar = useCriarGrupo();
  const enviarImagem = useAtualizarImagemGrupo();
  const enviandoRef = useRef(false);

  // Sequencial de proposito: a imagem so pode subir depois de o grupo
  // existir, entao aqui e' `mutateAsync` em serie, nao dois `mutate`
  // disparados juntos.
  async function aoSubmeter(dados: GrupoFormulario): Promise<void> {
    if (enviandoRef.current) return;
    enviandoRef.current = true;

    try {
      const grupo = await criar.mutateAsync(dados);

      // A imagem e' um passo separado (04-API.md §16): se ela falhar, o
      // grupo ja existe e nao da' para desfazer — avisamos e seguimos para
      // o detalhe, onde e' possivel tentar de novo.
      if (imagem) {
        try {
          await enviarImagem.mutateAsync({ id: grupo.id, imagem });
        } catch (erro) {
          notificar.erro(
            `Grupo criado, mas a imagem não foi enviada: ${traduzirErroApi(normalizarErro(erro))}. Tente novamente pelas configurações do grupo.`,
          );
        }
      }

      aoFechar();
      void navigate(`/compartilhadas/${grupo.id}`);
    } catch {
      // Falha na criacao ja aparece no proprio formulario, via `criar.error`.
    } finally {
      enviandoRef.current = false;
    }
  }

  const enviando = criar.isPending || enviarImagem.isPending;

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoAberto) => {
        if (!novoAberto) aoFechar();
      }}
    >
      <DialogConteudo aria-describedby={undefined}>
        <DialogTitulo>Novo grupo</DialogTitulo>

        <form
          noValidate
          onSubmit={(evento) => {
            void handleSubmit(aoSubmeter)(evento);
          }}
          className="mt-4 flex flex-col gap-4"
        >
          {criar.error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-md bg-perigo/10 p-3 text-sm text-perigo"
            >
              {traduzirErroApi(criar.error)}
            </p>
          ) : null}

          <Campo rotulo="Nome" erro={errors.nome?.message} {...register('nome')} />

          <Campo
            rotulo="Descrição (opcional)"
            erro={errors.descricao?.message}
            {...register('descricao')}
          />

          <Selecao rotulo="Moeda" erro={errors.moeda?.message} {...register('moeda')}>
            {obterOpcoesMoeda().map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </Selecao>

          <SeletorCor
            rotulo="Cor"
            valor={corSelecionada}
            aoAlterar={(cor) => {
              setValue('cor', cor, { shouldValidate: true });
            }}
          />

          <SeletorImagemGrupo
            nome={nomeDigitado}
            cor={corSelecionada}
            imagem={imagem}
            aoAlterar={setImagem}
          />

          <div className="flex flex-col gap-1">
            <CaixaMarcacao
              rotulo="Participantes podem editar os próprios lançamentos"
              {...register('permiteParticipanteEditarProprias')}
            />
            <p className="text-xs text-textoSuave">
              Desmarcado, só o administrador edita ou exclui lançamentos — inclusive os feitos por
              participantes.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <CaixaMarcacao
              rotulo="Criar as categorias padrão no grupo"
              {...register('criarCategoriasPadrao')}
            />
            <p className="text-xs text-textoSuave">
              O grupo tem categorias próprias, separadas das suas. Comece com as padrão para não
              cadastrar tudo do zero.
            </p>
          </div>

          <Botao type="submit" carregando={enviando}>
            Criar grupo
          </Botao>
        </form>
      </DialogConteudo>
    </Dialog>
  );
}
