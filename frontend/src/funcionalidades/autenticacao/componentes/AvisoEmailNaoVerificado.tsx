import { useState } from 'react';
import { Botao } from '@/componentes/ui/Botao';
import { useReenviarVerificacao } from '@/funcionalidades/autenticacao/hooks/useReenviarVerificacao';
import type { ReactElement } from 'react';

interface AvisoEmailNaoVerificadoProps {
  email: string;
  onVoltar: () => void;
}

// Tela dedicada (nao um toast) para 403 EMAIL_NAO_VERIFICADO — o usuario
// precisa de uma acao (reenviar), nao so de saber que algo deu errado.
export function AvisoEmailNaoVerificado({
  email,
  onVoltar,
}: AvisoEmailNaoVerificadoProps): ReactElement {
  const { mutate, isPending, isSuccess } = useReenviarVerificacao();
  const [tentativas, setTentativas] = useState(0);

  function reenviar(): void {
    mutate(email, {
      onSuccess: () => {
        setTentativas((atual) => atual + 1);
      },
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6 text-center">
      <h1 className="text-lg font-semibold text-texto">Confirme seu e-mail</h1>
      <p className="text-sm text-textoSuave">
        Enviamos um link de confirmação para <strong className="text-texto">{email}</strong>.
        Verifique sua caixa de entrada (e o spam) antes de entrar.
      </p>

      {isSuccess && tentativas > 0 ? (
        <p role="status" aria-live="polite" className="text-sm text-sucesso">
          E-mail reenviado. Confira sua caixa de entrada.
        </p>
      ) : null}

      <div className="sm:flex-row sm:justify-center flex flex-col gap-2">
        <Botao variante="secundaria" onClick={onVoltar}>
          Voltar
        </Botao>
        <Botao carregando={isPending} onClick={reenviar}>
          Reenviar e-mail
        </Botao>
      </div>
    </div>
  );
}
