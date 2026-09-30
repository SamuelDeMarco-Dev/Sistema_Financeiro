# Contexto de build: raiz do monorepo (npm workspaces, um único
# package-lock.json) — ver `docker/build-push-action` em
# .github/workflows/deploy-producao.yml, que usa `context: .`.

# ─────────────── Estágio 1: dependências ───────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY backend/prisma ./backend/prisma
RUN npm ci --workspace=backend --ignore-scripts

# ─────────────── Estágio 2: build ──────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend ./backend
WORKDIR /app/backend
RUN npx prisma generate && npm run build

# ─────────────── Estágio 3: runtime ────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache dumb-init curl \
 && npm install -g pm2@latest

# /app ainda está vazio aqui — o chown é instantâneo. Feito depois de
# preenchido, o overlayfs copiaria cada arquivo de novo (camada dobrava
# de tamanho à toa).
RUN mkdir -p /app/backend && chown -R node:node /app

ENV NODE_ENV=production
ENV PORTA=3333

# Só dependências de produção — copiadas já com --chown e instaladas como
# `node` desde o início: um `chown -R` posterior faria o overlayfs copiar
# de novo cada arquivo (camada dobrava de tamanho para nada).
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node backend/prisma ./backend/prisma

USER node

#
# `@prisma/client` declara `prisma` (o CLI) como peerOptional — mesmo
# com `--omit=dev`, o hoisting do workspace mantém `prisma` e sua árvore
# de suporte (`@prisma/engines`, `effect`, `fast-check`, `typescript`)
# porque também são alcançáveis por essa aresta não-dev. Nada disso é
# usado em runtime (o client já vem gerado, copiado abaixo) — só o CLI
# usa. Removidos explicitamente: ~130 MB que não pertencem à imagem.
RUN npm ci --workspace=backend --omit=dev --ignore-scripts \
 && rm -rf node_modules/prisma node_modules/typescript \
           node_modules/@prisma/engines node_modules/@prisma/engines-version \
           node_modules/@prisma/fetch-engine node_modules/@prisma/get-platform \
           node_modules/effect node_modules/fast-check \
 && npm cache clean --force

# O client já foi gerado no estágio `build` (com o CLI `prisma`, uma
# devDependency). Copiar o resultado em vez de gerar de novo aqui evita
# que `npx prisma generate` reinstale o CLI (~100 MB) numa imagem que só
# tem dependências de produção.
COPY --chown=node:node --from=build /app/node_modules/.prisma ./node_modules/.prisma

COPY --chown=node:node --from=build /app/backend/dist ./backend/dist
COPY --chown=node:node backend/ecosystem.config.cjs ./backend/ecosystem.config.cjs

# Diretório de uploads (montado como volume em produção)
RUN mkdir -p /app/backend/uploads

WORKDIR /app/backend
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3333/api/v1/saude || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["pm2-runtime", "start", "ecosystem.config.cjs", "--env", "production"]

# ─────────────── Estágio 4: migrator ───────────────────
# `prisma migrate deploy` (§7 do 08-CICD.md) roda num container à parte,
# construído com `--target migrator` a partir deste mesmo Dockerfile.
# Mantém o CLI `prisma` (e o que ele arrasta: engines, effect, typescript)
# fora da imagem `runtime`, que fica exposta o tempo todo e é a que o
# orçamento de 250 MB (issue #56) mede — o migrator só existe durante o
# deploy, seu tamanho não é o alvo dessa restrição.
FROM node:22-alpine AS migrator
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/package.json
WORKDIR /app/backend
ENTRYPOINT ["npx", "prisma"]
CMD ["migrate", "deploy"]
