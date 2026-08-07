import { asyncHandler } from '@/middlewares/async-handler';
import { DashboardServico } from '@/servicos/dashboard.servico';
import { respostaSucesso } from '@/utilitarios/resposta';
import type {
  ObterFluxoCaixaQuery,
  ObterIndicadoresQuery,
} from '@/validadores/dashboard.validador';
import type { Request, Response } from 'express';

export class DashboardControlador {
  private readonly servico = new DashboardServico();

  indicadores = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ObterIndicadoresQuery;
    const { periodo, indicadores } = await this.servico.obterIndicadores(req.usuario.id, query);

    res.status(200).json(respostaSucesso({ periodo, indicadores }, 'Indicadores calculados.'));
  });

  fluxoCaixa = asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as unknown as ObterFluxoCaixaQuery;
    const fluxoCaixa = await this.servico.obterFluxoCaixa(req.usuario.id, query);

    res.status(200).json(respostaSucesso({ fluxoCaixa }, 'Fluxo de caixa calculado.'));
  });
}
