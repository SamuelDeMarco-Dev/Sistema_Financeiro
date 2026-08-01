import { AsyncLocalStorage } from 'node:async_hooks';
import pino, { type LoggerOptions } from 'pino';
import { ambiente } from '@/configuracao/ambiente';

export interface ContextoRequisicao {
  requestId: string;
}

// Permite que qualquer log emitido durante o ciclo de vida de uma
// requisicao (inclusive dentro de servicos, sem acesso a `req`) carregue o
// `requestId` automaticamente, via o `mixin` do Pino abaixo.
export const contextoRequisicao = new AsyncLocalStorage<ContextoRequisicao>();

// RN de privacidade (02-ARCHITECTURE.md §11.1): estes campos nunca aparecem
// em log, em nenhuma profundidade onde costumam surgir (corpo de requisicao,
// cabecalhos, objetos de erro re-serializados).
const CAMINHOS_REDACAO = [
  'senha',
  'senhaHash',
  'token',
  'authorization',
  'cookie',
  '*.senha',
  '*.senhaHash',
  '*.token',
  '*.authorization',
  '*.cookie',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.senha',
  'req.body.senhaHash',
  'req.body.token',
];

function misturarContexto(): Record<string, string> {
  const contexto = contextoRequisicao.getStore();
  return contexto ? { requestId: contexto.requestId } : {};
}

const opcoesBase: LoggerOptions = {
  redact: { paths: CAMINHOS_REDACAO, censor: '[REDACAO]' },
  mixin: misturarContexto,
};

export const registrador = pino({
  ...opcoesBase,
  level: ambiente.NIVEL_LOG,
  ...(ambiente.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
});

/** Usado pelos testes: mesma configuracao de redacao/mixin, mas escrevendo
 * num destino controlavel em vez de stdout, e sem o transport assincrono do
 * pino-pretty (que nao teria como ser inspecionado de forma sincrona). */
export function criarRegistradorTeste(destino: NodeJS.WritableStream): pino.Logger {
  return pino({ ...opcoesBase, level: 'trace' }, destino);
}
