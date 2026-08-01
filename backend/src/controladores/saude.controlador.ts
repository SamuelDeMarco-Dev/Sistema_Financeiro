import { asyncHandler } from '@/middlewares/async-handler';
import * as saudeServico from '@/servicos/saude.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type { Request, Response } from 'express';

/** *Liveness*: o processo esta de pe. Nao verifica dependencias externas —
 * para isso existe `/saude/prontidao`. */
export const liveness = asyncHandler(async (_req: Request, res: Response) => {
  res.status(200).json(respostaSucesso(saudeServico.obterStatusLiveness(), 'Serviço operacional.'));
});

// Formato de resposta do 503 documentado em 04-API.md §25.2 inclui `data`
// mesmo com `success: false` — uma excecao explicita ao envelope padrao de
// erro (utilitarios/resposta.ts), pois este e o portao de deploy e o
// pipeline le `verificacoes` para decidir o rollback (02-ARCHITECTURE.md
// §11.2). Por isso monta a resposta diretamente em vez de usar
// `respostaErro`/`ErroAplicacao`.
export const prontidao = asyncHandler(async (_req: Request, res: Response) => {
  const resultado = await saudeServico.obterStatusProntidao();

  if (resultado.status === 'indisponivel') {
    res.status(503).json({
      success: false,
      message: 'Serviço não está pronto.',
      codigo: 'SERVICO_INDISPONIVEL',
      data: resultado,
    });
    return;
  }

  res.status(200).json(respostaSucesso(resultado, 'Serviço pronto.'));
});
