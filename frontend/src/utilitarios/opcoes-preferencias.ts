export interface OpcaoSelecao {
  valor: string;
  rotulo: string;
}

const DIAS_SEMANA_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const FORMATOS_DATA: OpcaoSelecao[] = [
  { valor: 'dd/MM/yyyy', rotulo: 'dd/MM/aaaa (31/12/2026)' },
  { valor: 'MM/dd/yyyy', rotulo: 'MM/dd/aaaa (12/31/2026)' },
  { valor: 'yyyy-MM-dd', rotulo: 'aaaa-MM-dd (2026-12-31)' },
];

export function obterOpcoesFormatoData(): OpcaoSelecao[] {
  return FORMATOS_DATA;
}

export function obterOpcoesDiaSemana(): OpcaoSelecao[] {
  return DIAS_SEMANA_PT.map((rotulo, indice) => ({ valor: String(indice), rotulo }));
}

// Mesma fonte que o backend usa para validar (Intl), nao uma lista
// hardcoded que fica desatualizada — backend/src/validadores/perfil.validador.ts.
export function obterOpcoesTimezone(): OpcaoSelecao[] {
  return Intl.supportedValuesOf('timeZone').map((tz) => ({ valor: tz, rotulo: tz }));
}

export function obterOpcoesMoeda(): OpcaoSelecao[] {
  const nomeadorMoeda = new Intl.DisplayNames(['pt-BR'], { type: 'currency' });
  return Intl.supportedValuesOf('currency')
    .map((codigo) => {
      const nome = nomeadorMoeda.of(codigo);
      return { valor: codigo, rotulo: nome && nome !== codigo ? `${codigo} — ${nome}` : codigo };
    })
    .sort((a, b) => a.valor.localeCompare(b.valor));
}
