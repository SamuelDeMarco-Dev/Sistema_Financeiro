import { z } from 'zod';

// Nenhum outro arquivo deve ler `process.env` diretamente (05-DEVELOPMENT.md
// §2.3) — todos importam `ambiente`. A partir da issue #8, uma regra de
// ESLint (`no-restricted-imports`) reprova o build se isso for violado.

const textoBooleano = (padrao: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(padrao)
    .transform((valor) => valor === 'true');

const esquemaAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORTA: z.coerce.number().int().positive().default(3333),
  URL_BASE_API: z.string().url(),
  URL_BASE_FRONTEND: z.string().url(),

  DATABASE_URL: z.string().url(),
  DATABASE_URL_TESTE: z.string().url().optional(),

  JWT_SEGREDO: z.string().min(32, 'JWT_SEGREDO deve ter no minimo 32 caracteres.'),
  JWT_EXPIRACAO: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRACAO_DIAS: z.coerce.number().int().positive().default(7),
  REFRESH_TOKEN_EXPIRACAO_DIAS_LEMBRAR: z.coerce.number().int().positive().default(30),
  BCRYPT_CUSTO: z.coerce.number().int().min(10).max(14).default(12),

  ORIGENS_PERMITIDAS: z
    .string()
    .default('http://localhost:5173')
    .transform((valor) => valor.split(',').map((origem) => origem.trim())),

  TOKEN_METRICAS: z.string().min(32).optional(),

  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORTA: z.coerce.number().int().positive().default(1025),
  SMTP_USUARIO: z.string().default(''),
  SMTP_SENHA: z.string().default(''),
  SMTP_SEGURO: textoBooleano('false'),
  EMAIL_REMETENTE: z.string().default('PFM <nao-responda@pfm.local>'),

  DIRETORIO_UPLOADS: z.string().default('./uploads'),
  TAMANHO_MAXIMO_ANEXO_MB: z.coerce.number().positive().default(5),
  TAMANHO_MAXIMO_AVATAR_MB: z.coerce.number().positive().default(2),

  RATE_LIMIT_JANELA_MINUTOS: z.coerce.number().positive().default(15),
  RATE_LIMIT_MAXIMO: z.coerce.number().positive().default(1000),

  NIVEL_LOG: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  HABILITAR_TAREFAS_AGENDADAS: textoBooleano('true'),
  // Definida pelo PM2 em modo cluster (0, 1, 2...); ausente (dev, testes,
  // um unico processo) equivale a '0' — a instancia unica sempre roda as
  // tarefas agendadas.
  NODE_APP_INSTANCE: z.string().default('0'),
});

// Regras que dependem de mais de um campo (por isso fora do `z.object`
// acima): em producao, CORS aberto para qualquer origem e metricas sem
// token de protecao sao os dois jeitos mais faceis de expor a API sem
// querer (issue #64, endurecimento de producao).
const esquemaAmbienteComRegrasDeProducao = esquemaAmbiente.superRefine((valor, ctx) => {
  if (valor.NODE_ENV !== 'production') return;

  if (valor.ORIGENS_PERMITIDAS.includes('*')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ORIGENS_PERMITIDAS'],
      message: 'ORIGENS_PERMITIDAS nao pode conter "*" em producao.',
    });
  }

  if (!valor.TOKEN_METRICAS) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['TOKEN_METRICAS'],
      message: 'TOKEN_METRICAS e obrigatorio em producao (protege a rota /metricas).',
    });
  }
});

const resultado = esquemaAmbienteComRegrasDeProducao.safeParse(process.env);

if (!resultado.success) {
  console.error('Variaveis de ambiente invalidas:');
  console.error(resultado.error.flatten().fieldErrors);
  process.exit(1);
}

export const ambiente = resultado.data;
export type Ambiente = typeof ambiente;
