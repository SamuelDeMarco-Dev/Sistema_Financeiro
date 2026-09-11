import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AvisoEmailNaoVerificado } from '@/funcionalidades/autenticacao/componentes/AvisoEmailNaoVerificado';
import { FormularioCadastro } from '@/funcionalidades/autenticacao/componentes/FormularioCadastro';
import type { ReactElement } from 'react';

export function Cadastro(): ReactElement {
  const navigate = useNavigate();
  const [emailCadastrado, setEmailCadastrado] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-8">
      {emailCadastrado ? (
        <AvisoEmailNaoVerificado
          email={emailCadastrado}
          onVoltar={() => {
            void navigate('/entrar');
          }}
        />
      ) : (
        <>
          <div>
            <h1 className="text-xl font-semibold text-texto">Criar conta</h1>
            <p className="text-sm text-textoSuave">Leva menos de um minuto.</p>
          </div>
          <FormularioCadastro onSucesso={setEmailCadastrado} />
          <p className="text-center text-sm text-textoSuave">
            Já tem conta?{' '}
            <Link to="/entrar" className="font-medium text-primaria hover:underline">
              Entrar
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
