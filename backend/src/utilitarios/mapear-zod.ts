import type { ZodError } from 'zod';
import type { DetalheErro } from '@/erros';

// Os schemas de validador embrulham a entrada em { body, params, query }
// (05-DEVELOPMENT.md §6.4) — removemos esse prefixo para que "campo" no
// envelope de erro corresponda ao nome que o cliente enviou (ex.: "valor",
// nao "body.valor").
const PREFIXOS_ENVELOPE = new Set(['body', 'params', 'query']);

export function mapearZod(erro: ZodError): DetalheErro[] {
  return erro.issues.map((issue) => {
    const segmentos = issue.path.map(String);
    const primeiro = segmentos[0];
    const semEnvelope = primeiro && PREFIXOS_ENVELOPE.has(primeiro) ? segmentos.slice(1) : segmentos;

    return { campo: semEnvelope.join('.') || 'geral', mensagem: issue.message };
  });
}
