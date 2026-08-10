# Contexto de build: raiz do monorepo (npm workspaces, um único
# package-lock.json) — mesma razão do backend/Dockerfile. Não usado pelo
# pipeline de deploy (que builda o frontend nativamente no runner, ver
# 08-CICD.md §7), mas mantido como forma reprodutível de gerar o mesmo
# artefato estático localmente.
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL
ARG VITE_AMBIENTE
ARG VITE_NOME_APP
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_AMBIENTE=$VITE_AMBIENTE
ENV VITE_NOME_APP=$VITE_NOME_APP

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=frontend --ignore-scripts

COPY frontend ./frontend
WORKDIR /app/frontend
RUN npm run build

# Estágio de export: o artefato é extraído, não servido
FROM scratch AS artefato
COPY --from=build /app/frontend/dist /dist
