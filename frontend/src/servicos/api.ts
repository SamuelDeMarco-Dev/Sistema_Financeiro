import axios from 'axios';
import { armazenamentoToken } from './armazenamento-token';
import { criarInterceptorRenovacao } from './interceptor-renovacao';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // refresh token viaja em cookie httpOnly
  timeout: 20_000,
});

api.interceptors.request.use((config) => {
  const token = armazenamentoToken.obter();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use((resposta) => resposta, criarInterceptorRenovacao(api));
