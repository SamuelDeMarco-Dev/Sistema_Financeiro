import { TEMAS, usarTema } from '@/contextos/ContextoTema';
import { cn } from '@/utilitarios/cn';
import type { Tema } from '@/contextos/ContextoTema';

// Classes escritas por extenso (nao interpoladas) para o scanner do Tailwind
// conseguir encontra-las — `text-${token}` seria descartado no build.
const RESUMO_SINAIS = [
  { rotulo: 'Receita', classeTexto: 'text-sucesso', sinal: '+' },
  { rotulo: 'Despesa', classeTexto: 'text-perigo', sinal: '−' },
  { rotulo: 'Transferência', classeTexto: 'text-informacao', sinal: '⇄' },
  { rotulo: 'Atenção', classeTexto: 'text-atencao', sinal: '!' },
] as const;

const RETULOS_TEMA: Record<Tema, string> = {
  CLARO: 'Claro',
  ESCURO: 'Escuro',
  SISTEMA: 'Sistema',
};

export function Inicio(): JSX.Element {
  const { tema, temaEfetivo, definirTema } = usarTema();

  return (
    <main className="mx-auto flex min-h-screen w-full min-w-0 max-w-[1440px] flex-col gap-6 bg-fundo px-4 py-6 text-texto md:px-8">
      <header className="flex flex-col gap-4 border-b border-borda pb-4 md:flex-row md:items-center md:justify-between">
        {/* min-w-0: sem isso, o item flex nao encolhe abaixo da largura do
            texto nao quebrado (min-width:auto padrao), e a pagina ganha
            rolagem horizontal em telas estreitas. */}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-texto">Gerenciador de Finanças</h1>
          <p className="text-sm text-textoSuave">
            Esqueleto do Design System — tema efetivo atual: <strong>{RETULOS_TEMA[temaEfetivo]}</strong>
          </p>
        </div>

        <div role="group" aria-label="Selecionar tema" className="flex gap-2">
          {TEMAS.map((opcao) => (
            <button
              key={opcao}
              type="button"
              aria-pressed={tema === opcao}
              onClick={() => definirTema(opcao)}
              className={cn(
                'rounded-md border px-3 py-2 text-sm text-texto transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
                // A selecao nao depende so da cor (border-primaria e um indicador
                // de UI, exige apenas 3:1): o peso da fonte tambem muda (RN A11Y).
                tema === opcao
                  ? 'border-primaria bg-primaria/10 font-semibold'
                  : 'border-borda bg-superficie font-medium hover:bg-borda',
              )}
            >
              {RETULOS_TEMA[opcao]}
            </button>
          ))}
        </div>
      </header>

      <section aria-label="Resumo de sinais financeiros" className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {RESUMO_SINAIS.map(({ rotulo, classeTexto, sinal }) => (
          <article
            key={rotulo}
            className="flex flex-col gap-2 rounded-lg border border-borda bg-superficie p-4"
          >
            <span className="text-sm text-textoSuave">{rotulo}</span>
            <span className={cn('font-mono text-2xl font-semibold tabular-nums', classeTexto)}>
              {sinal} R$ 1.234,56
            </span>
          </article>
        ))}
      </section>

      <footer className="mt-auto border-t border-borda pt-4 text-xs text-textoSuave">
        Issues #6/#7 — Design System, roteamento e React Query.
      </footer>
    </main>
  );
}
