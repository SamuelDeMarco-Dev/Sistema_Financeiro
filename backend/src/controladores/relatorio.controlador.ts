import { asyncHandler } from '@/middlewares/async-handler';
import { RelatorioServico } from '@/servicos/relatorio.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  ObterRelatorioAnualQuery,
  ObterRelatorioFluxoCaixaQuery,
  ObterRelatorioMensalQuery,
  ObterRelatorioPorCategoriaQuery,
  ObterRelatorioPorContaQuery,
} from '@/validadores/relatorios.validador';
import type { Request, Response } from 'express';

export class RelatorioControlador {
  private readonly servico = new RelatorioServico();

  mensal = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ObterRelatorioMensalQuery;
    const relatorio = await this.servico.obterMensal(req.usuario.id, query);

    res.status(200).json(respostaSucesso(relatorio, 'Relatório mensal gerado.'));
  });

  anual = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ObterRelatorioAnualQuery;
    const relatorio = await this.servico.obterAnual(req.usuario.id, query);

    res.status(200).json(respostaSucesso(relatorio, 'Relatório anual gerado.'));
  });

  porCategoria = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ObterRelatorioPorCategoriaQuery;
    const relatorio = await this.servico.obterPorCategoria(req.usuario.id, query);

    res.status(200).json(respostaSucesso(relatorio, 'Relatório por categoria gerado.'));
  });

  porConta = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ObterRelatorioPorContaQuery;
    const relatorio = await this.servico.obterPorConta(req.usuario.id, query);

    res.status(200).json(respostaSucesso(relatorio, 'Relatório por conta gerado.'));
  });

  fluxoCaixa = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ObterRelatorioFluxoCaixaQuery;
    const relatorio = await this.servico.obterFluxoCaixa(req.usuario.id, query);

    res.status(200).json(respostaSucesso(relatorio, 'Relatório de fluxo de caixa gerado.'));
  });
}
