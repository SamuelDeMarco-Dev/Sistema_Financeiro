import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AvisoEmailNaoVerificado } from '@/funcionalidades/autenticacao/componentes/AvisoEmailNaoVerificado';
import { FormularioLogin } from '@/funcionalidades/autenticacao/componentes/FormularioLogin';
import type { ReactElement } from 'react';
import type { Location } from 'react-router-dom';

interface EstadoLocalizacao {
  de?: Location;
}

export function Entrar(): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [emailNaoVerificado, setEmailNaoVerificado] = useState<string | null>(null);

  function aoAutenticar(): void {
    const estado = location.state as EstadoLocalizacao | null;
    const destino = estado?.de ? `${estado.de.pathname}${estado.de.search}` : '/';
    void navigate(destino, { replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      {emailNaoVerificado ? (
        <AvisoEmailNaoVerificado
          email={emailNaoVerificado}
          onVoltar={() => {
            setEmailNaoVerificado(null);
          }}
        />
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold text-texto">Entrar</h1>
            <p className="text-sm text-textoSuave">Acesse sua conta para continuar.</p>
          </div>
          <FormularioLogin onSucesso={aoAutenticar} onEmailNaoVerificado={setEmailNaoVerificado} />
          <Link
            to="/esqueci-senha"
            className="text-center text-sm font-medium text-primaria hover:underline"
          >
            Esqueci minha senha
          </Link>
          <p className="text-center text-sm text-textoSuave">
            Não tem conta?{' '}
            <Link to="/cadastrar" className="font-medium text-primaria hover:underline">
              Criar conta
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
