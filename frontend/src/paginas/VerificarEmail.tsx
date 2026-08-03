import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Carregando } from '@/componentes/feedback';
import { Botao } from '@/componentes/ui/Botao';
import { Campo } from '@/componentes/ui/Campo';
import { useReenviarVerificacao } from '@/hooks/useReenviarVerificacao';
import { useVerificarEmail } from '@/hooks/useVerificarEmail';
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

export function VerificarEmail(): ReactElement {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');
  const { mutate, isPending, isSuccess, isError } = useVerificarEmail();
  const jaTentou = useRef(false);
  const [semToken] = useState(!token);

  useEffect(() => {
    if (token && !jaTentou.current) {
      jaTentou.current = true;
      mutate(token);
    }
    // `mutate` muda de identidade a cada mudanca de estado da propria
    // mutation (isPending/isSuccess) — inclui-la nas deps reexecutaria o
    // efeito repetidas vezes; jaTentou.current ja garante a chamada unica.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      {!semToken && isPending ? <Carregando rotulo="Verificando seu e-mail..." /> : null}

      {!semToken && isSuccess ? (
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

      {!semToken && isError ? (
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
