import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Carregando } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { useReenviarVerificacao } from '@/funcionalidades/autenticacao/hooks/useReenviarVerificacao';
import { verificarEmail } from '@/funcionalidades/autenticacao/servicos/autenticacao.servico';
import type { ReactElement } from 'react';

const reenvioSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail invalido.'),
});
type ReenvioFormulario = z.infer<typeof reenvioSchema>;

function FormularioReenvio(): ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ReenvioFormulario>({
    resolver: zodResolver(reenvioSchema),
    defaultValues: { email: '' },
  });
  const { mutate, isPending, isSuccess } = useReenviarVerificacao();

  if (isSuccess) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-sucesso">
        Se o e-mail estiver cadastrado, um novo link foi enviado.
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(evento) => {
        void handleSubmit((dados) => {
          mutate(dados.email);
        })(evento);
      }}
      className="flex flex-col gap-3"
    >
      <Campo
        rotulo="E-mail"
        type="email"
        autoComplete="email"
        erro={errors.email?.message}
        {...register('email')}
      />
      <Botao type="submit" carregando={isPending}>
        Enviar novo link
      </Botao>
    </form>
  );
}

type SituacaoVerificacao = 'verificando' | 'verificado' | 'invalido';

export function VerificarEmail(): ReactElement {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  const jaTentou = useRef(false);
  const [semToken] = useState(!token);
  const [situacao, setSituacao] = useState<SituacaoVerificacao>('verificando');

  // O resultado vive em estado local e a chamada vai direto ao servico, sem
  // `useMutation` no meio: o desmonte simulado do StrictMode desinscreve o
  // observador da mutacao, e a resolucao que chega nessa janela se perde —
  // a tela ficava presa em "Verificando seu e-mail..." com a API tendo
  // respondido 200 (medido no navegador). Sem observador, nao ha o que
  // perder.
  useEffect(() => {
    if (!token || jaTentou.current) return;
    jaTentou.current = true;

    // De proposito sem cancelamento na limpeza: a chamada unica parte na
    // primeira execucao do efeito, e cancelar na limpeza do StrictMode
    // descartaria justamente o resultado dela.
    void verificarEmail(token).then(
      () => {
        setSituacao('verificado');
      },
      () => {
        setSituacao('invalido');
      },
    );
  }, [token]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8 text-center">
      {semToken ? (
        <>
          <h1 className="text-lg font-semibold text-texto">Link inválido</h1>
          <p className="text-sm text-textoSuave">
            Este link de verificação está incompleto. Solicite um novo abaixo.
          </p>
          <FormularioReenvio />
        </>
      ) : null}

      {!semToken && situacao === 'verificando' ? (
        <Carregando rotulo="Verificando seu e-mail..." />
      ) : null}

      {!semToken && situacao === 'verificado' ? (
        <>
          <h1 className="text-lg font-semibold text-sucesso">E-mail verificado!</h1>
          <p className="text-sm text-textoSuave">Sua conta está pronta. Você já pode entrar.</p>
          <Link
            to="/entrar"
            className="font-medium text-primaria hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
          >
            Ir para o login
          </Link>
        </>
      ) : null}

      {!semToken && situacao === 'invalido' ? (
        <>
          <h1 className="text-lg font-semibold text-perigo">Link expirado ou inválido</h1>
          <p className="text-sm text-textoSuave">
            Este link não é mais válido. Informe seu e-mail para receber um novo.
          </p>
          <FormularioReenvio />
        </>
      ) : null}
    </div>
  );
}
