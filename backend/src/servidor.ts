import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { opcoesCors } from '@/configuracao/cors';

// A ordem de montagem e significativa (02-ARCHITECTURE.md §4.1) e nao deve
// ser alterada sem justificativa registrada. Middlewares de observabilidade,
// rate limit, rotas de dominio e tratamento de erro chegam nas issues #4 e #5.
export function criarServidor(): Express {
  const app = express();

  app.set('trust proxy', 1); // atras do Nginx: IP real para rate limit
  app.use(helmet());
  app.use(cors(opcoesCors));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  return app;
}
