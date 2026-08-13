import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { AreaTexto } from '@/componentes/ui/AreaTexto';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { Dialog, DialogConteudo, DialogDescricao, DialogTitulo } from '@/componentes/ui/Dialog';
import { Selecao } from '@/componentes/ui/Selecao';
import { useEnviarConvite } from '../hooks/useEnviarConvite';
import { conviteSchema } from '../schemas/convite.schema';
import { DESCRICAO_PAPEL, PAPEIS_CONVIDAVEIS, ROTULO_PAPEL } from '../tipos/conta-compartilhada';
import { mensagemErroConvite } from '../utilitarios/mensagens-erro-grupo';
import type { ConviteFormulario } from '../schemas/convite.schema';
import type { ReactElement } from 'react';

interface DialogoConviteProps {
  grupoId: string;
  nomeGrupo: string;
  aberto: boolean;
  aoFechar: () => void;
}

const VALORES_INICIAIS: ConviteFormulario = {
  email: '',
  papel: 'PARTICIPANTE',
  mensagem: undefined,
};

/** RF-54. O papel escolhido aqui é o papel com que a pessoa entra no grupo
 * (RN-39), então cada opção vem com a explicação do que ela permite — quem
 * convida decide antes, não depois de a pessoa já estar dentro. */
export function DialogoConvite({
  grupoId,
  nomeGrupo,
  aberto,
  aoFechar,
}: DialogoConviteProps): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ConviteFormulario>({
    resolver: zodResolver(conviteSchema),
    defaultValues: VALORES_INICIAIS,
  });

  const enviar = useEnviarConvite(grupoId);

  function aoSubmeter(dados: ConviteFormulario): void {
    enviar.mutate(dados, { onSuccess: aoFechar });
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(novoAberto) => {
        if (!novoAberto) aoFechar();
      }}
    >
      <DialogConteudo>
        <DialogTitulo>Convidar para {nomeGrupo}</DialogTitulo>
        <DialogDescricao className="mt-2">
          A pessoa recebe um e-mail com o link do convite, válido por 7 dias. Ela só entra no grupo
          depois de aceitar.
        </DialogDescricao>

        <form
          noValidate
          onSubmit={(evento) => {
            void handleSubmit(aoSubmeter)(evento);
          }}
          className="mt-4 flex flex-col gap-4"
        >
          {enviar.error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-md bg-perigo/10 p-3 text-sm text-perigo"
            >
              {mensagemErroConvite(enviar.error)}
            </p>
          ) : null}

          <Campo
            rotulo="E-mail"
            type="email"
            autoComplete="off"
            erro={errors.email?.message}
            {...register('email')}
          />

          <div className="flex flex-col gap-2">
            <Selecao rotulo="Papel no grupo" erro={errors.papel?.message} {...register('papel')}>
              {PAPEIS_CONVIDAVEIS.map((papel) => (
                <option key={papel} value={papel}>
                  {ROTULO_PAPEL[papel]}
                </option>
              ))}
            </Selecao>
            <ul className="flex flex-col gap-1 rounded-md bg-superficie p-3 text-xs text-textoSuave">
              {PAPEIS_CONVIDAVEIS.map((papel) => (
                <li key={papel}>
                  <strong className="font-semibold text-texto">{ROTULO_PAPEL[papel]}:</strong>{' '}
                  {DESCRICAO_PAPEL[papel]}
                </li>
              ))}
            </ul>
            <p className="text-xs text-textoSuave">
              O grupo tem um único administrador. Para passar o posto a alguém, use “Transferir
              administração” depois que a pessoa entrar.
            </p>
          </div>

          <AreaTexto
            rotulo="Mensagem (opcional)"
            ajuda="Aparece no e-mail do convite. Até 300 caracteres."
            maxLength={300}
            erro={errors.mensagem?.message}
            {...register('mensagem')}
          />

          <Botao type="submit" carregando={enviar.isPending}>
            Enviar convite
          </Botao>
        </form>
      </DialogConteudo>
    </Dialog>
  );
}
