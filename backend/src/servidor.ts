import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { opcoesCors } from '@/configuracao/cors';
import { naoEncontrado } from '@/middlewares/nao-encontrado.middleware';
import { tratadorErros } from '@/middlewares/tratador-erros.middleware';
import { registrarSerializadorDecimal } from '@/utilitarios/serializador-decimal';

// A ordem de montagem e significativa (02-ARCHITECTURE.md §4.1) e nao deve
// ser alterada sem justificativa registrada. Correlacao de requisicao, log
// estruturado, rate limit e rotas de dominio chegam nas issues #5 e
// seguintes — tratadorErros ja e SEMPRE o ultimo middleware.
export function criarServidor(): Express {
  registrarSerializadorDecimal(); // ADR-012: Decimal sempre "0.00" nas respostas

  const app = express();

  app.set('trust proxy', 1); // atras do Nginx: IP real para rate limit
  app.use(helmet());
  app.use(cors(opcoesCors));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // As rotas de dominio (app.use('/api/v1', rotas)) entram AQUI, antes de
  // naoEncontrado — depois dele, qualquer rota se tornaria inalcancavel.
  app.use(naoEncontrado);
  app.use(tratadorErros);

  return app;
}
