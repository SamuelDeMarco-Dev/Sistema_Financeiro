import { asyncHandler } from '@/middlewares/async-handler';
import { RelatorioServico } from '@/servicos/relatorio.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  ObterRelatorioAnualQuery,
  ObterRelatorioMensalQuery,
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
}
