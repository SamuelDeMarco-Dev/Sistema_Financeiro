import { Receipt, Shield, Users } from 'lucide-react';
import { Botao } from '@/componentes/ui/Botao';
import type { ReactElement } from 'react';

interface EstadoVazioCompartilhadasProps {
  aoCriar: () => void;
}

// Contas compartilhadas e' o recurso menos autoexplicativo do produto: um
// "nenhum grupo ainda" nao ensina para que serve. Por isso este estado
// vazio explica o valor antes de oferecer a acao — diferente do
// EstadoVazio generico usado nas outras listagens.
const BENEFICIOS = [
  {
    Icone: Users,
    titulo: 'Contas em conjunto',
    texto: 'Divida as despesas da casa, de uma viagem ou de um projeto com quem participa delas.',
  },
  {
    Icone: Receipt,
    titulo: 'Saldo e categorias próprios',
    texto: 'O grupo tem contas, categorias e lançamentos separados das suas finanças pessoais.',
  },
  {
    Icone: Shield,
    titulo: 'Cada um com seu papel',
    texto: 'Você decide quem administra, quem lança e quem apenas acompanha.',
  },
];

export function EstadoVazioCompartilhadas({
  aoCriar,
}: EstadoVazioCompartilhadasProps): ReactElement {
  return (
    <section className="flex flex-col items-center gap-6 rounded-lg border border-borda bg-superficie px-6 py-10 text-center">
      <div className="flex max-w-prose flex-col gap-2">
        <h2 className="text-lg font-semibold text-texto">Organize dinheiro que não é só seu</h2>
        <p className="text-sm text-textoSuave">
          Um grupo é um espaço financeiro compartilhado: quem você convidar vê o mesmo saldo e lança
          no mesmo lugar, sem misturar com as contas pessoais de ninguém.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 text-left md:grid-cols-3">
        {BENEFICIOS.map(({ Icone, titulo, texto }) => (
          <li
            key={titulo}
            className="flex min-w-0 flex-col gap-1 rounded-md border border-borda p-4"
          >
            <Icone className="h-5 w-5 text-primaria" aria-hidden="true" />
            <p className="text-sm font-medium text-texto">{titulo}</p>
            <p className="text-sm text-textoSuave">{texto}</p>
          </li>
        ))}
      </ul>

      <Botao onClick={aoCriar}>Criar meu primeiro grupo</Botao>
    </section>
  );
}
