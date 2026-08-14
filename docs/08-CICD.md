# 08 — CI/CD, Docker e Deploy

> **Documento:** Integração Contínua, Containerização e Publicação
> **Projeto:** Gerenciador de Finanças (PFM)
> **Infraestrutura:** VPS Hostinger · Ubuntu 24.04 LTS · Nginx · Docker · PM2 · Let's Encrypt
> **Versão:** 1.0.0 · **Data:** 2026-07-29 · **Status:** Vigente

---

## Sumário

1. [Visão geral do fluxo](#1-visão-geral-do-fluxo)
2. [Ambientes e secrets](#2-ambientes-e-secrets)
3. [Docker](#3-docker)
4. [Nginx e TLS](#4-nginx-e-tls)
5. [Provisionamento da VPS](#5-provisionamento-da-vps)
6. [Workflow de CI](#6-workflow-de-ci)
7. [Workflow de deploy em produção](#7-workflow-de-deploy-em-produção)
8. [Workflow de homologação](#8-workflow-de-homologação)
9. [Health check e rollback](#9-health-check-e-rollback)
10. [Backup e restauração](#10-backup-e-restauração)
11. [Runbook operacional](#11-runbook-operacional)
12. [Checklist do primeiro deploy](#12-checklist-do-primeiro-deploy)

---

## 1. Visão geral do fluxo

```mermaid
flowchart TB
    DEV["Desenvolvedor<br/>branch issue/*"]
    PR1["PR → staging"]
    CI["CI: tipos · lint · formato<br/>testes · cobertura · build"]
    STG["staging<br/>deploy automático"]
    HOMOL["Homologação<br/>staging.dominio"]
    PR2["PR: staging → main<br/>release de Milestone"]
    MAIN["main"]
    BUILD["Build: imagem API + artefato SPA"]
    DEPLOY["Deploy SSH → VPS"]
    HEALTH{"/saude/prontidao<br/>OK?"}
    PROD["Produção<br/>dominio"]
    RB["Rollback automático<br/>versão anterior"]

    DEV --> PR1 --> CI
    CI -- "verde" --> STG --> HOMOL --> PR2 --> MAIN
    CI -- "vermelho" --> DEV
    MAIN --> BUILD --> DEPLOY --> HEALTH
    HEALTH -- "sim" --> PROD
    HEALTH -- "não" --> RB --> PROD

    style PROD fill:#16A34A,color:#fff
    style RB fill:#DC2626,color:#fff
```

### 1.1 Gatilhos

| Evento                               | Workflow                        | Efeito                                 |
| ------------------------------------ | ------------------------------- | -------------------------------------- |
| `pull_request` → `staging` ou `main` | `ci.yml`                        | Verificação; merge bloqueado se falhar |
| `push` → `staging`                   | `ci.yml` + `deploy-staging.yml` | Publica em homologação                 |
| `push` → `main`                      | `deploy-producao.yml`           | **Publica em produção**                |
| `workflow_dispatch`                  | `deploy-producao.yml`           | Deploy manual (rollback, reexecução)   |

### 1.2 Princípios

| Princípio                           | Aplicação                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| **Um só caminho para produção**     | Merge em `main`. Não há deploy manual como rotina.                                   |
| **Portão automático**               | `/saude/prontidao` decide se o deploy vale; não há verificação visual como critério. |
| **Reversível**                      | Toda publicação guarda a versão anterior pronta para voltar.                         |
| **Backup antes de migrar**          | Nenhuma migration roda em produção sem dump imediatamente anterior.                  |
| **Segredo fora do repositório**     | Exclusivamente em GitHub Secrets e `.env` do servidor.                               |
| **Migration nunca reverte sozinha** | Rollback automático cobre a aplicação, não o schema (§9.3).                          |

---

## 2. Ambientes e secrets

### 2.1 Ambientes

| Ambiente    | URL                        | Branch    | Banco          | Backup |
| ----------- | -------------------------- | --------- | -------------- | ------ |
| Local       | `localhost:5173` / `:3333` | qualquer  | `pfm` (Docker) | —      |
| Homologação | `staging.<dominio>`        | `staging` | `pfm_staging`  | não    |
| Produção    | `<dominio>`                | `main`    | `pfm`          | diário |

Homologação e produção convivem na mesma VPS, com containers, portas, volumes e bancos separados. É a escolha econômica adequada ao porte do projeto; a separação lógica é rigorosa.

### 2.2 GitHub Secrets

Configurados em **Settings → Secrets and variables → Actions**, com _environments_ `producao` e `staging` distintos.

| Secret                                               | Escopo       | Finalidade                                        |
| ---------------------------------------------------- | ------------ | ------------------------------------------------- |
| `VPS_HOST`                                           | ambos        | IP ou hostname da VPS                             |
| `VPS_USUARIO`                                        | ambos        | Usuário de deploy (`deploy`)                      |
| `VPS_CHAVE_SSH`                                      | ambos        | Chave privada SSH (ed25519) do usuário de deploy  |
| `VPS_PORTA_SSH`                                      | ambos        | Porta SSH                                         |
| `DATABASE_URL`                                       | por ambiente | String de conexão do PostgreSQL                   |
| `POSTGRES_SENHA`                                     | por ambiente | Senha do banco                                    |
| `JWT_SEGREDO`                                        | por ambiente | Segredo de assinatura do JWT (≥ 64 caracteres)    |
| `SMTP_HOST` `SMTP_PORTA` `SMTP_USUARIO` `SMTP_SENHA` | por ambiente | Envio de e-mail                                   |
| `EMAIL_REMETENTE`                                    | por ambiente | Remetente exibido                                 |
| `URL_BASE_FRONTEND`                                  | por ambiente | Base dos links em e-mails                         |
| `ORIGENS_PERMITIDAS`                                 | por ambiente | Origens de CORS                                   |
| `TOKEN_METRICAS`                                     | por ambiente | Token da rota `/metricas`                         |
| `GHCR_TOKEN`                                         | ambos        | Publicação de imagem no GitHub Container Registry |

**Regras.** Chave SSH dedicada ao deploy, sem uso humano. Segredos rotacionados a cada 6 meses ou imediatamente após qualquer suspeita. Nenhum `echo` de secret em step de workflow — o mascaramento do GitHub não cobre transformações como `base64`.

### 2.3 `.env` do servidor

Vive em `/var/pfm/producao/.env` e `/var/pfm/staging/.env`, com permissão `600` e proprietário `deploy`. Gerado pelo pipeline a partir dos secrets, nunca versionado.

```bash
sudo chmod 600 /var/pfm/producao/.env
sudo chown deploy:deploy /var/pfm/producao/.env
```

---

## 3. Docker

### 3.1 Dockerfile do backend

`backend/Dockerfile` — multi-estágio, usuário não-root, `pm2-runtime` como PID 1 (ADR-008).

**Contexto de build = raiz do monorepo, não `./backend`.** O projeto usa npm workspaces com um único `package-lock.json` na raiz — `backend/` não tem lockfile próprio. Todo `docker build`/`docker/build-push-action` deste Dockerfile usa `context: .` com `file: backend/Dockerfile`; os `COPY` abaixo refletem isso (`backend/package.json`, não `package.json`).

```dockerfile
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
# preenchido, o overlayfs copiaria cada arquivo de novo (camada dobra de
# tamanho à toa — armadilha real, ver nota de tamanho da imagem abaixo).
RUN mkdir -p /app/backend && chown -R node:node /app

ENV NODE_ENV=production
ENV PORTA=3333

# Copiados já com --chown e instalados como `node` desde o início —
# mesma razão do chown acima.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node backend/prisma ./backend/prisma

USER node

# `@prisma/client` declara `prisma` (o CLI) como peerOptional — mesmo com
# --omit=dev, o hoisting do workspace mantém `prisma` e sua árvore de
# suporte (@prisma/engines, effect, fast-check, typescript) presos à
# árvore de produção, porque também são alcançáveis por essa aresta
# não-dev. ~130 MB que a imagem de runtime não usa (o client já vem
# gerado, copiado abaixo) — removidos explicitamente.
RUN npm ci --workspace=backend --omit=dev --ignore-scripts \
 && rm -rf node_modules/prisma node_modules/typescript \
           node_modules/@prisma/engines node_modules/@prisma/engines-version \
           node_modules/@prisma/fetch-engine node_modules/@prisma/get-platform \
           node_modules/effect node_modules/fast-check \
 && npm cache clean --force

# O client já foi gerado no estágio `build` (com o CLI `prisma`, uma
# devDependency) — copiar em vez de gerar de novo evita reinstalar o CLI
# aqui.
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
# `prisma migrate deploy` roda num container à parte, construído com
# `--target migrator` a partir deste mesmo Dockerfile (§7). Mantém o CLI
# `prisma` fora da imagem `runtime`, que fica exposta o tempo todo e é a
# que o orçamento de tamanho mede — o migrator só existe durante o
# deploy.
FROM node:22-alpine AS migrator
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/backend/package.json ./backend/package.json
WORKDIR /app/backend
ENTRYPOINT ["npx", "prisma"]
CMD ["migrate", "deploy"]
```

**Por que `pm2-runtime` e não `pm2 start`.** `pm2 start` desacopla e retorna, deixando o container sem processo em primeiro plano — o Docker o consideraria encerrado. `pm2-runtime` permanece em _foreground_, propaga sinais corretamente e escreve os logs em `stdout`/`stderr`, preservando a semântica de PID 1.

**Tamanho real da imagem.** `docker images`/`docker ps` mostram o tamanho do manifesto de attestation do BuildKit, não o da imagem que roda — para medir de verdade: `docker image inspect <imagem> --format "{{.Size}}"` (ou `docker save <imagem> | wc -c`). A imagem `runtime` mede ~131 MB dessa forma, dentro do orçamento de 250 MB (issue #56) — bem acima disso via `docker images` é esperado e não indica um problema.

### 3.2 Configuração do PM2

`backend/ecosystem.config.cjs`

```js
module.exports = {
  apps: [
    {
      name: 'pfm-api',
      script: './dist/index.js',
      exec_mode: 'cluster',
      instances: 'max', // um processo por núcleo (RNF-09)
      max_memory_restart: '400M',
      kill_timeout: 35000, // > 30s do encerramento gracioso da aplicação
      listen_timeout: 10000,
      wait_ready: true, // aguarda process.send('ready')
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      merge_logs: true,
      time: false, // timestamp já vem do Pino (JSON)
      env_production: {
        NODE_ENV: 'production',
        PORTA: 3333,
      },
    },
  ],
};
```

`kill_timeout` maior que a janela de encerramento gracioso da aplicação (30 s) evita que o PM2 mate um processo que ainda está finalizando requisições. `wait_ready` faz o PM2 só considerar a instância viva depois de ela sinalizar prontidão — sem isso, o _reload_ colocaria tráfego em processos que ainda não conectaram ao banco.

**Tarefas agendadas.** Rodam apenas na instância `0` (`process.env.NODE_APP_INSTANCE === '0'`). Sem esse guard, N instâncias executariam a mesma tarefa N vezes.

### 3.3 `docker-compose.prod.yml`

Compartilhado entre produção e homologação — só o `.env` muda (§8). Nome de container é único **por host**, não por projeto do compose, e os dois ambientes convivem na mesma VPS (§2.1); por isso nome de container e porta publicada são parametrizáveis, com o default de produção embutido.

```yaml
services:
  # `docker compose run --rm migrator` (nunca `up -d`, só via `run`):
  # imagem separada da `api` porque o CLI `prisma` (necessário só para
  # `migrate deploy`) não entra na imagem que fica no ar o tempo todo
  # (§3.1, estágio `runtime` vs. `migrator`).
  migrator:
    image: ghcr.io/${GITHUB_REPOSITORIO}/pfm-api-migrator:${TAG_IMAGEM:-latest}
    env_file: [.env]
    depends_on:
      postgres:
        condition: service_healthy
    networks: [pfm]
    profiles: ['migrate']

  api:
    image: ghcr.io/${GITHUB_REPOSITORIO}/pfm-api:${TAG_IMAGEM:-latest}
    container_name: ${NOME_CONTAINER_API:-pfm-api}
    restart: unless-stopped
    env_file: [.env]
    ports:
      - '127.0.0.1:${PORTA_API_PUBLICADA:-3333}:3333' # nunca 0.0.0.0
    volumes:
      - /var/pfm/uploads:/app/backend/uploads
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      resources:
        limits: { cpus: '1.5', memory: 1G }
        reservations: { memory: 256M }
    logging:
      driver: json-file
      options: { max-size: '10m', max-file: '5' }
    networks: [pfm]

  postgres:
    image: postgres:16-alpine
    container_name: ${NOME_CONTAINER_POSTGRES:-pfm-postgres}
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USUARIO}
      POSTGRES_PASSWORD: ${POSTGRES_SENHA}
      POSTGRES_DB: ${POSTGRES_BANCO}
      TZ: America/Sao_Paulo
    ports:
      - '127.0.0.1:${PORTA_POSTGRES_PUBLICADA:-5432}:5432' # apenas loopback
    volumes:
      - pfm_dados_postgres:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USUARIO} -d ${POSTGRES_BANCO}']
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    command:
      - postgres
      - -c
      - max_connections=100
      - -c
      - shared_buffers=256MB
    logging:
      driver: json-file
      options: { max-size: '10m', max-file: '3' }
    networks: [pfm]

volumes:
  pfm_dados_postgres:

networks:
  pfm:
    driver: bridge
```

O `ports` com prefixo `127.0.0.1` é deliberado: sem ele, o Docker abre a porta em todas as interfaces e **contorna o UFW**, expondo o PostgreSQL à internet mesmo com o firewall aparentemente fechado. É uma das armadilhas mais comuns de Docker em VPS.

`/app/backend/uploads` (não `/app/uploads`): o WORKDIR da imagem runtime é `/app/backend` (§3.1, contexto de monorepo). No host, `/var/pfm/uploads` precisa estar `chown 1000:1000` — o processo dentro do container roda como `node` (uid/gid 1000 fixo da imagem `node:22-alpine`), não como o usuário `deploy` do host (`infra/provisionar.sh` já faz isso).

### 3.4 Compose de desenvolvimento

`docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ['5432:5432']
    environment:
      POSTGRES_USER: pfm
      POSTGRES_PASSWORD: pfm_local
      POSTGRES_DB: pfm
    volumes: [pfm_dev:/var/lib/postgresql/data]
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U pfm']
      interval: 5s
      retries: 10

  postgres_teste:
    image: postgres:16-alpine
    ports: ['5433:5432']
    environment:
      POSTGRES_USER: pfm
      POSTGRES_PASSWORD: pfm_local
      POSTGRES_DB: pfm_teste
    tmpfs: [/var/lib/postgresql/data] # em memória: testes rápidos, dados descartáveis
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U pfm']
      interval: 5s
      retries: 10

  mailpit:
    image: axllent/mailpit:latest
    ports: ['1025:1025', '8025:8025'] # SMTP · interface web

volumes:
  pfm_dev:
```

### 3.5 Dockerfile do frontend

Produz apenas o artefato estático (ADR-009) — não há container de frontend em produção. **Não é o que o pipeline de deploy usa**: o frontend é buildado nativamente no runner (§7), sem Docker — este Dockerfile existe para reproduzir o mesmo artefato localmente. Contexto = raiz do monorepo, mesma razão do backend (§3.1).

```dockerfile
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
```

As variáveis `VITE_*` são resolvidas em **tempo de build** e ficam no _bundle_. Tudo que entra aqui é público — nenhum segredo, em nenhuma hipótese. `VITE_AMBIENTE=staging` (só no build de homologação, §8) aciona o `BannerHomologacao` do frontend.

---

## 4. Nginx e TLS

### 4.1 Configuração do Nginx

`/etc/nginx/sites-available/pfm`

```nginx
# ── Redireciona HTTP → HTTPS e atende o desafio ACME ──
server {
    listen 80;
    listen [::]:80;
    server_name dominio.com www.dominio.com;

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name dominio.com www.dominio.com;

    # ── TLS ──
    ssl_certificate     /etc/letsencrypt/live/dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dominio.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/dominio.com/chain.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_stapling on;
    ssl_stapling_verify on;

    # ── Cabeçalhos de segurança ──
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header X-Frame-Options           "DENY" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy   "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;

    # ── Compressão ──
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript
               text/xml application/xml image/svg+xml;

    # Compatível com o limite de 5 MB por anexo, com folga de multipart
    client_max_body_size 6M;
    client_body_timeout 30s;

    # ── API ──
    location /api/ {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id      $request_id;

        proxy_connect_timeout 10s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
        proxy_buffering off;              # streaming de anexos e exportações
    }

    # ── SPA ──
    root /var/www/pfm;
    index index.html;

    # Assets com hash no nome: cache agressivo é seguro
    location ~* \.(js|css|woff2?|png|jpe?g|svg|webp|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # index.html nunca em cache: garante que o deploy seja visto
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }

    # Fallback do React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    access_log /var/log/nginx/pfm-acesso.log;
    error_log  /var/log/nginx/pfm-erro.log warn;
}
```

Duas configurações merecem atenção porque sua ausência produz falhas confusas:

- **`X-Forwarded-For` + `trust proxy` na aplicação.** Sem os dois, todo o _rate limit_ vê o IP do proxy e um único usuário mal-intencionado bloqueia a aplicação para todos.
- **`index.html` sem cache.** Com cache, o navegador continua pedindo _chunks_ da versão antiga após o deploy e a aplicação quebra com erro de módulo não encontrado.

### 4.2 Homologação

Mesmo bloco em `staging.<dominio>`, com duas diferenças: proxy para `127.0.0.1:3334`, e autenticação básica mais `robots.txt` bloqueando indexação.

```nginx
location / {
    auth_basic "Homologacao PFM";
    auth_basic_user_file /etc/nginx/.htpasswd-staging;
    try_files $uri $uri/ /index.html;
}
```

### 4.3 Certificado Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx

sudo certbot --nginx \
  -d dominio.com -d www.dominio.com -d staging.dominio.com \
  --email samuel.demarco.dev@gmail.com \
  --agree-tos --no-eff-email --redirect

# Renovação automática (timer do systemd, já instalado pelo pacote)
systemctl list-timers | grep certbot
sudo certbot renew --dry-run          # ensaio obrigatório
```

Hook de recarga do Nginx após a renovação:

```bash
# /etc/letsencrypt/renewal-hooks/deploy/recarregar-nginx.sh
#!/usr/bin/env bash
systemctl reload nginx
```

Sem esse hook, o certificado renova mas o Nginx continua servindo o antigo até o próximo _reload_ — e o problema só aparece quando o certificado antigo expira.

---

## 5. Provisionamento da VPS

`infra/provisionar.sh` — idempotente, executável quantas vezes for necessário.

```bash
#!/usr/bin/env bash
set -euo pipefail

USUARIO_DEPLOY="deploy"

echo "▶ Atualizando o sistema"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y -qq curl git ufw fail2ban unattended-upgrades \
                       ca-certificates gnupg postgresql-client

echo "▶ Timezone e NTP"
timedatectl set-timezone America/Sao_Paulo
timedatectl set-ntp true

echo "▶ Usuário de deploy"
if ! id "$USUARIO_DEPLOY" &>/dev/null; then
  adduser --disabled-password --gecos "" "$USUARIO_DEPLOY"
fi

echo "▶ Docker"
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
usermod -aG docker "$USUARIO_DEPLOY"

echo "▶ Endurecimento do SSH"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'            /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/'  /etc/ssh/sshd_config
systemctl restart ssh

echo "▶ Firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "▶ fail2ban"
systemctl enable --now fail2ban

echo "▶ Estrutura de diretórios"
mkdir -p /var/pfm/{uploads,backups,releases,exportacoes}
mkdir -p /var/pfm/{producao,staging}
mkdir -p /var/www/{pfm,pfm-staging,certbot}
chown -R "$USUARIO_DEPLOY:$USUARIO_DEPLOY" /var/pfm /var/www/pfm /var/www/pfm-staging
chmod 750 /var/pfm/uploads /var/pfm/backups

# /var/pfm/uploads é bind mount de dentro do container (docker-compose.prod.yml),
# onde o processo roda como o usuário `node` da imagem node:22-alpine — uid/gid
# 1000 fixo, não o do usuário `deploy` do host. Sem isto, a API sobe mas
# /api/v1/saude/prontidao reporta "armazenamento: EACCES" (achado no ensaio
# de rollback da issue #61).
chown 1000:1000 /var/pfm/uploads

echo "▶ Swap de 2 GB"
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "▶ Nginx"
apt-get install -y -qq nginx
systemctl enable --now nginx

echo "✔ Provisionamento concluído"
```

O swap de 2 GB não é luxo: uma VPS de 2 GB de RAM rodando build, PostgreSQL e N processos Node encontra o _OOM killer_ sem ele — e o processo morto é normalmente o PostgreSQL.

---

## 6. Workflow de CI

`.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main, staging]
  push:
    branches: [staging]
  workflow_call: {} # reutilizado pelo job `verificar` de deploy-producao.yml e deploy-staging.yml

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSAO: '22'

jobs:
  segredos:
    name: Varredura de segredos
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  backend:
    name: Backend
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: pfm
          POSTGRES_PASSWORD: pfm_teste
          POSTGRES_DB: pfm_teste
        ports: ['5433:5432']
        options: >-
          --health-cmd "pg_isready -U pfm"
          --health-interval 10s --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://pfm:pfm_teste@localhost:5433/pfm_teste?schema=public
      JWT_SEGREDO: segredo-de-teste-com-mais-de-32-caracteres-aqui
      NODE_ENV: test
    defaults:
      run: { working-directory: ./backend }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSAO }}
          cache: npm
          cache-dependency-path: backend/package-lock.json

      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy

      - name: Checagem de tipos
        run: npm run tipos
      - name: Lint
        run: npm run lint
      - name: Formatação
        run: npm run formatar:check
      - name: Testes com cobertura
        run: npm run teste:cobertura
      - name: Build
        run: npm run build

      - name: Portão de cobertura
        run: |
          node -e "
          const c = require('./coverage/coverage-summary.json').total;
          const falhas = [];
          if (c.statements.pct < 80) falhas.push('statements ' + c.statements.pct + '% < 80%');
          if (c.branches.pct   < 75) falhas.push('branches '   + c.branches.pct   + '% < 75%');
          if (falhas.length) { console.error('Cobertura insuficiente: ' + falhas.join(', ')); process.exit(1); }
          console.log('Cobertura OK: ' + c.statements.pct + '% statements, ' + c.branches.pct + '% branches');
          "

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: cobertura-backend
          path: backend/coverage/
          retention-days: 7

  frontend:
    name: Frontend
    runs-on: ubuntu-latest
    defaults:
      run: { working-directory: ./frontend }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSAO }}
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - run: npm ci
      - name: Checagem de tipos
        run: npm run tipos
      - name: Lint
        run: npm run lint
      - name: Testes com cobertura
        run: npm run teste:cobertura
      - name: Build
        run: npm run build
        env:
          VITE_API_URL: http://localhost:3333/api/v1
          VITE_AMBIENTE: test

      - name: Orçamento de bundle
        run: |
          # RNF-04 limita o bundle *inicial* — o que o navegador baixa para
          # pintar a primeira tela. São os arquivos que o `index.html`
          # referencia: o entry, os chunks em `modulepreload` e o CSS. As
          # demais telas entram por `React.lazy` e não contam; somar todos
          # os chunks de `assets/` mediria o app inteiro e cresceria a cada
          # tela nova, reprovando um bundle que cabe folgado no orçamento.
          ARQUIVOS=$(grep -oE '(src|href)="/assets/[^"]+"' dist/index.html \
                     | sed -E 's|.*"/assets/(.*)"|\1|' | sort -u)

          if [ -z "$ARQUIVOS" ]; then
            echo "::error::Nenhum ativo referenciado em index.html — o portão mediria zero"
            exit 1
          fi

          TAMANHO=0
          for ARQUIVO in $ARQUIVOS; do
            BYTES=$(gzip -c "dist/assets/${ARQUIVO}" | wc -c)
            echo "  ${ARQUIVO}: ${BYTES} bytes"
            TAMANHO=$((TAMANHO + BYTES))
          done

          LIMITE=256000
          echo "Bundle inicial gzip: ${TAMANHO} bytes (limite ${LIMITE})"
          if [ "$TAMANHO" -gt "$LIMITE" ]; then
            echo "::error::Bundle inicial excede o orçamento de 250 KB (RNF-04)"
            exit 1
          fi

  resultado:
    name: Resultado da CI
    if: always()
    needs: [segredos, backend, frontend]
    runs-on: ubuntu-latest
    steps:
      - name: Consolidar
        run: |
          if [ "${{ contains(needs.*.result, 'failure') }}" = "true" ]; then
            echo "::error::Um ou mais jobs falharam"; exit 1
          fi
          echo "Todos os jobs passaram"
```

O job `resultado` existe para dar à proteção de branch um único _status check_ obrigatório — sem ele, acrescentar um job novo exige reconfigurar a proteção manualmente e o novo job vira opcional por descuido.

---

## 7. Workflow de deploy em produção

`.github/workflows/deploy-producao.yml`

```yaml
name: Deploy Produção

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      tag_imagem:
        description: 'Tag da imagem a publicar (vazio = SHA atual)'
        required: false

concurrency:
  group: deploy-producao
  cancel-in-progress: false # nunca cancelar um deploy em andamento

env:
  NODE_VERSAO: '22'
  REGISTRO: ghcr.io
  # O nome da imagem sai de `github.repository` em minúsculas — ver o passo
  # `imagem` no job `construir`. Não dá para minuscular aqui: `env` de
  # workflow não executa expansão de shell.

jobs:
  # ─────────────────────────────────────────────
  verificar:
    name: Verificar
    uses: ./.github/workflows/ci.yml
    secrets: inherit

  # ─────────────────────────────────────────────
  # Enquanto a VPS não existe, publicar e implantar não são possíveis — e a
  # falha não diz nada de útil: é só a ausência de um servidor. Este job
  # traduz essa ausência em "pular", não em "falhar", para que um merge em
  # `main` continue verde até haver onde publicar.
  #
  # Precisa ser um job: o contexto `secrets` não existe em `if:` de job, só
  # dentro de um passo. `VPS_HOST` é a sentinela porque sem ela não há
  # sequer para onde abrir conexão.
  ambiente:
    name: Ambiente configurado?
    runs-on: ubuntu-latest
    environment:
      name: producao
    outputs:
      configurado: ${{ steps.checar.outputs.valor }}
    steps:
      - id: checar
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
        run: |
          if [ -n "$VPS_HOST" ]; then
            echo 'valor=true' >> "$GITHUB_OUTPUT"
            echo '::notice::VPS configurada — build e implantação seguem.'
          else
            echo 'valor=false' >> "$GITHUB_OUTPUT"
            echo '::notice::VPS_HOST ausente — build e implantação puladas. Ver §12.'
          fi

  # ─────────────────────────────────────────────
  construir:
    name: Construir artefatos
    needs: [verificar, ambiente]
    if: needs.ambiente.outputs.configurado == 'true'
    runs-on: ubuntu-latest
    # Sem isto, secrets.URL_BASE_FRONTEND (secret por-ambiente, §2.2) não
    # resolveria aqui — só jobs com `environment:` enxergam o valor do
    # ambiente correspondente.
    environment:
      name: producao
    permissions:
      contents: read
      packages: write
    outputs:
      tag: ${{ steps.tag.outputs.valor }}
      imagem: ${{ steps.imagem.outputs.base }}
    steps:
      - uses: actions/checkout@v4

      - id: tag
        run: echo "valor=${{ inputs.tag_imagem || github.sha }}" >> "$GITHUB_OUTPUT"

      # `github.repository` preserva as maiúsculas do dono e do repositório,
      # e o Docker recusa maiúscula em nome de imagem: "repository name must
      # be lowercase". Sem isto o build falha ao aplicar a tag, antes de
      # publicar coisa alguma.
      - id: imagem
        run: echo "base=${GITHUB_REPOSITORY,,}" >> "$GITHUB_OUTPUT"

      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRO }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Contexto = raiz do monorepo (§3.1) — `--target` é obrigatório:
      # sem ele o build pega o último estágio do Dockerfile (`migrator`),
      # não `runtime`.
      - name: Build e push da imagem da API (runtime)
        uses: docker/build-push-action@v5
        with:
          context: .
          file: backend/Dockerfile
          target: runtime
          push: true
          tags: |
            ${{ env.REGISTRO }}/${{ steps.imagem.outputs.base }}/pfm-api:${{ steps.tag.outputs.valor }}
            ${{ env.REGISTRO }}/${{ steps.imagem.outputs.base }}/pfm-api:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build e push da imagem de migration
        uses: docker/build-push-action@v5
        with:
          context: .
          file: backend/Dockerfile
          target: migrator
          push: true
          tags: |
            ${{ env.REGISTRO }}/${{ steps.imagem.outputs.base }}/pfm-api-migrator:${{ steps.tag.outputs.valor }}
            ${{ env.REGISTRO }}/${{ steps.imagem.outputs.base }}/pfm-api-migrator:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSAO }}
          cache: npm
          cache-dependency-path: package-lock.json

      # Build nativo no runner (não via Docker): o frontend não tem
      # container próprio em produção (ADR-009).
      - name: Build do frontend
        env:
          VITE_API_URL: ${{ secrets.URL_BASE_FRONTEND }}/api/v1
          VITE_AMBIENTE: production
          VITE_NOME_APP: 'Gerenciador de Finanças'
        run: |
          npm ci
          npm run build --workspace=frontend
          tar -czf frontend-dist.tar.gz -C frontend/dist .

      - uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend-dist.tar.gz
          retention-days: 3

  # ─────────────────────────────────────────────
  implantar:
    name: Implantar na VPS
    needs: [construir, ambiente]
    if: needs.ambiente.outputs.configurado == 'true'
    runs-on: ubuntu-latest
    # `environment.url` só aceita os contextos env/github/inputs/job/matrix/
    # needs/runner/steps/strategy/vars — "secrets" não é um deles.
    environment:
      name: producao
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { name: frontend-dist }

      - name: Configurar SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.VPS_CHAVE_SSH }}" > ~/.ssh/id_deploy
          chmod 600 ~/.ssh/id_deploy
          ssh-keyscan -p ${{ secrets.VPS_PORTA_SSH }} -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts

      - name: Enviar artefatos e scripts
        run: |
          scp -i ~/.ssh/id_deploy -P ${{ secrets.VPS_PORTA_SSH }} \
            frontend-dist.tar.gz \
            docker-compose.prod.yml \
            infra/verificar-saude.sh infra/reverter.sh infra/backup.sh \
            ${{ secrets.VPS_USUARIO }}@${{ secrets.VPS_HOST }}:/var/pfm/producao/

      - name: Gerar .env no servidor
        run: |
          ssh -i ~/.ssh/id_deploy -p ${{ secrets.VPS_PORTA_SSH }} \
            ${{ secrets.VPS_USUARIO }}@${{ secrets.VPS_HOST }} \
            "cat > /var/pfm/producao/.env && chmod 600 /var/pfm/producao/.env" <<'ENVEOF'
          NODE_ENV=production
          PORTA=3333
          URL_BASE_API=${{ secrets.URL_BASE_FRONTEND }}
          TAG_IMAGEM=${{ needs.construir.outputs.tag }}
          GITHUB_REPOSITORIO=${{ needs.construir.outputs.imagem }}
          DATABASE_URL=${{ secrets.DATABASE_URL }}
          POSTGRES_USUARIO=${{ secrets.POSTGRES_USUARIO }}
          POSTGRES_SENHA=${{ secrets.POSTGRES_SENHA }}
          POSTGRES_BANCO=${{ secrets.POSTGRES_BANCO }}
          JWT_SEGREDO=${{ secrets.JWT_SEGREDO }}
          JWT_EXPIRACAO=15m
          REFRESH_TOKEN_EXPIRACAO_DIAS=7
          REFRESH_TOKEN_EXPIRACAO_DIAS_LEMBRAR=30
          BCRYPT_CUSTO=12
          ORIGENS_PERMITIDAS=${{ secrets.ORIGENS_PERMITIDAS }}
          URL_BASE_FRONTEND=${{ secrets.URL_BASE_FRONTEND }}
          SMTP_HOST=${{ secrets.SMTP_HOST }}
          SMTP_PORTA=${{ secrets.SMTP_PORTA }}
          SMTP_USUARIO=${{ secrets.SMTP_USUARIO }}
          SMTP_SENHA=${{ secrets.SMTP_SENHA }}
          SMTP_SEGURO=true
          EMAIL_REMETENTE=${{ secrets.EMAIL_REMETENTE }}
          DIRETORIO_UPLOADS=/app/backend/uploads
          TAMANHO_MAXIMO_ANEXO_MB=5
          TAMANHO_MAXIMO_AVATAR_MB=2
          RATE_LIMIT_JANELA_MINUTOS=15
          RATE_LIMIT_MAXIMO=1000
          NIVEL_LOG=info
          HABILITAR_TAREFAS_AGENDADAS=true
          TOKEN_METRICAS=${{ secrets.TOKEN_METRICAS }}
          ENVEOF

      - name: Executar deploy
        env:
          TAG: ${{ needs.construir.outputs.tag }}
        run: |
          ssh -i ~/.ssh/id_deploy -p ${{ secrets.VPS_PORTA_SSH }} \
            ${{ secrets.VPS_USUARIO }}@${{ secrets.VPS_HOST }} \
            "TAG_NOVA='${TAG}' bash -s" <<'DEPLOYEOF'
          set -euo pipefail
          cd /var/pfm/producao
          chmod +x verificar-saude.sh reverter.sh backup.sh

          echo "▶ Registrando a versão atual para rollback"
          TAG_ANTERIOR=$(grep -oP '(?<=^TAG_IMAGEM=).*' .env.anterior 2>/dev/null || echo "")
          echo "$TAG_ANTERIOR" > .tag-anterior
          cp .env .env.anterior 2>/dev/null || true

          echo "▶ Backup pré-migration"
          ./backup.sh pre-deploy

          echo "▶ Baixando as novas imagens"
          docker compose -f docker-compose.prod.yml pull api
          docker compose -f docker-compose.prod.yml --profile migrate pull migrator

          echo "▶ Aplicando migrations"
          docker compose -f docker-compose.prod.yml run --rm migrator

          echo "▶ Subindo a nova versão"
          docker compose -f docker-compose.prod.yml up -d --no-deps api

          echo "▶ Verificando prontidão"
          if ! ./verificar-saude.sh; then
            echo "::error::Health check falhou — revertendo"
            ./reverter.sh
            exit 1
          fi

          echo "▶ Publicando o frontend"
          tar -xzf frontend-dist.tar.gz -C /var/www/pfm --overwrite
          rm -f frontend-dist.tar.gz

          echo "▶ Limpando imagens antigas (mantém as 3 últimas)"
          docker image prune -af --filter "until=168h" || true

          echo "$(date -Iseconds) SUCESSO ${TAG_NOVA} (anterior: ${TAG_ANTERIOR})" \
            >> /var/pfm/releases/historico.log

          echo "✔ Deploy concluído"
          DEPLOYEOF

      - name: Verificação externa pós-deploy
        run: |
          sleep 5
          RESP=$(curl -fsS "${{ secrets.URL_BASE_FRONTEND }}/api/v1/saude/prontidao")
          echo "$RESP"
          echo "$RESP" | grep -q '"status":"pronto"' || { echo "::error::Prontidão externa falhou"; exit 1; }
          curl -fsSI "${{ secrets.URL_BASE_FRONTEND }}" | head -1

      - name: Registrar falha
        if: failure()
        run: echo "::error::Deploy de produção falhou. Consulte /var/pfm/releases/historico.log na VPS."
```

A tag da versão anterior vem de `.env.anterior` (não mais de `docker inspect`/label OCI): como agora há duas imagens por deploy (`pfm-api` e `pfm-api-migrator`), a label de revisão deixou de ser uma fonte única e confiável — o arquivo `.env.anterior`, copiado antes de cada deploy, já é a fonte de verdade usada pelo `reverter.sh` (§9.2).

Detalhes que evitam problemas reais:

- **`cancel-in-progress: false`.** Cancelar um deploy no meio deixa o sistema em estado indeterminado — migrations aplicadas com imagem antiga, por exemplo.
- **Heredoc do `.env` citado (`<<'ENVEOF'`).** Sem aspas no delimitador, a shell do runner reexpandiria localmente qualquer `$` que apareça dentro do VALOR de um secret (já substituído pelo GitHub Actions antes da shell rodar) — achado com `shellcheck` (SC2087) rodando os workflows.
- **`--no-deps api`.** Sobe só a API; o PostgreSQL não é reiniciado a cada deploy.
- **`migrate deploy` em container efêmero.** Roda antes de a nova versão receber tráfego, e sua falha interrompe o deploy sem tocar no container que está servindo.
- **Verificação externa após a interna.** A checagem interna valida o container; a externa valida o caminho completo, incluindo Nginx e TLS.

---

## 8. Workflow de homologação

`.github/workflows/deploy-staging.yml` reproduz a estrutura de produção — incluindo o job `ambiente`, que pula build e implantação enquanto `VPS_HOST` não existir — com o mesmo `docker-compose.prod.yml` (§3.3) apontado por um `.env` diferente:

| Aspecto                 | Produção            | Homologação                       |
| ----------------------- | ------------------- | --------------------------------- |
| Gatilho                 | `push` em `main`    | `push` em `staging`               |
| `environment` do job    | `producao`          | `staging`                         |
| Diretório               | `/var/pfm/producao` | `/var/pfm/staging`                |
| Container da API        | `pfm-api`           | `pfm-staging-api`                 |
| Container do Postgres   | `pfm-postgres`      | `pfm-staging-postgres`            |
| Porta da API publicada  | 3333                | 3334                              |
| Porta do Postgres       | 5432                | 5433                              |
| Tag de imagem adicional | `latest`            | `staging-latest`                  |
| Backup pré-migration    | obrigatório         | dispensado                        |
| Rollback automático     | sim                 | não (falha só gera `::warning::`) |
| Banco                   | `pfm`               | `pfm_staging`                     |
| Frontend                | `/var/www/pfm`      | `/var/www/pfm-staging`            |
| `cancel-in-progress`    | `false`             | `true`                            |

Nome de container é único por host, não por projeto do compose — sem parametrizar `NOME_CONTAINER_API`/`NOME_CONTAINER_POSTGRES`/`PORTA_*_PUBLICADA` no `.env` (§3.3), o segundo `docker compose up` (de qualquer um dos dois ambientes, a depender da ordem) falharia tentando reusar um nome ou uma porta do host já ocupados pelo outro.

Os secrets usam os **mesmos nomes** de produção (`URL_BASE_FRONTEND`, `DATABASE_URL`, `POSTGRES_USUARIO` etc.) — são os GitHub Environments "producao" e "staging" que escopam um valor diferente para o mesmo nome de secret (§2.2), não um sufixo `_STAGING` no nome. Por isso todo job que precisa desses secrets, inclusive `construir` (que builda o frontend com `VITE_API_URL` derivado de `URL_BASE_FRONTEND`), declara `environment:` — sem isso o valor do ambiente certo não resolve.

Rollback automático em homologação seria contraproducente: o objetivo do ambiente é justamente expor a versão quebrada para diagnóstico.

---

## 9. Health check e rollback

### 9.1 `infra/verificar-saude.sh`

```bash
#!/usr/bin/env bash
set -uo pipefail

URL="${URL_SAUDE:-http://127.0.0.1:3333/api/v1/saude/prontidao}"
TENTATIVAS="${TENTATIVAS:-18}"      # 18 × 5s = 90s
INTERVALO="${INTERVALO:-5}"
CONTAINER_API="${CONTAINER_API:-pfm-api}" # staging usa pfm-staging-api (mesma VPS que produção, §8)

echo "Verificando prontidão em ${URL} (até $((TENTATIVAS * INTERVALO))s)"

for i in $(seq 1 "$TENTATIVAS"); do
  RESPOSTA=$(curl -fsS --max-time 5 "$URL" 2>/dev/null || echo "")

  if echo "$RESPOSTA" | grep -q '"status":"pronto"'; then
    # Não basta o HTTP 200: toda verificação precisa estar ok
    if echo "$RESPOSTA" | grep -q '"status":"erro"'; then
      echo "  [$i/$TENTATIVAS] responde, mas há verificação com erro:"
      echo "  $RESPOSTA"
    else
      echo "✔ Serviço pronto após $((i * INTERVALO))s"
      echo "$RESPOSTA"
      exit 0
    fi
  else
    echo "  [$i/$TENTATIVAS] ainda não pronto"
  fi

  sleep "$INTERVALO"
done

echo "✖ Serviço não ficou pronto em $((TENTATIVAS * INTERVALO))s"
echo "── Últimas 60 linhas do log da API ──"
docker logs "$CONTAINER_API" --tail 60 2>&1 || true
exit 1
```

Verificar `"status":"pronto"` e a ausência de `"status":"erro"` — não apenas o código HTTP — é o que impede publicar uma versão que sobe, responde, mas não consegue falar com o banco.

### 9.2 `infra/reverter.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /var/pfm/producao

TAG_ANTERIOR=$(cat .tag-anterior 2>/dev/null || echo "")

if [ -z "$TAG_ANTERIOR" ]; then
  echo "✖ Nenhuma versão anterior registrada. Rollback automático impossível."
  echo "  Ação manual necessária — consulte o runbook (08-CICD.md §11)."
  echo "$(date -Iseconds) FALHA_SEM_ROLLBACK" >> /var/pfm/releases/historico.log
  exit 1
fi

echo "▶ Revertendo para ${TAG_ANTERIOR}"

sed -i "s/^TAG_IMAGEM=.*/TAG_IMAGEM=${TAG_ANTERIOR}/" .env

docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api

if ./verificar-saude.sh; then
  echo "✔ Rollback concluído: ${TAG_ANTERIOR} operante"
  echo "$(date -Iseconds) ROLLBACK_OK para ${TAG_ANTERIOR}" >> /var/pfm/releases/historico.log
  exit 0
fi

echo "✖ Rollback executado mas a versão anterior também não responde."
echo "  INCIDENTE GRAVE — intervenção manual imediata (runbook §11.3)."
echo "$(date -Iseconds) ROLLBACK_FALHOU" >> /var/pfm/releases/historico.log
exit 1
```

### 9.3 Migrations no rollback

**A migration não é revertida automaticamente.** É uma decisão deliberada: reverter schema automaticamente pode destruir dados gravados entre a migration e a detecção da falha, causando dano maior que a indisponibilidade que se pretendia evitar.

O rollback automático cobre apenas a **imagem da aplicação**. Se a versão anterior for incompatível com o schema já migrado, o `verificar-saude.sh` falha de novo e o script encerra pedindo intervenção manual.

É por isso que migrations destrutivas exigem plano de duas fases ([03-DATABASE.md §9.1](03-DATABASE.md#91-regras)): na fase 1 o schema é retrocompatível, e o rollback da aplicação funciona sem tocar no banco.

---

## 10. Backup e restauração

### 10.1 `infra/backup.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ROTULO="${1:-diario}"
DIRETORIO="/var/pfm/backups"
DATA=$(date +%Y%m%d-%H%M)
ARQUIVO="${DIRETORIO}/pfm-${ROTULO}-${DATA}.dump"
TAMANHO_MINIMO=10240                     # 10 KB: abaixo disso, dump inválido

mkdir -p "$DIRETORIO"
set -a; source /var/pfm/producao/.env; set +a

# Sem este trap, um pg_dump que falha antes de terminar (banco fora do ar,
# credencial errada) deixa um arquivo vazio/parcial em $ARQUIVO — a checagem
# de tamanho abaixo nunca roda porque `set -e` já abortou o script na
# própria linha do pg_dump, e sem limpeza isso também apagaria
# silenciosamente um backup bom anterior de mesmo nome (timestamp por
# minuto). Achado rodando de verdade contra um banco inexistente (issue #63).
SUCESSO=false
limpar_backup_incompleto() {
  if [ "$SUCESSO" = false ] && [ -f "$ARQUIVO" ]; then
    rm -f "$ARQUIVO"
  fi
}
trap limpar_backup_incompleto EXIT

echo "▶ Backup do banco (${ROTULO})"
docker exec "${NOME_CONTAINER_POSTGRES:-pfm-postgres}" pg_dump \
  -U "$POSTGRES_USUARIO" -d "$POSTGRES_BANCO" \
  --format=custom --compress=9 > "$ARQUIVO"

TAMANHO=$(stat -c%s "$ARQUIVO")
if [ "$TAMANHO" -lt "$TAMANHO_MINIMO" ]; then
  echo "✖ Backup suspeito: ${TAMANHO} bytes"
  exit 1
fi

echo "▶ Verificando integridade"
if ! pg_restore --list "$ARQUIVO" > /dev/null 2>&1; then
  echo "✖ Backup corrompido — descartado"
  exit 1
fi

SUCESSO=true
echo "✔ Banco: ${ARQUIVO} ($(numfmt --to=iec "$TAMANHO"))"

if [ "$ROTULO" = "diario" ]; then
  echo "▶ Backup dos anexos"
  tar -czf "${DIRETORIO}/uploads-${DATA}.tar.gz" -C /var/pfm uploads

  # `|| true`: sob `set -e -o pipefail`, o `ls` de um glob sem nenhum
  # arquivo correspondente (comum na primeira execução — ainda não existe
  # nenhum pfm-pre-deploy-*.dump) sai com status != 0 mesmo com
  # `2>/dev/null`, o que abortava o script ANTES de registrar o backup que
  # acabou de ser feito com sucesso (achado rodando de verdade contra um
  # banco novo, sem histórico prévio — issue #63).
  echo "▶ Aplicando retenção (7 diários, 4 semanais)"
  ls -1t "${DIRETORIO}"/pfm-diario-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f || true
  ls -1t "${DIRETORIO}"/uploads-*.tar.gz  2>/dev/null | tail -n +8 | xargs -r rm -f || true
  ls -1t "${DIRETORIO}"/pfm-pre-deploy-*.dump 2>/dev/null | tail -n +6 | xargs -r rm -f || true
fi

echo "$(date -Iseconds) BACKUP_OK ${ARQUIVO} ${TAMANHO}" >> /var/pfm/releases/historico.log
```

Os dois bugs acima (arquivo parcial sem limpeza, `ls` sem correspondência abortando o script) só apareceram rodando o script de verdade contra um Postgres real — nenhum dos dois é visível lendo o script isoladamente.

### 10.2 Agendamento

`/etc/systemd/system/pfm-backup.service`

```ini
[Unit]
Description=Backup diário do PFM
After=docker.service

[Service]
Type=oneshot
User=deploy
ExecStart=/var/pfm/producao/backup.sh diario
```

`/etc/systemd/system/pfm-backup.timer`

```ini
[Unit]
Description=Executa o backup do PFM diariamente às 03:30

[Timer]
OnCalendar=*-*-* 03:30:00
Persistent=true                # executa se o servidor estava desligado no horário
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pfm-backup.timer
systemctl list-timers pfm-backup.timer
```

### 10.3 `infra/restaurar.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

ARQUIVO="${1:?Uso: restaurar.sh <arquivo.dump> [banco_destino]}"
BANCO_DESTINO="${2:-pfm_restauracao}"

set -a; source /var/pfm/producao/.env; set +a

echo "▶ Restaurando ${ARQUIVO} em ${BANCO_DESTINO}"

if [ "$BANCO_DESTINO" = "$POSTGRES_BANCO" ]; then
  echo "⚠  DESTINO É O BANCO DE PRODUÇÃO."
  read -rp "   Digite RESTAURAR PRODUCAO para confirmar: " CONFIRMA
  [ "$CONFIRMA" = "RESTAURAR PRODUCAO" ] || { echo "Abortado."; exit 1; }
  ./backup.sh pre-restauracao
fi

CONTAINER_POSTGRES="${NOME_CONTAINER_POSTGRES:-pfm-postgres}"

docker exec -i "$CONTAINER_POSTGRES" psql -U "$POSTGRES_USUARIO" -d postgres \
  -c "DROP DATABASE IF EXISTS ${BANCO_DESTINO};" \
  -c "CREATE DATABASE ${BANCO_DESTINO};"

docker exec -i "$CONTAINER_POSTGRES" pg_restore \
  -U "$POSTGRES_USUARIO" -d "$BANCO_DESTINO" \
  --clean --if-exists --no-owner < "$ARQUIVO"

echo "▶ Verificação: contagem de linhas por tabela"
docker exec -i "$CONTAINER_POSTGRES" psql -U "$POSTGRES_USUARIO" -d "$BANCO_DESTINO" -c "
  SELECT relname AS tabela, n_live_tup AS linhas
  FROM pg_stat_user_tables
  ORDER BY n_live_tup DESC
  LIMIT 25;"

echo "✔ Restauração concluída em ${BANCO_DESTINO}"
```

### 10.4 Verificação mensal

Tarefa recorrente obrigatória, primeira segunda-feira do mês:

```bash
sudo -u deploy /var/pfm/producao/restaurar.sh \
  "$(ls -1t /var/pfm/backups/pfm-diario-*.dump | head -1)" \
  pfm_verificacao

# Conferir contagens contra a produção; depois remover
docker exec -i pfm-postgres psql -U pfm -d postgres \
  -c "DROP DATABASE pfm_verificacao;"
```

| Objetivo                          | Alvo |
| --------------------------------- | ---- |
| RPO — perda máxima aceitável      | 24 h |
| RTO — tempo máximo de recuperação | 2 h  |

---

## 11. Runbook operacional

### 11.1 Diagnóstico rápido

```bash
# Estado dos containers
docker compose -f /var/pfm/producao/docker-compose.prod.yml ps

# Logs da API (JSON — use jq para filtrar)
docker logs pfm-api --tail 200 -f
docker logs pfm-api --tail 500 2>&1 | jq -c 'select(.level=="error")'

# Processos do PM2 dentro do container
docker exec pfm-api pm2 list
docker exec pfm-api pm2 describe pfm-api

# Saúde
curl -s http://127.0.0.1:3333/api/v1/saude/prontidao | jq
curl -sI https://dominio.com | head -1

# Recursos
docker stats --no-stream
df -h /var; free -h

# Nginx
sudo nginx -t
sudo tail -100 /var/log/nginx/pfm-erro.log

# Histórico de deploys
tail -30 /var/pfm/releases/historico.log
```

### 11.2 Deploy manual

Preferir sempre `workflow_dispatch` no GitHub Actions. Manualmente, em caso de indisponibilidade do CI:

```bash
cd /var/pfm/producao
./backup.sh pre-deploy
sed -i "s/^TAG_IMAGEM=.*/TAG_IMAGEM=<sha-desejado>/" .env
docker compose -f docker-compose.prod.yml pull api
docker compose -f docker-compose.prod.yml --profile migrate pull migrator
docker compose -f docker-compose.prod.yml run --rm migrator   # imagem separada (§3.1) — nao usa mais --entrypoint na api
docker compose -f docker-compose.prod.yml up -d --no-deps api
./verificar-saude.sh
```

### 11.3 Rollback manual

```bash
cd /var/pfm/producao
./reverter.sh                                    # usa .tag-anterior

# Se .tag-anterior estiver vazio, escolher a tag manualmente:
docker images "ghcr.io/*/pfm-api" --format '{{.Tag}}\t{{.CreatedSince}}'
sed -i "s/^TAG_IMAGEM=.*/TAG_IMAGEM=<tag-boa>/" .env
docker compose -f docker-compose.prod.yml up -d --no-deps --force-recreate api
./verificar-saude.sh
```

**Se a versão anterior também falhar** (incidente grave): verificar se a causa é o banco (`docker logs pfm-postgres`), confirmar que o disco não está cheio, e só então considerar restaurar o dump pré-deploy — restauração perde os dados gravados após o dump, então é o último recurso.

### 11.4 Cenários de falha

**A API não sobe.**

1. `docker logs pfm-api --tail 100` — geralmente é variável de ambiente inválida (a validação Zod aborta com a mensagem exata) ou banco inacessível.
2. Conferir `.env`: `grep -c '=' /var/pfm/producao/.env`.
3. Testar o banco: `docker exec pfm-postgres pg_isready -U pfm`.
4. Migrations pendentes: `docker compose -f docker-compose.prod.yml run --rm --entrypoint "npx prisma migrate status" migrator` (o CLI `prisma` só existe na imagem `migrator`, não na `api` — §3.1).

**Banco inacessível.**

1. `docker compose ps postgres` e `docker logs pfm-postgres --tail 100`.
2. Se houve _OOM kill_: `dmesg | grep -i "killed process"` — confirmar que o swap está ativo (`swapon --show`).
3. Se o volume corrompeu: parar tudo, restaurar o último dump em banco novo, repontar `DATABASE_URL`.

**Disco cheio.**

```bash
du -sh /var/lib/docker /var/pfm/* /var/log | sort -h
docker system prune -af --volumes    # ATENÇÃO: --volumes remove volumes órfãos
journalctl --vacuum-size=200M
ls -1t /var/pfm/backups/* | tail -n +10 | xargs -r rm -f
```

Causa mais comum: imagens antigas acumuladas e logs sem rotação. A rotação em `docker-compose.prod.yml` previne o segundo caso.

**Certificado expirado.**

```bash
sudo certbot certificates
sudo certbot renew --force-renewal
sudo systemctl reload nginx
```

Se a renovação automática falhou silenciosamente, verificar `systemctl status certbot.timer` e se a porta 80 está acessível (o desafio ACME precisa dela).

**Deploy travado.** O `concurrency` impede paralelismo. Cancelar o workflow e, no servidor, `docker compose ps` para verificar o estado; se ficou meio publicado, executar `reverter.sh`.

### 11.5 Rotação de segredos

```bash
# 1. Gerar novo segredo
openssl rand -base64 64 | tr -d '\n'

# 2. Atualizar o GitHub Secret correspondente
# 3. Reexecutar o deploy (workflow_dispatch) para regenerar o .env
```

Rotacionar `JWT_SEGREDO` invalida **todos** os access tokens em circulação; os usuários renovam via refresh token de forma transparente. Rotacionar `POSTGRES_SENHA` exige `ALTER USER` no banco **antes** do deploy, senão a nova versão não conecta.

---

## 12. Checklist do primeiro deploy

### Antes

- [ ] Domínio registrado, com `A` apontando para o IP da VPS (`dig +short dominio.com`).
- [ ] Registro `A` de `staging.<dominio>` criado.
- [ ] Propagação de DNS confirmada.
- [ ] VPS provisionada com `infra/provisionar.sh`.
- [ ] Chave SSH de deploy gerada (`ssh-keygen -t ed25519`), pública em `~deploy/.ssh/authorized_keys`.
- [ ] Login SSH com a chave testado; login por senha e por root rejeitados.
- [ ] `ufw status` mostra apenas 22, 80 e 443.
- [ ] Todos os GitHub Secrets configurados nos _environments_ `producao` e `staging`.
- [ ] `JWT_SEGREDO` com ≥ 64 caracteres aleatórios (não reaproveitado de desenvolvimento).
- [ ] `TOKEN_METRICAS` configurado (≥ 32 caracteres) — sem ele o processo recusa subir em produção (issue #64).
- [ ] `ORIGENS_PERMITIDAS` com o domínio real, nunca `*` — mesma validação de inicialização.
- [ ] Credenciais SMTP validadas com envio de teste.
- [ ] Proteção de `main` e `staging` ativa.

### Durante

- [ ] Nginx configurado, `nginx -t` limpo.
- [ ] Certificado emitido para os três domínios.
- [ ] `certbot renew --dry-run` bem-sucedido.
- [ ] Hook de recarga do Nginx pós-renovação instalado.
- [ ] `docker compose -f docker-compose.prod.yml up -d postgres` com healthcheck saudável.
- [ ] Primeira migration aplicada (`docker compose -f docker-compose.prod.yml run --rm migrator`).
- [ ] `npm run seed:producao` executado (apenas categorias padrão).
- [ ] Primeiro deploy via merge em `main` concluído.
- [ ] Timer de backup habilitado e primeira execução verificada.

### Depois

- [ ] `https://dominio.com` carrega a aplicação.
- [ ] `http://dominio.com` redireciona com 301.
- [ ] `https://dominio.com/api/v1/saude/prontidao` responde `pronto`.
- [ ] Recarregar `/movimentacoes` diretamente funciona (fallback da SPA).
- [ ] Nota A em SSL Labs.
- [ ] Cadastro, verificação por e-mail e login funcionam em produção.
- [ ] Upload de anexo funciona e o arquivo persiste em `/var/pfm/uploads`.
- [ ] PostgreSQL inacessível externamente (`nmap -p 5432 <ip>` → filtered/closed).
- [ ] `GET /metricas` responde `401` sem token e `200` com `TOKEN_METRICAS` correto.
- [ ] Logs de produção sem senha, token ou dado pessoal — inclusive o `stack` de um erro real (`err`, não outra chave: só essa o Pino serializa).
- [ ] **Rollback ensaiado** com uma versão deliberadamente quebrada.
- [ ] **Restauração de backup ensaiada** em banco descartável.
- [ ] Runbook validado por alguém que não fez o provisionamento.
- [ ] Tag `v1.0.0` criada e `CHANGELOG.md` atualizado.

---

**Documentos relacionados:** [02-ARCHITECTURE.md](02-ARCHITECTURE.md) · [03-DATABASE.md](03-DATABASE.md) · [05-DEVELOPMENT.md](05-DEVELOPMENT.md) · [06-MILESTONES.md](06-MILESTONES.md)
