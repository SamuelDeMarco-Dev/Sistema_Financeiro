import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ErroAplicacao } from '@/erros';
import { mapearZod } from '@/utilitarios/mapear-zod';
import { respostaErro } from '@/utilitarios/resposta';
import type { CodigoErro } from '@/erros';
import type { NextFunction, Request, Response } from 'express';

interface ErroPrismaTraduzido {
  status: number;
  mensagem: string;
  codigo: CodigoErro;
}

// Somente os dois codigos exigidos pela issue #4. Novos casos (ex.: P2003
// de chave estrangeira) entram aqui conforme a necessidade aparecer.
function traduzirErroPrisma(erro: Prisma.PrismaClientKnownRequestError): ErroPrismaTraduzido {
  switch (erro.code) {
    case 'P2002':
      return { status: 409, mensagem: 'Ja existe um registro com esses dados.', codigo: 'CONFLITO' };
    case 'P2025':
      return { status: 404, mensagem: 'Registro nao encontrado.', codigo: 'NAO_ENCONTRADO' };
    default:
      return { status: 500, mensagem: 'Erro interno do servidor.', codigo: 'ERRO_INTERNO' };
  }
}

/** Unico ponto do sistema que chama `res.status(4xx|5xx)` para erros —
 * cada camada lanca uma excecao tipada; aqui ela vira HTTP (02-ARCHITECTURE.md §5.2). */
export function tratadorErros(
  erro: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura de 4 parametros exigida pelo Express para reconhecer middleware de erro
  _next: NextFunction,
): void {
  if (erro instanceof ZodError) {
    res.status(400).json(respostaErro('Dados invalidos.', mapearZod(erro), 'VALIDACAO'));
    return;
  }

  if (erro instanceof ErroAplicacao) {
    // TODO(#5): trocar por utilitarios/registrador.ts (Pino) quando o logger estruturado existir.
    console.warn(`[${erro.codigo}] ${req.method} ${req.originalUrl}: ${erro.message}`);
    res.status(erro.statusHttp).json(respostaErro(erro.message, erro.detalhes, erro.codigo));
    return;
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    const traduzido = traduzirErroPrisma(erro);
    res.status(traduzido.status).json(respostaErro(traduzido.mensagem, undefined, traduzido.codigo));
    return;
  }

  // RN-56: a resposta nunca inclui stack trace ou detalhe de infraestrutura,
  // em nenhum ambiente — quem precisa investigar le o log, nao o corpo HTTP.
  console.error(`Erro nao tratado em ${req.method} ${req.originalUrl}:`, erro);
  res.status(500).json(respostaErro('Erro interno do servidor.', undefined, 'ERRO_INTERNO'));
}
