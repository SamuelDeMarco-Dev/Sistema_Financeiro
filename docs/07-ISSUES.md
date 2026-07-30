# 07 — Issues Detalhadas

> **Documento:** Backlog Completo
> **Projeto:** Gerenciador de Finanças (PFM)
> **Versão:** 1.0.0 · **Data:** 2026-07-29 · **Status:** Vigente

---

## Como usar este documento

Cada issue é **independente e executável**: contém tudo o que é necessário para implementá-la sem consultar outra pessoa. A issue é o contrato de escopo — o que não está nela não pertence a ela.

### Formato

```
#### #N · <tipo>(<escopo>): <título>
Milestone · Pontos · Labels · Depende de · Requisitos

**Contexto/Descrição** — o que e por quê.
**Checklist técnico** — passos de implementação.
**Critérios de aceite** — condições objetivas de conclusão.
```

### Convenções

- **Numeração** sequencial `#1`–`#128`, correspondente à numeração no GitHub Issues.
- **Título** já em formato Conventional Commits — serve como mensagem do commit de squash.
- **Depende de** significa bloqueio real: a issue não pode iniciar antes.
- **Requisitos** referenciam `RF-xx`/`RNF-xx`/`RN-xx` de [01-SPECIFICATION.md](01-SPECIFICATION.md).
- Toda issue herda a [Definição de Pronto](05-DEVELOPMENT.md#13-definição-de-pronto) — os critérios listados são **adicionais**, não substitutos.

### Labels

| Categoria | Valores |
| --------- | ------- |
| Camada | `backend`, `frontend`, `banco`, `infra`, `docs` |
| Tipo | `feat`, `fix`, `refactor`, `test`, `chore`, `ci` |
| Domínio | `autenticacao`, `perfil`, `contas`, `categorias`, `etiquetas`, `movimentacoes`, `transferencias`, `anexos`, `cartoes`, `faturas`, `compartilhadas`, `convites`, `metas`, `orcamentos`, `notificacoes`, `dashboard`, `relatorios`, `pesquisa`, `auditoria` |
| Prioridade | `p0-critica`, `p1-alta`, `p2-media`, `p3-baixa` |

### Índice

| Milestone | Issues | Pontos | Seção |
| --------- | ------ | -----: | ----- |
| M0 — Fundação e Infraestrutura | #1–#9 | 34 | [ir](#milestone-0--fundação-e-infraestrutura) |
| M1 — Autenticação e Perfil | #10–#21 | 55 | [ir](#milestone-1--autenticação-e-perfil) |
| M2 — Contas Financeiras e Categorias | #22–#31 | 42 | [ir](#milestone-2--contas-financeiras-e-categorias) |
| M3 — Movimentações e Transferências | #32–#45 | 76 | [ir](#milestone-3--movimentações-e-transferências) |
| M4 — Dashboard e Relatórios | #46–#55 | 50 | [ir](#milestone-4--dashboard-e-relatórios) |
| M5 — CI/CD e Deploy em Produção | #56–#65 | 42 | [ir](#milestone-5--cicd-e-deploy-em-produção) |
| M6 — Contas Compartilhadas | #66–#78 | 71 | [ir](#milestone-6--contas-compartilhadas) |
| M7 — Metas Financeiras | #79–#85 | 29 | [ir](#milestone-7--metas-financeiras) |
| M8 — Cartões, Faturas e Parcelamentos | #86–#97 | 63 | [ir](#milestone-8--cartões-faturas-e-parcelamentos) |
| M9 — Orçamentos e Notificações | #98–#108 | 52 | [ir](#milestone-9--orçamentos-e-notificações) |
| M10 — Dashboard Analítico e Exportações | #109–#118 | 47 | [ir](#milestone-10--dashboard-analítico-e-exportações) |
| M11 — Pesquisa, Auditoria e Observabilidade | #119–#128 | 42 | [ir](#milestone-11--pesquisa-auditoria-e-observabilidade) |

---

# Milestone 0 — Fundação e Infraestrutura

> 9 issues · 34 pontos · sem dependências externas

---

#### #1 · chore(infra): estrutura do monorepo e configuração base

`M0` · **3 pts** · `infra` `chore` `p0-critica` · Depende de: — · RNF-18

**Descrição.** Criar a estrutura de diretórios do monorepo com os dois pacotes independentes, arquivos de configuração compartilhados e `.gitignore` adequado. É a issue que todas as outras pressupõem.

**Checklist técnico**
- [ ] Criar `backend/`, `frontend/`, `.github/workflows/`.
- [ ] `package.json` raiz com `workspaces` e scripts agregadores (`verificar`, `dev`).
- [ ] `.gitignore` cobrindo `node_modules`, `dist`, `.env`, `uploads`, `coverage`, `.DS_Store`.
- [ ] `.gitattributes` com `* text=auto eol=lf` (evita diff de fim de linha entre Windows e Linux).
- [ ] `.nvmrc` com `22`; `engines.node: ">=22 <23"` nos três `package.json`.
- [ ] `.editorconfig` com `indent_size = 2`, `charset = utf-8`, `insert_final_newline = true`.
- [ ] `README.md` raiz com visão do projeto e link para `docs/`.

**Critérios de aceite**
- [ ] `npm ci` na raiz instala as dependências dos dois pacotes.
- [ ] `git status` limpo após um `npm run build` completo (nada gerado é versionado).
- [ ] Estrutura de pastas confere com [02-ARCHITECTURE.md §1.1](02-ARCHITECTURE.md#11-repositório).

---

#### #2 · chore(infra): docker compose para banco, banco de teste e e-mail

`M0` · **5 pts** · `infra` `chore` `p0-critica` · Depende de: #1 · —

**Descrição.** Ambiente local reprodutível: PostgreSQL de desenvolvimento, PostgreSQL de teste em porta separada e Mailpit para capturar e-mails. Nenhum e-mail real deve sair de máquina de desenvolvimento.

**Checklist técnico**
- [ ] `docker-compose.yml` com serviço `postgres` (16-alpine, porta 5432, volume nomeado).
- [ ] Serviço `postgres_teste` (porta 5433, `tmpfs` para velocidade — dados descartáveis por definição).
- [ ] Serviço `mailpit` (portas 1025 SMTP / 8025 UI).
- [ ] `healthcheck` com `pg_isready` nos dois bancos.
- [ ] Credenciais e nomes de banco alinhados com `.env.exemplo`.
- [ ] Documentar comandos de subida/derrubada no `README.md`.

**Critérios de aceite**
- [ ] `docker compose up -d` sobe os três serviços com `healthcheck` saudável.
- [ ] `psql` conecta em 5432 e 5433 com as credenciais do `.env.exemplo`.
- [ ] Mailpit acessível em `http://localhost:8025`.
- [ ] `docker compose down -v` remove tudo sem resíduo.

---

#### #3 · chore(backend): esqueleto Express com TypeScript estrito

`M0` · **5 pts** · `backend` `chore` `p0-critica` · Depende de: #1 · RNF-15, RNF-16

**Descrição.** Servidor Express em TypeScript com a estrutura de pastas em camadas, ordem de middlewares definida e encerramento gracioso. Sem rota de domínio.

**Checklist técnico**
- [ ] `tsconfig.json` conforme [05-DEVELOPMENT.md §5.1](05-DEVELOPMENT.md#51-configuração), incluindo `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`.
- [ ] Criar todas as pastas de `src/` de [02-ARCHITECTURE.md §3](02-ARCHITECTURE.md#3-estrutura-de-pastas-do-backend) com `.gitkeep`.
- [ ] `src/servidor.ts` montando os middlewares na ordem exata de §4.1 (a ordem é significativa).
- [ ] `src/index.ts` com `listen`, tratamento de `SIGTERM`/`SIGINT` e desconexão do Prisma.
- [ ] `tsx watch` no script `dev`; `tsconfig.build.json` para o build.
- [ ] Alias `@/*` funcionando em runtime (`tsx`) e no build.

**Critérios de aceite**
- [ ] `npm run dev` sobe em 3333 e recarrega ao salvar.
- [ ] `npm run build && npm start` executa o artefato compilado.
- [ ] `npm run tipos` sem erro.
- [ ] `SIGTERM` encerra desconectando o Prisma e finalizando requisições em curso.

---

#### #4 · feat(backend): validação de ambiente, envelope de resposta e erros tipados

`M0` · **3 pts** · `backend` `feat` `p0-critica` · Depende de: #3 · RNF-17, RN-56

**Descrição.** Três fundações usadas por todo o resto: validação de env vars com falha rápida, utilitários de envelope conforme ADR-004 e a hierarquia de erros com tradutor único para HTTP.

**Checklist técnico**
- [ ] `configuracao/ambiente.ts` com schema Zod e `process.exit(1)` em configuração inválida.
- [ ] Regra ESLint `no-restricted-imports` proibindo `process.env` fora deste arquivo.
- [ ] `utilitarios/resposta.ts` com `respostaSucesso` e `respostaErro`.
- [ ] Serializador central que converte `Prisma.Decimal` para string `"0.00"` (ADR-012).
- [ ] `erros/erro-aplicacao.ts` e as 8 classes concretas de [02-ARCHITECTURE.md §5.1](02-ARCHITECTURE.md#51-hierarquia).
- [ ] `erros/codigos.ts` com o catálogo de [04-API.md §3.2](04-API.md#32-catálogo-de-códigos).
- [ ] `middlewares/tratador-erros.middleware.ts` traduzindo `ZodError`, `ErroAplicacao`, erros do Prisma e desconhecidos.
- [ ] `middlewares/async-handler.ts` e `nao-encontrado.middleware.ts`.

**Critérios de aceite**
- [ ] Iniciar sem `JWT_SEGREDO` aborta com mensagem clara indicando a variável faltante.
- [ ] `throw new NaoEncontradoErro('x')` em qualquer camada produz `404` no envelope padrão.
- [ ] `NODE_ENV=production` não expõe `stack` em nenhuma resposta (RN-56).
- [ ] Erro Prisma `P2002` traduz para `409 CONFLITO`; `P2025` para `404 NAO_ENCONTRADO`.
- [ ] Testes unitários do tradutor cobrem as quatro classes de erro.

---

#### #5 · feat(backend): logger estruturado, correlação de requisição e endpoint de saúde

`M0` · **3 pts** · `backend` `feat` `p1-alta` · Depende de: #4 · RNF-19, RNF-20

**Descrição.** Observabilidade mínima desde o primeiro dia: log JSON com `requestId` correlacionado e os endpoints que o deploy usará como portão em M5.

**Checklist técnico**
- [ ] `utilitarios/registrador.ts` com Pino, nível por `NIVEL_LOG`, `pino-pretty` só em desenvolvimento.
- [ ] `middlewares/correlacao.middleware.ts` gerando/propagando `X-Request-Id` via `AsyncLocalStorage`.
- [ ] `middlewares/registrador.middleware.ts` logando método, rota, status e duração.
- [ ] Redação obrigatória de `senha`, `senhaHash`, `token`, `authorization`, `cookie` na serialização.
- [ ] `GET /api/v1/saude` e `GET /api/v1/saude/prontidao` conforme [04-API.md §25](04-API.md#25-saúde).
- [ ] `prontidao` verifica banco (`SELECT 1`), migrations pendentes e escrita no diretório de uploads.

**Critérios de aceite**
- [ ] Toda requisição gera exatamente um registro JSON com `requestId`.
- [ ] `X-Request-Id` enviado pelo cliente é ecoado; ausente, é gerado.
- [ ] Corpo de `/autenticacao/*` nunca aparece no log (teste automatizado verifica).
- [ ] `/saude/prontidao` responde `503` com o banco derrubado e `200` com ele de pé.

---

#### #6 · chore(frontend): esqueleto Vite + React + Tailwind com Design System

`M0` · **5 pts** · `frontend` `chore` `p0-critica` · Depende de: #1 · RF-12, A11Y-01

**Descrição.** Aplicação React com o Design System de [01-SPECIFICATION.md §8](01-SPECIFICATION.md#8-design-system-e-responsividade) implementado como tokens CSS, funcionando em tema claro e escuro.

**Checklist técnico**
- [ ] `npm create vite` com template `react-ts`; estrutura de pastas de [02-ARCHITECTURE.md §7](02-ARCHITECTURE.md#7-estrutura-de-pastas-do-frontend).
- [ ] Tailwind com `estilos/tokens.css` definindo as 10 cores semânticas em `:root` e `.dark`.
- [ ] `tailwind.config.ts` mapeando os tokens (`primaria`, `sucesso`, `perigo`, `atencao`, `informacao`, `fundo`, `superficie`, `borda`, `texto`, `textoSuave`).
- [ ] Escala de espaçamento de 4 px, raios `sm/md/lg`, fontes Inter e JetBrains Mono auto-hospedadas.
- [ ] Breakpoints de §8.4 confirmados na configuração.
- [ ] `ContextoTema` com `CLARO`/`ESCURO`/`SISTEMA`, persistência em `localStorage` e respeito a `prefers-color-scheme`.
- [ ] Shadcn/UI inicializado com os tokens do projeto (não a paleta padrão).
- [ ] Utilitário `cn()` (`clsx` + `tailwind-merge`).
- [ ] Alias `@/*` no `vite.config.ts` e no `tsconfig.json`.

**Critérios de aceite**
- [ ] Alternância de tema muda todas as cores sem recarregar a página.
- [ ] `SISTEMA` acompanha a preferência do sistema operacional em tempo real.
- [ ] Contraste ≥ 4.5:1 para `texto` sobre `fundo` e sobre `superficie`, nos dois temas (verificado com ferramenta).
- [ ] Nenhuma cor crua do Tailwind (`bg-slate-800`) em componente — só tokens.
- [ ] Página de exemplo sem *scroll* horizontal em 320 px.

---

#### #7 · chore(frontend): roteamento, React Query e cliente HTTP com interceptores

`M0` · **5 pts** · `frontend` `chore` `p0-critica` · Depende de: #6 · ADR-010

**Descrição.** Infraestrutura de dados e navegação: React Router com *lazy loading*, React Query configurado e cliente Axios com o interceptor de renovação em fila única.

**Checklist técnico**
- [ ] React Router com `LayoutPublico` e `LayoutAutenticado`; `RotaProtegida` como *placeholder* (sem auth real ainda).
- [ ] `React.lazy` + `Suspense` por página, com *fallback* de esqueleto.
- [ ] `QueryClient` com `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`.
- [ ] `servicos/api.ts` com Axios, `baseURL` de `VITE_API_URL`, `withCredentials: true`, `timeout: 20_000`.
- [ ] Interceptor de request injetando o access token da memória.
- [ ] Interceptor de response com **fila única** de renovação (requisições concorrentes aguardam uma só renovação).
- [ ] Desempacotamento do envelope: o serviço devolve `data`, não a resposta bruta.
- [ ] Normalização de erro: `ErroApi` com `codigo`, `mensagem` e `errors` tipados.
- [ ] Componentes `Esqueleto`, `EstadoVazio`, `EstadoErro`, `Carregando` em `componentes/feedback/`.
- [ ] Sistema de *toast* (`notificar.sucesso/erro`) acessível via `aria-live`.

**Critérios de aceite**
- [ ] Navegação entre rotas carrega o *chunk* sob demanda (verificado na aba Network).
- [ ] Cinco requisições simultâneas recebendo `401` disparam **uma** chamada a `/renovar` (teste unitário com mock).
- [ ] Erro de rede produz `ErroApi` com `codigo` legível, não exceção crua do Axios.
- [ ] Os quatro componentes de feedback renderizam nos dois temas.

---

#### #8 · chore(infra): ESLint, Prettier, hooks de Git e fronteiras de camada

`M0` · **3 pts** · `infra` `chore` `p0-critica` · Depende de: #3, #6 · RNF-14, RNF-18

**Descrição.** Automatizar as convenções de [05-DEVELOPMENT.md](05-DEVELOPMENT.md) para que sejam garantidas por ferramenta, não por vigilância em revisão. Inclui as fronteiras arquiteturais.

**Checklist técnico**
- [ ] ESLint 9 (flat config) nos dois pacotes com `typescript-eslint` em modo *type-checked*.
- [ ] Todas as regras de [05-DEVELOPMENT.md §8.2](05-DEVELOPMENT.md#82-eslint--regras-que-reprovam-o-build), com `--max-warnings 0`.
- [ ] `eslint-plugin-boundaries` aplicando a matriz de importação de §6.5 (`prisma` só em `repositorios/`, `express` fora de `servicos/`).
- [ ] `eslint-plugin-jsx-a11y` e `react-hooks` no frontend.
- [ ] Prettier com `.prettierrc` de §8.1 e `prettier-plugin-tailwindcss`.
- [ ] Husky com `pre-commit` (lint-staged), `commit-msg` (commitlint), `pre-push` (tipos + unitários).
- [ ] `commitlint.config.cjs` com os tipos e escopos de §10.3.

**Critérios de aceite**
- [ ] Importar `prisma` em um serviço reprova o `npm run lint`.
- [ ] Importar `express` em um serviço reprova o `npm run lint`.
- [ ] Ler `process.env` fora de `configuracao/ambiente.ts` reprova o lint.
- [ ] Commit `ajustes` é rejeitado; `feat(contas): adiciona listagem` é aceito.
- [ ] `npm run formatar:check` passa em todo o repositório.

---

#### #9 · ci(infra): workflow de integração contínua e proteção de branches

`M0` · **2 pts** · `infra` `ci` `p0-critica` · Depende de: #8 · RNF-13, RNF-14

**Descrição.** Pipeline que reproduz exatamente `npm run verificar` e bloqueia merge com o portão vermelho.

**Checklist técnico**
- [ ] `.github/workflows/ci.yml` disparando em `pull_request` para `main` e `staging` e em `push` para `staging`.
- [ ] Jobs paralelos `backend` e `frontend`; serviço PostgreSQL para os testes do backend.
- [ ] Passos: `npm ci` → `tipos` → `lint` → `formatar:check` → `teste:cobertura` → `build`.
- [ ] Cache de `~/.npm` por `package-lock.json`.
- [ ] Portão de cobertura falhando abaixo de 80% de *statements* / 75% de *branches*.
- [ ] Upload de relatório de cobertura como artefato.
- [ ] Varredura de segredos (`gitleaks`) no diff.
- [ ] Proteger `main` e `staging`: PR obrigatório, CI verde, 1 aprovação, sem *force push*, sem exclusão.

**Critérios de aceite**
- [ ] PR com erro de tipo, lint ou teste tem o merge bloqueado.
- [ ] PR verde completa em menos de 6 minutos.
- [ ] Push direto em `staging` ou `main` é rejeitado pelo servidor.
- [ ] Segredo plantado no diff faz o job falhar.

---

# Milestone 1 — Autenticação e Perfil

> 12 issues · 55 pontos · depende de M0
> RF-01 a RF-13 · RN-52, RN-53, RN-54

---

#### #10 · feat(banco): migration inicial de usuários, perfis e tokens de renovação

`M1` · **5 pts** · `banco` `feat` `p0-critica` · Depende de: #2, #3 · —

**Descrição.** Primeira migration do projeto. Cria os três modelos de identidade conforme [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo), com o mapeamento pt-BR de tabelas e colunas.

**Checklist técnico**
- [ ] `prisma/schema.prisma` com `datasource`, `generator` e os modelos `Usuario`, `Perfil`, `TokenRenovacao`.
- [ ] Enum `TemaPreferido`.
- [ ] `@@map`/`@map` em todos os modelos e campos (tabelas `snake_case` plural, colunas `snake_case`).
- [ ] `Decimal` não se aplica aqui, mas `@db.Timestamptz(3)` sim em todos os instantes.
- [ ] Índices: `usuarios(excluido_em)`, `tokens_renovacao(usuario_id, revogado_em)`, `tokens_renovacao(expira_em)`.
- [ ] `banco/cliente.ts` com instância única do `PrismaClient` e log por ambiente.
- [ ] `testes/configuracao/banco-teste.ts` com `limparBanco()` respeitando a ordem de FKs.
- [ ] Migration nomeada `cria_estrutura_inicial`.

**Critérios de aceite**
- [ ] `npx prisma migrate deploy` aplica em banco vazio sem erro.
- [ ] Nomes de tabela e coluna no banco estão em `snake_case` pt-BR (verificado por consulta em `information_schema`).
- [ ] `Perfil` tem relação 1:1 com `Usuario` e `onDelete: Cascade`.
- [ ] `limparBanco()` deixa o banco de teste vazio sem violar FK.

---

#### #11 · feat(autenticacao): cadastro de usuário com verificação de e-mail

`M1` · **8 pts** · `backend` `feat` `autenticacao` `p0-critica` · Depende de: #10 · RF-01, RF-02, RN-52

**Descrição.** Endpoint de cadastro criando usuário, perfil com padrões e token de verificação, disparando e-mail. Base de todo o resto — sem cadastro não há nada para testar.

**Checklist técnico**
- [ ] `utilitarios/senha.ts` com `gerarHash` e `comparar` usando bcrypt custo `BCRYPT_CUSTO` (RN-52).
- [ ] `validadores/autenticacao.validador.ts` com `cadastrarSchema` (regras de senha de [04-API.md §7.1](04-API.md#71-post-autenticacaocadastrar), máx. 72 caracteres).
- [ ] `UsuarioRepositorio` com `buscarPorEmail`, `criar` (usuário + perfil na mesma transação).
- [ ] `AutenticacaoServico.cadastrar`: normaliza e-mail para minúsculas, verifica duplicidade, gera hash, gera token de verificação (24 h), cria em transação.
- [ ] `utilitarios/email/enviador.ts` com Nodemailer apontando para o SMTP configurado.
- [ ] Template `verificacao-email` em pt-BR com link para `URL_BASE_FRONTEND`.
- [ ] `POST /autenticacao/cadastrar` retornando `201` sem nenhum dado sensível.
- [ ] Envio de e-mail não bloqueia a resposta e a falha de SMTP não derruba o cadastro (log de erro + token reenviável).

**Critérios de aceite**
- [ ] `201` com `usuario.emailVerificado: false`; `senhaHash` ausente da resposta.
- [ ] E-mail duplicado (inclusive com caixa diferente) responde `409 EMAIL_JA_CADASTRADO`.
- [ ] Senha fora das regras responde `400 VALIDACAO` com o campo e o motivo.
- [ ] Perfil criado automaticamente com `moedaPadrao: "BRL"`, `tema: "SISTEMA"`, `timezone: "America/Sao_Paulo"`.
- [ ] E-mail visível no Mailpit com link de verificação funcional.
- [ ] SMTP indisponível não impede o `201`.

---

#### #12 · feat(autenticacao): login com JWT e refresh token em cookie

`M1` · **5 pts** · `backend` `feat` `autenticacao` `p0-critica` · Depende de: #11 · RF-03, RN-53, RN-54

**Descrição.** Emissão do par de tokens conforme a estratégia de [02-ARCHITECTURE.md §8.1](02-ARCHITECTURE.md#81-estratégia-de-tokens): access token JWT curto no corpo, refresh token opaco em cookie `httpOnly`.

**Checklist técnico**
- [ ] `utilitarios/jwt.ts` com `assinarAccessToken` e `verificarAccessToken`.
- [ ] `TokenRenovacaoRepositorio` persistindo apenas o **hash** do refresh token (RN-53).
- [ ] `AutenticacaoServico.entrar`: busca por e-mail, `bcrypt.compare`, verifica `emailVerificadoEm`, verifica `bloqueadoAte`.
- [ ] Registro de tentativas falhas com bloqueio após 5 em 15 min (RN-54); reset no sucesso.
- [ ] Geração de refresh token opaco (UUID) com dispositivo, IP e `userAgent`.
- [ ] Cookie com `httpOnly`, `secure` (produção), `sameSite: 'strict'`, `path: '/api/v1/autenticacao'`.
- [ ] `lembrarMe` estendendo para 30 dias.
- [ ] `limitador.middleware.ts` com limite de 5 por 15 min na chave `IP + e-mail`.
- [ ] Atualização de `ultimoLoginEm`.

**Critérios de aceite**
- [ ] `200` com `accessToken`, `expiraEm: 900`, dados do usuário e do perfil.
- [ ] `Set-Cookie` com as quatro flags corretas.
- [ ] E-mail inexistente e senha errada retornam a **mesma** mensagem `401 CREDENCIAIS_INVALIDAS` (sem enumeração de contas).
- [ ] Conta não verificada responde `403 EMAIL_NAO_VERIFICADO`.
- [ ] 6ª tentativa falha em 15 min responde `429` com `Retry-After`.
- [ ] Refresh token no banco está *hasheado*, não em texto claro.

---

#### #13 · feat(autenticacao): renovação com rotação e detecção de reuso

`M1` · **5 pts** · `backend` `feat` `autenticacao` `p0-critica` · Depende de: #12 · RF-04, RN-53

**Descrição.** Renovação com rotação obrigatória. Reuso de token já revogado é tratado como indício de vazamento e revoga toda a família de tokens do usuário.

**Checklist técnico**
- [ ] `AutenticacaoServico.renovar`: valida hash, verifica expiração e revogação.
- [ ] Rotação: revoga o antigo (`revogadoEm`, `substituidoPorId`) e emite novo, na mesma transação.
- [ ] Detecção de reuso: token com `revogadoEm != null` revoga **todos** os tokens ativos do usuário e responde `401`.
- [ ] `POST /autenticacao/renovar` sem corpo, consumindo o cookie.
- [ ] *Rate limit* de 30 por 15 min por IP.
- [ ] Log de nível `warn` ao detectar reuso, com `usuarioId` e IP.

**Critérios de aceite**
- [ ] `200` com novo access token e novo cookie.
- [ ] Token antigo deixa de funcionar imediatamente após a rotação.
- [ ] Reusar token revogado responde `401` **e** invalida as outras sessões (teste de integração).
- [ ] Cookie ausente responde `401 NAO_AUTENTICADO`.
- [ ] Token expirado responde `401`, não `500`.

---

#### #14 · feat(autenticacao): middleware de autenticação e logout

`M1` · **3 pts** · `backend` `feat` `autenticacao` `p0-critica` · Depende de: #13 · RF-05, RF-06

**Descrição.** Middleware que popula `req.usuario` e os endpoints de encerramento de sessão, individual e global.

**Checklist técnico**
- [ ] `tipos/express.d.ts` augmentando `Request` com `usuario` e `requestId`.
- [ ] `middlewares/autenticar.middleware.ts`: extrai `Bearer`, verifica JWT, carrega usuário, rejeita usuário excluído.
- [ ] Distinguir `TOKEN_EXPIRADO` de `NAO_AUTENTICADO` (o cliente reage diferente a cada um).
- [ ] `POST /autenticacao/sair` revogando o token da sessão e limpando o cookie.
- [ ] `POST /autenticacao/sair-todos` revogando todos os tokens do usuário.
- [ ] Ambos respondem `204`.

**Critérios de aceite**
- [ ] Rota protegida sem token responde `401 NAO_AUTENTICADO`.
- [ ] Token expirado responde `401` com `codigo: "TOKEN_EXPIRADO"`.
- [ ] Token de usuário excluído responde `401`.
- [ ] Após `sair`, o refresh token não renova mais; após `sair-todos`, nenhuma sessão renova.
- [ ] Cookie é limpo na resposta dos dois endpoints.

---

#### #15 · feat(autenticacao): verificação de e-mail, recuperação e alteração de senha

`M1` · **5 pts** · `backend` `feat` `autenticacao` `p1-alta` · Depende de: #14 · RF-02, RF-07, RF-08

**Descrição.** Fluxos de token de uso único e alteração autenticada. A resposta de "esqueci senha" é deliberadamente idêntica exista ou não o e-mail.

**Checklist técnico**
- [ ] `POST /autenticacao/verificar-email` consumindo token de 24 h e preenchendo `emailVerificadoEm`.
- [ ] `POST /autenticacao/reenviar-verificacao` com *rate limit* de 3/hora.
- [ ] `POST /autenticacao/esqueci-senha`: gera token de 1 h, envia e-mail, responde sempre `200` com a mesma mensagem.
- [ ] `POST /autenticacao/redefinir-senha`: valida token, troca a senha, revoga **todos** os refresh tokens.
- [ ] `PATCH /autenticacao/alterar-senha`: exige senha atual, revoga as **outras** sessões e mantém a atual.
- [ ] Templates de e-mail `recuperacao-senha` em pt-BR.
- [ ] Tokens de uso único invalidados após o consumo.

**Critérios de aceite**
- [ ] Token de verificação usado duas vezes responde `400` na segunda.
- [ ] "Esqueci senha" com e-mail inexistente responde `200` com mensagem idêntica ao caso existente.
- [ ] Token de recuperação expirado (> 1 h) responde `400`.
- [ ] Redefinir senha derruba todas as sessões; alterar senha autenticada preserva a atual.
- [ ] Senha atual incorreta em `alterar-senha` responde `400`.

---

#### #16 · feat(autenticacao): gestão de sessões ativas

`M1` · **3 pts** · `backend` `feat` `autenticacao` `p2-media` · Depende de: #14 · RF-06

**Descrição.** Permitir ao usuário ver onde está logado e revogar sessões específicas.

**Checklist técnico**
- [ ] `GET /autenticacao/sessoes` listando tokens ativos com dispositivo, IP e datas.
- [ ] Marcar a sessão atual com `atual: true`.
- [ ] Parsing do `userAgent` para rótulo legível ("Chrome · Windows").
- [ ] `DELETE /autenticacao/sessoes/:id` revogando uma sessão do próprio usuário.
- [ ] Sessão de outro usuário responde `404`.

**Critérios de aceite**
- [ ] Lista traz apenas tokens não revogados e não expirados.
- [ ] A sessão em uso vem marcada como `atual`.
- [ ] Revogar a sessão atual funciona e equivale a `sair`.
- [ ] Tentar revogar sessão de terceiro responde `404` (não `403`).

---

#### #17 · feat(perfil): consulta, atualização e upload de foto

`M1` · **5 pts** · `backend` `feat` `perfil` `p1-alta` · Depende de: #14 · RF-10, RF-11, RF-13

**Descrição.** CRUD do perfil e upload de avatar com conversão para WebP. O e-mail deliberadamente **não** é alterável aqui — trocá-lo exige novo ciclo de verificação.

**Checklist técnico**
- [ ] `GET /perfil` e `PATCH /perfil` (todos os campos opcionais).
- [ ] Validar `timezone` contra `Intl.supportedValuesOf('timeZone')` e `moedaPadrao` contra ISO 4217.
- [ ] Rejeitar `email` no corpo do `PATCH` com `400 VALIDACAO` explicando o motivo.
- [ ] `middlewares/upload.middleware.ts` com Multer, limite de 2 MB, filtro de MIME.
- [ ] Validação por *magic number* além da extensão.
- [ ] `POST /perfil/foto`: converte para WebP com `sharp`, gera *thumbnail* 128×128, remove o arquivo anterior.
- [ ] `DELETE /perfil/foto`.
- [ ] *Rate limit* de 50 uploads/hora.
- [ ] `utilitarios/data.ts` com conversão de/para o timezone do perfil.

**Critérios de aceite**
- [ ] `PATCH` altera apenas os campos enviados.
- [ ] `timezone` inválido responde `400`.
- [ ] Arquivo de 3 MB responde `413 ARQUIVO_MUITO_GRANDE`.
- [ ] `.png` renomeado para `.jpg` com conteúdo PNG é aceito por MIME real; executável renomeado para `.png` é rejeitado com `415`.
- [ ] Nova foto remove a anterior do disco (sem acúmulo de órfãos).

---

#### #18 · feat(frontend): contexto de autenticação e rota protegida

`M1` · **5 pts** · `frontend` `feat` `autenticacao` `p0-critica` · Depende de: #7, #12 · RF-03

**Descrição.** Estado de sessão no cliente: access token em memória, sessão restaurada por renovação silenciosa no *boot* e proteção de rotas.

**Checklist técnico**
- [ ] `ContextoAutenticacao` com `usuario`, `estaAutenticado`, `carregando`, `entrar`, `sair`.
- [ ] `armazenamento-token.ts` guardando o access token **em memória** (nunca `localStorage`).
- [ ] No *boot*, tentar `POST /renovar` uma vez para restaurar a sessão a partir do cookie.
- [ ] `RotaProtegida` redirecionando para `/entrar` e preservando o destino em `state.de`.
- [ ] Redirecionar para o destino original após o login.
- [ ] `RotaPublica` impedindo acesso a `/entrar` quando já autenticado.
- [ ] Falha de renovação limpa o estado e redireciona.
- [ ] Hooks `usarLogin`, `usarCadastro`, `usarSessao`.

**Critérios de aceite**
- [ ] Recarregar a página com cookie válido mantém o usuário autenticado.
- [ ] Recarregar sem cookie leva a `/entrar` sem *flash* de conteúdo protegido.
- [ ] Acessar `/movimentacoes` deslogado redireciona e, após o login, volta a `/movimentacoes`.
- [ ] Access token não aparece em `localStorage` nem em `sessionStorage` (verificado no DevTools).

---

#### #19 · feat(frontend): telas de login, cadastro e verificação de e-mail

`M1` · **5 pts** · `frontend` `feat` `autenticacao` `p0-critica` · Depende de: #18 · RF-01, RF-02, RF-03

**Descrição.** Telas públicas com React Hook Form + Zod, mensagens em pt-BR orientadas à ação e acessibilidade completa.

**Checklist técnico**
- [ ] `LayoutPublico` responsivo com identidade visual e alternância de tema.
- [ ] `FormularioLogin` com e-mail, senha (com botão mostrar/ocultar) e "lembrar-me".
- [ ] `FormularioCadastro` com indicador de força de senha e confirmação.
- [ ] Página de verificação lendo o token da URL, com estados carregando/sucesso/erro e ação de reenvio.
- [ ] Tradução dos códigos de erro da API para mensagens de interface (`CREDENCIAIS_INVALIDAS`, `EMAIL_NAO_VERIFICADO`, `CONTA_BLOQUEADA`, `LIMITE_EXCEDIDO`).
- [ ] Tela dedicada para `EMAIL_NAO_VERIFICADO` com ação de reenviar.
- [ ] `label` associada a todo campo; erros com `aria-live="polite"`; foco no primeiro campo inválido.
- [ ] Botão desabilitado com indicador de carregamento durante o envio.

**Critérios de aceite**
- [ ] Formulário navegável e submetível **apenas** por teclado.
- [ ] Erro de campo anunciado por leitor de tela.
- [ ] `403 EMAIL_NAO_VERIFICADO` leva à tela de reenvio, não a um *toast* genérico.
- [ ] Sem *scroll* horizontal em 320 px.
- [ ] Duplo clique no botão de envio não dispara duas requisições.

---

#### #20 · feat(frontend): recuperação e redefinição de senha

`M1` · **3 pts** · `frontend` `feat` `autenticacao` `p1-alta` · Depende de: #19 · RF-07

**Descrição.** Duas telas públicas completando o ciclo de senha, com mensagem neutra que não revela quais e-mails existem.

**Checklist técnico**
- [ ] Página "esqueci minha senha" com campo de e-mail e tela de confirmação neutra.
- [ ] Página "redefinir senha" lendo o token da URL, com nova senha e confirmação.
- [ ] Validar o token antes de exibir o formulário; tela de erro com ação de solicitar novo link.
- [ ] Após redefinir, redirecionar para o login com *toast* de sucesso.
- [ ] Indicador de força de senha reaproveitado do cadastro.
- [ ] Tratamento de `429` com mensagem indicando quando tentar novamente.

**Critérios de aceite**
- [ ] Confirmação neutra é exibida independentemente de o e-mail existir.
- [ ] Token inválido ou expirado mostra erro claro com caminho de recuperação.
- [ ] Redefinição bem-sucedida invalida a sessão anterior (login necessário).
- [ ] Fluxo completo funciona ponta a ponta com o Mailpit.

---

#### #21 · feat(frontend): página de configurações de perfil

`M1` · **3 pts** · `frontend` `feat` `perfil` `p1-alta` · Depende de: #17, #18 · RF-10 a RF-13

**Descrição.** Área autenticada de preferências, incluindo avatar, tema, timezone, moeda e alteração de senha.

**Checklist técnico**
- [ ] `LayoutAutenticado` com cabeçalho, menu lateral (≥ `lg`) e navegação inferior (mobile).
- [ ] Página de configurações em abas: Perfil · Preferências · Segurança.
- [ ] Aba Perfil: nome, upload de avatar com pré-visualização e recorte, remoção.
- [ ] Aba Preferências: tema, idioma, moeda, timezone, formato de data, primeiro dia da semana, notificações.
- [ ] Aba Segurança: alteração de senha e lista de sessões ativas com revogação.
- [ ] Salvamento por seção, com estado de carregamento e *toast*.
- [ ] Invalidar `['perfil']` e `['sessao']` após mutação.

**Critérios de aceite**
- [ ] Trocar o tema reflete imediatamente e persiste após recarregar.
- [ ] Trocar o timezone altera as datas exibidas em toda a aplicação.
- [ ] Upload de avatar atualiza o cabeçalho sem recarregar a página.
- [ ] Revogar outra sessão a remove da lista; revogar a atual desloga.
- [ ] Navegação inferior visível apenas abaixo de 768 px.

---

# Milestone 2 — Contas Financeiras e Categorias

> 10 issues · 42 pontos · depende de M1
> RF-14 a RF-22 · RN-01 a RN-08

---

#### #22 · feat(banco): migration de contas, categorias e etiquetas

`M2` · **3 pts** · `banco` `feat` `p0-critica` · Depende de: #10 · RF-14, RF-19

**Descrição.** Modelos `Conta`, `Categoria` e `Etiqueta` com escopo dual preparado. Nesta Milestone só o escopo pessoal existe; as colunas de grupo entram em M6.

**Checklist técnico**
- [ ] Modelos conforme [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo), com `usuarioId` e `contaCompartilhadaId` (esta última já declarada, sem FK ativa até M6).
- [ ] Enums `TipoConta` e `TipoCategoria`.
- [ ] `saldoInicial` como `Decimal @db.Decimal(14,2)` (RN-07).
- [ ] Auto-relação `Categoria.categoriaPai` / `subcategorias`.
- [ ] Índices compostos de §7.1.
- [ ] Migration manual com `CHECK` de escopo na forma parcial (só `usuario_id`) e índices únicos parciais de nome por escopo.
- [ ] Migration nomeada `adiciona_contas_e_categorias`.

**Critérios de aceite**
- [ ] `saldo_inicial` é `numeric(14,2)` no banco (verificado em `information_schema`).
- [ ] Duas contas com o mesmo nome para o mesmo usuário violam o índice único.
- [ ] Conta excluída logicamente libera o nome para reuso.
- [ ] Subcategoria com `categoria_pai_id` funciona; `onDelete: Restrict` impede excluir pai com filhos.

---

#### #23 · feat(contas): utilitário de dinheiro e cálculo de saldo

`M2` · **8 pts** · `backend` `feat` `contas` `p0-critica` · Depende de: #22 · RN-01 a RN-08

**Descrição.** O coração aritmético do sistema. Todo cálculo monetário do projeto passa por aqui, e um erro nesta issue contamina dashboard, relatórios, orçamentos e faturas. Exige 100% de cobertura.

**Checklist técnico**
- [ ] `utilitarios/dinheiro.ts` com `somar`, `subtrair`, `multiplicar`, `dividir`, `arredondar`, `ratearParcelas`, `paraStringApi`, `deStringApi` — todos operando em `Prisma.Decimal`.
- [ ] `ratearParcelas` com a diferença de arredondamento na **última** parcela (RN-21).
- [ ] `ContaRepositorio.calcularSaldoAtual` implementando a agregação de [03-DATABASE.md §8.1](03-DATABASE.md#81-saldo-atual-de-uma-conta-rn-01-rn-02-rn-03) — somando `valorPago`, não `valor`.
- [ ] `calcularSaldoPrevisto` conforme §8.2 (RN-04).
- [ ] `calcularSaldoConsolidado` filtrando `incluirNoSaldoTotal` e arquivadas (RN-05).
- [ ] Nenhuma coluna de saldo mutável — sempre derivado (RN-06, ADR-005).
- [ ] Testes com valores extremos, três casas decimais e casos de resto.

**Critérios de aceite**
- [ ] Cobertura **100%** em `dinheiro.ts` (*statements* e *branches*).
- [ ] `ratearParcelas` satisfaz `Σ = total` para `1000/3`, `100/7`, `0.05/2`, `10/4`, `0.01/3`.
- [ ] Saldo ignora `PENDENTE`, `ATRASADA` e `CANCELADA` (RN-02).
- [ ] Despesa `PAGA_PARCIALMENTE` de `100.00` com `valorPago: 30.00` reduz o saldo em exatamente `30.00` (RN-03).
- [ ] Saldo consolidado exclui conta arquivada e conta fora do total.
- [ ] Nenhuma ocorrência de `Number(`, `parseFloat` ou `+` aritmético sobre valor no arquivo.

---

#### #24 · feat(contas): CRUD de contas financeiras

`M2` · **5 pts** · `backend` `feat` `contas` `p0-critica` · Depende de: #23 · RF-14 a RF-17

**Descrição.** Endpoints completos de conta, incluindo a proteção que impede perder histórico por exclusão.

**Checklist técnico**
- [ ] `ContaRepositorio`, `ContaServico`, `ContaControlador`, `contas.validador.ts`, `contas.rotas.ts`.
- [ ] `GET /contas` com saldo atual, previsto e contagem de movimentações; `meta.totalizadores.saldoTotal`.
- [ ] `GET /contas/resumo` enxuto para seletores (sem agregações).
- [ ] `GET /contas/:id`, `POST /contas`, `PATCH /contas/:id`.
- [ ] `PATCH /contas/:id/arquivar` e `/desarquivar`.
- [ ] `PATCH /contas/reordenar` atualizando em lote numa transação.
- [ ] `DELETE /contas/:id` respondendo `409 RECURSO_EM_USO` com a contagem e a sugestão de arquivar.
- [ ] Validação de propriedade no **serviço**, respondendo `404` para conta de terceiro (RN-51).
- [ ] Bloquear lançamento em conta arquivada (preparado para M3).

**Critérios de aceite**
- [ ] Saldo de conta nova é igual ao `saldoInicial`.
- [ ] Nome duplicado no mesmo escopo responde `409`.
- [ ] Conta de outro usuário responde `404`, não `403`.
- [ ] `DELETE` em conta sem movimentações responde `204`; com movimentações, `409` com mensagem indicando o arquivamento.
- [ ] `saldoInicial` negativo é aceito (cheque especial).
- [ ] Reordenação persiste e a listagem respeita `ordem`.

---

#### #25 · feat(categorias): seed de categorias padrão e cópia no cadastro

`M2` · **3 pts** · `backend` `feat` `categorias` `p1-alta` · Depende de: #22 · RF-19

**Descrição.** As 18 categorias padrão e suas subcategorias, copiadas para o usuário no cadastro para que ele comece com algo utilizável em vez de uma tela vazia.

**Checklist técnico**
- [ ] `prisma/seed.ts` idempotente criando as categorias de [03-DATABASE.md §10.1](03-DATABASE.md#101-categorias-padrão-do-sistema) com `ehPadraoSistema: true`.
- [ ] Subcategorias iniciais de Alimentação, Transporte e Moradia.
- [ ] `npm run seed:producao` criando **somente** as categorias do sistema.
- [ ] Guarda abortando os dados de desenvolvimento quando `NODE_ENV === 'production'`.
- [ ] `CategoriaServico.copiarPadraoParaUsuario` chamado na transação de cadastro (#11).
- [ ] A cópia preserva a hierarquia pai/filho.

**Critérios de aceite**
- [ ] Rodar o seed duas vezes não duplica categorias.
- [ ] Usuário recém-cadastrado tem as 18 categorias e as subcategorias com a hierarquia correta.
- [ ] `seed:producao` não cria usuário nem movimentação.
- [ ] Tentar rodar o seed de desenvolvimento com `NODE_ENV=production` aborta com mensagem clara.

---

#### #26 · feat(categorias): CRUD de categorias com subcategorias

`M2` · **5 pts** · `backend` `feat` `categorias` `p1-alta` · Depende de: #25 · RF-20 a RF-22, RN-10

**Descrição.** CRUD com hierarquia de um nível e a exclusão que exige recategorização — não se apaga silenciosamente a classificação de lançamentos existentes.

**Checklist técnico**
- [ ] `GET /categorias` com árvore montada (`subcategorias` aninhadas) e filtros `tipo`, `apenasRaiz`.
- [ ] `POST /categorias` validando profundidade máxima 1 e mesmo tipo do pai.
- [ ] `PATCH /categorias/:id` impedindo troca de `tipo` quando há movimentações vinculadas.
- [ ] `DELETE /categorias/:id?recategorizarPara=<id>` migrando as movimentações e excluindo, em transação.
- [ ] Sem `recategorizarPara` e com vínculos → `409 RECURSO_EM_USO` com `meta.quantidadeMovimentacoes`.
- [ ] Impedir exclusão de categoria com subcategorias.
- [ ] `validarCompatibilidadeCategoria(categoria, tipo)` exportado para uso em M3 (RN-10).

**Critérios de aceite**
- [ ] Subcategoria de subcategoria responde `422 REGRA_NEGOCIO`.
- [ ] Subcategoria de tipo diferente do pai responde `422`.
- [ ] Trocar o tipo de categoria em uso responde `422`.
- [ ] `recategorizarPara` migra todas as movimentações e a operação é atômica.
- [ ] Categoria com subcategorias não pode ser excluída.
- [ ] `validarCompatibilidadeCategoria` cobre as três combinações de `TipoCategoria`.

---

#### #27 · feat(etiquetas): CRUD de etiquetas

`M2` · **3 pts** · `backend` `feat` `etiquetas` `p2-media` · Depende de: #22 · RF-33

**Descrição.** Marcadores livres, transversais às categorias. Nome normalizado e único por escopo.

**Checklist técnico**
- [ ] `GET /etiquetas` com contagem de uso.
- [ ] `POST /etiquetas` normalizando para minúsculas e validando unicidade no escopo.
- [ ] `PATCH /etiquetas/:id` e `DELETE /etiquetas/:id`.
- [ ] Exclusão remove os vínculos (`Cascade`) sem afetar movimentações.
- [ ] Nome de 1–40 caracteres, sem espaços nas extremidades.

**Critérios de aceite**
- [ ] `"Viagem"` e `"viagem"` colidem com `409 CONFLITO`.
- [ ] Excluir etiqueta em uso remove só o vínculo; a movimentação permanece.
- [ ] Etiqueta de outro usuário responde `404`.

---

#### #28 · feat(frontend): página de contas com cartões de saldo

`M2` · **5 pts** · `frontend` `feat` `contas` `p0-critica` · Depende de: #24, #18 · RF-14 a RF-18

**Descrição.** Primeira tela com dado financeiro real. Define o padrão visual de exibição de valores para todo o produto.

**Checklist técnico**
- [ ] `funcionalidades/contas/` com hooks, serviço, schemas e componentes.
- [ ] Chaves de query `chavesContas` e invalidação em cascata nas mutações.
- [ ] `CartaoSaldoTotal` em destaque com o saldo consolidado.
- [ ] `CartaoConta` com ícone, cor, nome, tipo, saldo atual e menu de ações.
- [ ] Grade responsiva: 1 coluna (mobile) → 2 (`md`) → 3 (`lg`) → 4 (`xl`).
- [ ] `FormularioConta` em `Dialog` com seletores de tipo, cor e ícone.
- [ ] Diálogo de confirmação de exclusão, tratando `409` com a sugestão de arquivar.
- [ ] Seção recolhível de contas arquivadas.
- [ ] Reordenação por arrastar (com alternativa acessível por teclado).
- [ ] `formatarMoeda` com `tabular-nums`; valores negativos em `perigo` **com sinal**, não só cor.
- [ ] Os quatro estados obrigatórios.

**Critérios de aceite**
- [ ] Criar conta atualiza a lista e o saldo total sem recarregar.
- [ ] Valores alinhados em coluna (numerais tabulares).
- [ ] Saldo negativo tem sinal `−` além da cor (A11Y-01).
- [ ] `409` na exclusão exibe diálogo oferecendo arquivar.
- [ ] Reordenação possível por teclado.
- [ ] Sem *scroll* horizontal em 320 px.

---

#### #29 · feat(frontend): página de categorias com árvore

`M2` · **3 pts** · `frontend` `feat` `categorias` `p1-alta` · Depende de: #26, #28 · RF-20 a RF-22

**Descrição.** Gestão de categorias com hierarquia visível e o fluxo de recategorização na exclusão.

**Checklist técnico**
- [ ] Abas Receitas / Despesas.
- [ ] `ArvoreCategorias` com pai expansível e filhos indentados.
- [ ] `FormularioCategoria` com nome, tipo, cor, ícone e pai (só categorias raiz do mesmo tipo).
- [ ] Seletor de ícones com busca (biblioteca Lucide).
- [ ] Paleta de cores pré-definida mais entrada hex livre.
- [ ] Diálogo de exclusão com seletor de categoria de destino quando a API responde `409`.
- [ ] Desabilitar o campo `tipo` na edição quando houver movimentações, com explicação visível.
- [ ] Contagem de uso por categoria.

**Critérios de aceite**
- [ ] Árvore expande e recolhe; estado por categoria.
- [ ] Seletor de pai oferece apenas raízes do mesmo tipo.
- [ ] `409` abre o seletor de destino e a exclusão conclui após a escolha.
- [ ] Campo `tipo` bloqueado com tooltip explicativo quando aplicável.
- [ ] Navegação da árvore por teclado (setas e `Enter`).

---

#### #30 · feat(frontend): componentes de seleção reutilizáveis

`M2` · **5 pts** · `frontend` `feat` `ui` `p1-alta` · Depende de: #28, #29 · —

**Descrição.** Seletores que serão usados em todos os formulários das Milestones seguintes. Investir na qualidade deles agora evita reescrever seis formulários depois.

**Checklist técnico**
- [ ] `SelecionadorConta` com ícone, cor, saldo e agrupamento pessoal/grupo (preparado para M6).
- [ ] `SelecionadorCategoria` com busca, agrupamento por pai e filtro por tipo.
- [ ] `SelecionadorEtiquetas` multi-seleção com criação inline.
- [ ] `CampoMoeda` com máscara pt-BR, aceitando digitação da direita para a esquerda e emitindo string decimal da API.
- [ ] `CampoData` com calendário, respeitando o timezone do perfil e atalhos ("hoje", "ontem").
- [ ] Todos integrados a React Hook Form via `Controller`.
- [ ] Todos com estados de carregando, vazio e erro.
- [ ] Todos operáveis por teclado, com `aria-label` e `aria-describedby`.

**Critérios de aceite**
- [ ] `CampoMoeda` digitando `12345` produz `"123.45"` na submissão.
- [ ] `CampoMoeda` rejeita mais de duas casas decimais e valores não numéricos.
- [ ] `CampoData` respeita o timezone do perfil (teste com `America/Sao_Paulo` e `UTC`).
- [ ] Seletores navegáveis e selecionáveis apenas por teclado.
- [ ] Área de toque ≥ 44 × 44 px em mobile (A11Y-08).

---

#### #31 · test(contas): suíte de integração de contas e categorias

`M2` · **2 pts** · `backend` `test` `p1-alta` · Depende de: #24, #26, #27 · RNF-13

**Descrição.** Cobertura de integração das rotas da Milestone, com ênfase em autorização negativa e nas constraints do banco.

**Checklist técnico**
- [ ] `testes/fabricas/` com `fabricarUsuario`, `fabricarConta`, `fabricarCategoria`, `fabricarEtiqueta`.
- [ ] `prepararUsuarioComConta()` retornando token, conta e categoria.
- [ ] Testes de integração de todas as rotas de contas, categorias e etiquetas.
- [ ] Testes negativos: recurso de outro usuário responde `404` em cada rota.
- [ ] Testes de violação deliberada de `CHECK` e de índice único.
- [ ] `EXPLAIN ANALYZE` da listagem de contas verificando uso de índice.

**Critérios de aceite**
- [ ] Cobertura ≥ 85% em `contas` e `categorias`.
- [ ] Toda rota tem ao menos um teste de autorização negativa.
- [ ] Suíte de integração roda em < 30 s.
- [ ] Testes independentes: qualquer ordem de execução passa.

---

# Milestone 3 — Movimentações e Transferências

> 14 issues · 76 pontos · depende de M2
> RF-23 a RF-39 · RN-09 a RN-27
> **Milestone mais crítica do projeto.** Erro de saldo aqui contamina M4 em diante.

---

#### #32 · feat(banco): migration de movimentações, anexos e vínculos de etiqueta

`M3` · **8 pts** · `banco` `feat` `p0-critica` · Depende de: #22 · RN-09 a RN-22

**Descrição.** A tabela central do sistema, com todos os campos de transferência, recorrência, parcelamento e cartão. Modelagem errada aqui é caríssima de corrigir depois.

**Checklist técnico**
- [ ] Modelo `Movimentacao` completo conforme [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo).
- [ ] Modelos `Anexo`, `MovimentacaoEtiqueta`, `CompraParcelada`.
- [ ] Enums `TipoMovimentacao`, `SituacaoMovimentacao`, `SentidoTransferencia`, `FrequenciaRecorrencia`.
- [ ] Auto-relação `modeloRecorrencia` / `ocorrencias`.
- [ ] `valor` e `valorPago` como `Decimal @db.Decimal(14,2)`; datas de calendário como `@db.Date`.
- [ ] Os 10 índices de `movimentacoes` de §7.1.
- [ ] Migration `adiciona_movimentacoes_e_etiquetas`.

**Critérios de aceite**
- [ ] `valor` e `valor_pago` são `numeric(14,2)`; `data_competencia` é `date` (não `timestamp`).
- [ ] Auto-relação funciona: modelo com ocorrências filhas.
- [ ] Todos os índices existem (verificado em `pg_indexes`).
- [ ] `onDelete: Restrict` em `conta` e `categoria` impede perder histórico por cascata.

---

#### #33 · feat(banco): constraints de domínio no banco

`M3` · **8 pts** · `banco` `feat` `p0-critica` · Depende de: #32 · RN-08, RN-09, RN-14, RN-17, RN-22

**Descrição.** Todos os `CHECK` e índices parciais de [03-DATABASE.md §6](03-DATABASE.md#6-constraints-não-expressáveis-no-prisma). O banco passa a rejeitar estado inválido mesmo que um bug de aplicação escape — última linha de defesa da integridade financeira.

**Checklist técnico**
- [ ] Migration manual `constraints_dominio`.
- [ ] `CHECK` de escopo XOR em `movimentacoes`, `contas`, `categorias`, `etiquetas`.
- [ ] `CHECK` de integridade de valores: `valor > 0`, `0 ≤ valor_pago ≤ valor`.
- [ ] `CHECK` de coerência: `sentido`/`transferencia_id` ⟷ `tipo = TRANSFERENCIA`.
- [ ] `CHECK` de efetivação: `PAGA`/`PAGA_PARCIALMENTE` exige `data_efetivacao`; pendentes não a têm.
- [ ] `CHECK` de parcelamento tudo-ou-nada, com `numero_parcela BETWEEN 1 AND total_parcelas`.
- [ ] `CHECK` de recorrência: modelo exige `frequencia` e não pode ser filho.
- [ ] Índices parciais `idx_mov_saldo` (com `INCLUDE (valor_pago)`) e `idx_mov_pendentes_vencimento`.
- [ ] Testes de integração que **violam deliberadamente** cada constraint e esperam erro do banco.

**Critérios de aceite**
- [ ] Inserir movimentação com `conta_id` **e** `conta_compartilhada_id` falha no banco.
- [ ] Inserir com os dois nulos falha.
- [ ] `valor = 0` e `valor` negativo falham.
- [ ] `valor_pago > valor` falha.
- [ ] `PAGA` sem `data_efetivacao` falha; `PENDENTE` com `data_efetivacao` falha.
- [ ] `TRANSFERENCIA` sem `sentido` falha; `DESPESA` com `sentido` falha.
- [ ] `numero_parcela` sem `compra_parcelada_id` falha.
- [ ] Cada constraint tem um teste nomeado com o ID da regra.

---

#### #34 · feat(movimentacoes): criação de receitas e despesas

`M3` · **8 pts** · `backend` `feat` `movimentacoes` `p0-critica` · Depende de: #33, #23 · RF-23, RF-24, RN-09 a RN-14

**Descrição.** O endpoint mais importante da API. Concentra a maior densidade de regras de negócio do projeto.

**Checklist técnico**
- [ ] `movimentacao.validador.ts` com `criarMovimentacaoSchema` e o `refine` de XOR de destino ([04-API.md §12.2](04-API.md#122-post-movimentacoes)).
- [ ] Rejeitar `tipo: TRANSFERENCIA` neste endpoint (existe rota própria).
- [ ] `MovimentacaoServico.criar` validando, em ordem: propriedade da conta (RN-51), conta não arquivada, categoria existente, compatibilidade de tipo (RN-10), escopo da categoria (RN-11), limites de data (RN-13).
- [ ] `valorPago` e `dataEfetivacao` obrigatórios conforme a situação (RN-14).
- [ ] Vinculação de etiquetas (máx. 10, mesmo escopo).
- [ ] Criação em transação quando há etiquetas.
- [ ] `POST /movimentacoes` respondendo `201` com o objeto completo (categoria, conta, etiquetas, autor).
- [ ] Objetos `transferencia`, `recorrencia`, `parcelamento` sempre presentes como chave, com `null` quando não se aplicam.

**Critérios de aceite**
- [ ] Receita e despesa criadas com todos os campos previstos.
- [ ] Categoria de `RECEITA` em despesa responde `422 CATEGORIA_INCOMPATIVEL` nomeando a categoria.
- [ ] Categoria `AMBOS` aceita os dois tipos.
- [ ] Conta de outro usuário responde `404`; conta arquivada, `422 CONTA_ARQUIVADA`.
- [ ] Dois destinos simultâneos (`contaId` + `cartaoId`) respondem `400`.
- [ ] Nenhum destino responde `400`.
- [ ] `situacao: PAGA` sem `dataEfetivacao` responde `400`.
- [ ] `valor: "0.00"` e `"-10.00"` respondem `400`.
- [ ] Data 11 anos no futuro responde `400` (RN-13).
- [ ] Criar despesa `PAGA` reduz o saldo da conta exatamente pelo valor.

---

#### #35 · feat(movimentacoes): listagem com filtros, paginação e totalizadores

`M3` · **5 pts** · `backend` `feat` `movimentacoes` `p0-critica` · Depende de: #34 · RF-34, RF-35, RN-25

**Descrição.** Listagem com todos os filtros de [04-API.md §12.1](04-API.md#121-get-movimentacoes) e totalizadores calculados sobre o filtro inteiro, não sobre a página.

**Checklist técnico**
- [ ] `montarWhere(filtros)` centralizado no repositório, com filtro base (`excluidoEm: null`, `ehModeloRecorrencia: false`).
- [ ] Parâmetros repetíveis tratados como OU lógico.
- [ ] `categoriaId` incluindo automaticamente as subcategorias.
- [ ] `campoData` alternando entre competência, vencimento e efetivação.
- [ ] `busca` sobre descrição e observação, *case-insensitive*.
- [ ] Paginação com `limite` máximo 100, respondendo `400` acima disso (não truncando silenciosamente).
- [ ] Ordenação por lista fechada de campos; campo fora dela responde `400`.
- [ ] `meta.totalizadores` sobre todo o filtro, **excluindo** transferências e canceladas (RN-25).
- [ ] `itens` e `count` na mesma `$transaction` para consistência.
- [ ] `EXPLAIN ANALYZE` documentado no PR.

**Critérios de aceite**
- [ ] Cada filtro funciona isoladamente e em combinação.
- [ ] Totalizadores conferem com a soma manual do conjunto filtrado.
- [ ] Transferências não entram nos totalizadores de receita/despesa.
- [ ] Modelos de recorrência nunca aparecem na listagem.
- [ ] `limite=200` responde `400`.
- [ ] `ordenarPor=senhaHash` responde `400`.
- [ ] Sem `Seq Scan` em `movimentacoes` no plano de execução.
- [ ] `categoriaId` de pai inclui movimentações das subcategorias.

---

#### #36 · feat(movimentacoes): edição, exclusão e duplicação

`M3` · **5 pts** · `backend` `feat` `movimentacoes` `p0-critica` · Depende de: #35 · RF-25, RF-26, RN-15, RN-16

**Descrição.** Alteração e exclusão lógica com recálculo de saldo e auditoria. Mudar de conta é deliberadamente proibido.

**Checklist técnico**
- [ ] `PATCH /movimentacoes/:id` alterando apenas os campos enviados.
- [ ] Bloquear alteração de `contaId`, `contaCompartilhadaId` e `cartaoId` com `422 REGRA_NEGOCIO` (afetaria o saldo de duas contas).
- [ ] Revalidar compatibilidade de categoria quando `categoriaId` ou `tipo` mudam.
- [ ] `DELETE /movimentacoes/:id` com exclusão lógica (`excluidoEm`).
- [ ] Excluir um lado de transferência delega para a exclusão do par (RN-39).
- [ ] `POST /movimentacoes/:id/duplicar` copiando tudo **exceto** anexos e vínculos de recorrência/parcelamento.
- [ ] Log de auditoria em alteração de valor de movimentação efetivada (RN-15).

**Critérios de aceite**
- [ ] Alterar valor de movimentação efetivada ajusta o saldo corretamente.
- [ ] Tentar mudar `contaId` responde `422` com mensagem explicando a alternativa.
- [ ] Movimentação excluída desaparece de listagens, saldos e totalizadores.
- [ ] Duplicar cria registro novo sem anexos e sem vínculo de recorrência.
- [ ] Excluir lado de transferência remove ambos.
- [ ] Movimentação de outro usuário responde `404` em `PATCH` e `DELETE`.

---

#### #37 · feat(movimentacoes): pagamento, pagamento parcial e estorno

`M3` · **8 pts** · `backend` `feat` `movimentacoes` `p0-critica` · Depende de: #36 · RF-29 a RF-31, RN-03, RN-14

**Descrição.** Transições de situação de pagamento. O pagamento parcial é a regra que mais frequentemente é implementada errada — o saldo deve refletir `valorPago`, não `valor`.

**Checklist técnico**
- [ ] `PATCH /movimentacoes/:id/pagar` com `dataEfetivacao` (padrão hoje), `valorPago` (padrão total) e `contaId` opcional.
- [ ] `valorPago < valor` → `PAGA_PARCIALMENTE`; igual → `PAGA` (RN-14).
- [ ] `valorPago > valor` responde `422`.
- [ ] Pagamento adicional sobre `PAGA_PARCIALMENTE` acumula em `valorPago`.
- [ ] `PATCH /movimentacoes/:id/estornar` voltando a `PENDENTE`, zerando `valorPago` e `dataEfetivacao`.
- [ ] Rejeitar pagar movimentação já `PAGA` ou `CANCELADA` com `422`.
- [ ] Todas as transições em transação, com recálculo de saldo.
- [ ] Testes de invariante: sequência criar → pagar parcial → completar → estornar → pagar devolve o saldo esperado em cada passo.

**Critérios de aceite**
- [ ] Pagar `100.00` integralmente reduz o saldo em `100.00`.
- [ ] Pagar `30.00` de `100.00` reduz o saldo em `30.00` e resulta em `PAGA_PARCIALMENTE` (RN-03).
- [ ] Pagar `70.00` adicionais completa para `PAGA` e o saldo total reduzido é `100.00`.
- [ ] `valorPago: "150.00"` em movimentação de `100.00` responde `422`.
- [ ] Estornar devolve o saldo ao estado anterior exatamente.
- [ ] Pagar duas vezes responde `422` na segunda.
- [ ] Sequência completa de transições preserva a invariante de saldo.

---

#### #38 · feat(movimentacoes): recorrências materializadas

`M3` · **5 pts** · `backend` `feat` `movimentacoes` `p0-critica` · Depende de: #37 · RF-27, RN-17 a RN-20

**Descrição.** Recorrência com registro-mãe como modelo e ocorrências concretas geradas para 12 meses (ADR-006). Edição e exclusão exigem escopo explícito.

**Checklist técnico**
- [ ] `utilitarios/data.ts` com `calcularProximaOcorrencia(data, frequencia, intervalo)` tratando meses curtos e ano bissexto.
- [ ] Criação com `recorrencia`: cria o modelo (`ehModeloRecorrencia: true`) e gera 12 meses de ocorrências, em transação.
- [ ] Validar exclusividade entre `fimEm` e `totalOcorrencias` (`422` se ambos).
- [ ] `escopoEdicao` obrigatório em `PATCH` de ocorrência de recorrência; ausência responde `400` (RN-19).
- [ ] Implementar os três escopos de edição e de exclusão (RN-19, RN-20).
- [ ] `GET /movimentacoes/:id/ocorrencias` aceitando o ID do modelo **ou** de qualquer ocorrência, com flag `divergeDoModelo`.
- [ ] `meta.recorrencia` na resposta de criação, com contagem gerada.

**Critérios de aceite**
- [ ] Recorrência mensal gera 12 ocorrências com datas corretas.
- [ ] Recorrência mensal iniciada em 31/01 gera 28/02 (ou 29 em bissexto) e 31/03 — não pula meses.
- [ ] Modelo nunca aparece em listagem nem afeta saldo.
- [ ] `PATCH` sem `escopoEdicao` responde `400`.
- [ ] `APENAS_ESTA` altera uma e marca `divergeDoModelo: true`.
- [ ] `ESTA_E_FUTURAS` não altera ocorrências passadas nem efetivadas.
- [ ] `TODAS` não altera ocorrências já efetivadas.
- [ ] Excluir o modelo remove futuras não efetivadas e preserva as efetivadas (RN-20).
- [ ] `fimEm` + `totalOcorrencias` juntos respondem `422`.

---

#### #39 · feat(transferencias): transferências como par atômico

`M3` · **5 pts** · `backend` `feat` `transferencias` `p0-critica` · Depende de: #37 · RF-36, RF-38, RF-39, RN-23 a RN-27

**Descrição.** Par de lançamentos vinculados criado e excluído na mesma transação (ADR-007). Retorna os saldos atualizados das duas contas para evitar a janela de saldo velho na interface.

**Checklist técnico**
- [ ] `TransferenciaServico.criar` gerando `transferenciaId` (UUID) e os dois lançamentos com `sentido` `SAIDA`/`ENTRADA`, em `$transaction`.
- [ ] Validar propriedade das duas contas e que são diferentes (`422 CONTAS_IGUAIS`).
- [ ] Validar que nenhuma está arquivada.
- [ ] `efetivada: false` cria o par como `PENDENTE`.
- [ ] `categoriaId` sempre `null` em transferência.
- [ ] `GET /transferencias/:transferenciaId` retornando o par.
- [ ] `DELETE /transferencias/:transferenciaId` excluindo ambos em transação (RN-26).
- [ ] Resposta com `saldoAtual` atualizado das duas contas.
- [ ] Garantir exclusão de `TRANSFERENCIA` em todo totalizador (helper único, RN-25).

**Critérios de aceite**
- [ ] `201` com os dois `movimentacaoId` e os saldos atualizados.
- [ ] Contas iguais respondem `422 CONTAS_IGUAIS`.
- [ ] Conta de terceiro responde `404`.
- [ ] Saldo da origem diminui e do destino aumenta, exatamente pelo valor.
- [ ] Falha simulada no segundo `create` não deixa o primeiro persistido (atomicidade).
- [ ] Excluir remove os dois lançamentos.
- [ ] Transferência não altera totalizadores de receita nem de despesa.

---

#### #40 · feat(anexos): upload, entrega autenticada e exclusão

`M3` · **3 pts** · `backend` `feat` `anexos` `p2-media` · Depende de: #34 · RF-32

**Descrição.** Comprovantes vinculados a movimentações, entregues por rota autenticada — não servidos estaticamente pelo Nginx, porque a propriedade precisa ser verificada em cada acesso.

**Checklist técnico**
- [ ] `POST /movimentacoes/:id/anexos` com Multer, múltiplos arquivos, limite de 5 MB e 5 por movimentação.
- [ ] Validação por extensão **e** *magic number* (PDF `%PDF`, JPEG `FFD8FF`, PNG `89504E47`).
- [ ] Caminho `/<usuarioId>/<ano>/<mes>/<uuid>.<ext>`; nome original sanitizado e nunca usado no disco.
- [ ] `GET /anexos/:id/conteudo` validando propriedade e fazendo *stream* com `Content-Disposition: inline`.
- [ ] `DELETE /anexos/:id` removendo registro e arquivo físico.
- [ ] Excluir movimentação remove os anexos do disco.
- [ ] *Rate limit* de 50 uploads/hora.

**Critérios de aceite**
- [ ] Upload de PDF e imagem funciona; `.exe` renomeado para `.pdf` é rejeitado com `415`.
- [ ] Arquivo de 6 MB responde `413`.
- [ ] 6º anexo na mesma movimentação responde `422`.
- [ ] Anexo de outro usuário responde `404` no download.
- [ ] Excluir anexo remove o arquivo do disco (verificado no sistema de arquivos).
- [ ] Nome com `../` ou caracteres especiais não escapa do diretório de destino.

---

#### #41 · feat(backend): tarefas agendadas de atraso e recorrência

`M3` · **5 pts** · `backend` `feat` `movimentacoes` `p1-alta` · Depende de: #38 · RF-30, RN-18

**Descrição.** Duas tarefas diárias idempotentes. Idempotência não é detalhe: a tarefa pode reexecutar por *restart* do container e não pode duplicar efeitos.

**Checklist técnico**
- [ ] `tarefas/agendador.ts` com `node-cron`, ativo por `HABILITAR_TAREFAS_AGENDADAS` e apenas em `NODE_APP_INSTANCE === '0'` (evita execução duplicada no cluster PM2).
- [ ] `marcar-atrasadas.tarefa.ts` (00:05): `PENDENTE` com `dataVencimento < hoje` → `ATRASADA`.
- [ ] `gerar-recorrencias.tarefa.ts` (00:15): reabastece ocorrências até 12 meses à frente.
- [ ] `limpar-tokens.tarefa.ts` (03:00): remove refresh tokens expirados.
- [ ] Toda tarefa loga início, fim, duração e contagem de registros afetados.
- [ ] Toda tarefa captura exceção sem derrubar o processo.
- [ ] Cada tarefa exposta como função pura, testável sem o agendador.

**Critérios de aceite**
- [ ] Cada tarefa executada duas vezes seguidas produz o mesmo estado final (idempotência).
- [ ] `marcar-atrasadas` não altera `PAGA`, `CANCELADA` nem modelos de recorrência.
- [ ] `gerar-recorrencias` não duplica ocorrências existentes.
- [ ] Erro em uma tarefa não impede a execução das demais.
- [ ] Com `HABILITAR_TAREFAS_AGENDADAS=false`, nenhuma tarefa é registrada.
- [ ] Cada tarefa tem teste unitário chamando a função diretamente.

---

#### #42 · feat(frontend): página de movimentações com filtros na URL

`M3` · **5 pts** · `frontend` `feat` `movimentacoes` `p0-critica` · Depende de: #35, #30 · RF-34, RF-35

**Descrição.** Tela principal do produto. Filtros na URL para que o estado seja compartilhável e sobreviva ao recarregamento.

**Checklist técnico**
- [ ] `usarParametrosUrl` sincronizando filtros com `searchParams`.
- [ ] `BarraFiltros` com período (atalhos: este mês, mês passado, 30 dias, personalizado), tipo, situação, conta, categoria, etiqueta e busca com debounce de 400 ms.
- [ ] Chips de filtros ativos, removíveis individualmente, com ação "limpar todos".
- [ ] `TabelaMovimentacoes` (≥ `md`) e `ListaCartoesMovimentacoes` (mobile).
- [ ] `CartaoTotalizadores` com receitas, despesas e resultado do filtro.
- [ ] Paginação acessível com informação de total.
- [ ] Ações por linha: editar, duplicar, pagar, estornar, excluir.
- [ ] Os quatro estados obrigatórios.
- [ ] Indicadores visuais de recorrência (`↻`), parcelamento (`3/10`) e transferência (`⇄`) — com rótulo textual, não só ícone.

**Critérios de aceite**
- [ ] Recarregar a página preserva todos os filtros.
- [ ] URL com filtros é compartilhável e reproduz a mesma visão.
- [ ] Busca dispara uma requisição por pausa de digitação, não por tecla.
- [ ] Tabela vira cartões abaixo de 768 px, sem *scroll* horizontal.
- [ ] Totalizadores refletem o filtro, não a página.
- [ ] Ações rápidas atualizam a lista e o saldo sem recarregar.
- [ ] Estado vazio distingue "nenhuma movimentação" de "nenhum resultado para o filtro".

---

#### #43 · feat(frontend): formulário de movimentação com recorrência

`M3` · **5 pts** · `frontend` `feat` `movimentacoes` `p0-critica` · Depende de: #42, #38 · RF-23, RF-24, RF-27

**Descrição.** Formulário único para receita e despesa, com seção de recorrência e o diálogo de escopo na edição.

**Checklist técnico**
- [ ] `FormularioMovimentacao` em `Sheet` (mobile) / `Dialog` (desktop), com abas Receita / Despesa.
- [ ] Campos: descrição, valor, datas, conta/cartão, categoria, situação, etiquetas, observação.
- [ ] Seção recolhível de recorrência, com pré-visualização das próximas 3 datas.
- [ ] Radio exclusivo entre "sem fim", "até a data" e "número de ocorrências".
- [ ] Campos condicionais: `dataEfetivacao` e `valorPago` aparecem conforme a situação.
- [ ] `DialogoEscopoEdicao` para ocorrência de recorrência, com as três opções explicadas.
- [ ] Schema Zod espelhando as regras do backend, com mensagens em pt-BR.
- [ ] Mapear erros `422` da API para os campos correspondentes.
- [ ] Invalidação em cascata: `movimentacoes`, `contas`, `dashboard`, `relatorios`.

**Critérios de aceite**
- [ ] Criar receita e despesa funciona com todos os campos.
- [ ] Pré-visualização das datas de recorrência é correta, inclusive iniciando em dia 31.
- [ ] Editar ocorrência exibe o diálogo de escopo e respeita a escolha.
- [ ] `422 CATEGORIA_INCOMPATIVEL` destaca o campo de categoria com a mensagem da API.
- [ ] Após criar, saldo da conta e dashboard já refletem a mudança.
- [ ] Formulário completável apenas por teclado.

---

#### #44 · feat(frontend): transferências e anexos

`M3` · **3 pts** · `frontend` `feat` `transferencias` `p1-alta` · Depende de: #39, #40, #43 · RF-36, RF-32

**Descrição.** Formulário de transferência com pré-visualização do efeito nos dois saldos, e upload de anexos na movimentação.

**Checklist técnico**
- [ ] `FormularioTransferencia` com conta de origem, destino, valor, data e descrição automática.
- [ ] Excluir a conta escolhida na origem da lista de destino (impede o erro antes da requisição).
- [ ] Pré-visualização "saldo depois" das duas contas.
- [ ] `UploadAnexos` com arrastar-e-soltar, pré-visualização, barra de progresso e remoção.
- [ ] Visualizador de anexo em modal (imagem inline, PDF em `iframe`).
- [ ] Tratar `413` e `415` com mensagens específicas, não genéricas.
- [ ] Indicador de quantidade de anexos na listagem.

**Critérios de aceite**
- [ ] Conta de origem não aparece como opção de destino.
- [ ] Pré-visualização de saldo confere com o resultado após a submissão.
- [ ] Upload mostra progresso e trata falha sem perder os arquivos já enviados.
- [ ] `415` exibe mensagem indicando os tipos aceitos.
- [ ] Visualizador funciona para PDF e imagem, com fechamento por `Esc`.

---

#### #45 · test(movimentacoes): suíte completa e invariantes de saldo

`M3` · **3 pts** · `backend` `test` `p0-critica` · Depende de: #39, #41 · RNF-13, RN-01 a RN-27

**Descrição.** A rede de segurança da Milestone mais crítica. Além da cobertura por rota, testes de **invariante**: sequências de operações cujo saldo final é conhecido e verificável.

**Checklist técnico**
- [ ] Fábricas de movimentação, transferência, recorrência e compra parcelada.
- [ ] Integração de todas as rotas de movimentações e transferências.
- [ ] Teste de invariante: criar 20 movimentações variadas → conferir saldo → executar 10 operações (pagar, estornar, editar, excluir) → conferir saldo recalculado do zero.
- [ ] Casos-limite de [05-DEVELOPMENT.md §12.5](05-DEVELOPMENT.md#125-casos-limite-obrigatórios-em-código-financeiro): valores, arredondamento, datas, situação, escopo.
- [ ] Teste de concorrência: duas transferências simultâneas na mesma conta.
- [ ] Teste de autorização negativa em todas as rotas.
- [ ] `EXPLAIN ANALYZE` da listagem com filtros combinados.

**Critérios de aceite**
- [ ] Cobertura ≥ 90% em `movimentacao.servico.ts` e `transferencia.servico.ts`.
- [ ] Saldo recalculado do zero coincide com o incremental após 30 operações.
- [ ] Todos os casos-limite de datas passam (virada de mês/ano, 29/02, dia 31).
- [ ] Transferências concorrentes resultam em saldo correto, sem escrita perdida.
- [ ] Toda rota tem teste de acesso negado.
- [ ] Nenhum `Seq Scan` em `movimentacoes`.

---

# Milestone 4 — Dashboard e Relatórios

> 10 issues · 50 pontos · depende de M3
> RF-40 a RF-43, RF-47, RF-72 a RF-74

---

#### #46 · feat(banco): view de saldo e otimização das agregações

`M4` · **5 pts** · `banco` `feat` `p1-alta` · Depende de: #33 · RN-01, RNF-06

**Descrição.** View `vw_saldo_conta` centralizando a agregação de saldo, para não repetir a mesma expressão `CASE` em seis consultas diferentes. Deliberadamente **não** materializada (ADR-005).

**Checklist técnico**
- [ ] Migration `adiciona_views_saldo` com a view de [03-DATABASE.md §8.7](03-DATABASE.md#87-views-auxiliares).
- [ ] Consumo via `prisma.$queryRaw` **tipado**, exclusivamente dentro de `ContaRepositorio`.
- [ ] Refatorar `calcularSaldoAtual` e `calcularSaldoConsolidado` para usar a view.
- [ ] `EXPLAIN ANALYZE` antes e depois, documentado no PR.
- [ ] Verificar uso de `idx_mov_saldo` no plano de execução.
- [ ] Teste de regressão confirmando que os saldos permanecem idênticos aos da M2.

**Critérios de aceite**
- [ ] Saldos idênticos aos calculados antes da refatoração, em todos os testes existentes.
- [ ] Plano de execução usa `idx_mov_saldo`, sem `Seq Scan`.
- [ ] Saldo consolidado de usuário com 5 000 movimentações responde em < 80 ms.
- [ ] `$queryRaw` parametrizado, sem interpolação de string.

---

#### #47 · feat(dashboard): indicadores consolidados

`M4` · **5 pts** · `backend` `feat` `dashboard` `p0-critica` · Depende de: #46 · RF-40, RF-47, RN-04

**Descrição.** Bloco de indicadores com saldo atual, receitas, despesas, saldo previsto, variação contra o período anterior e taxa de poupança.

**Checklist técnico**
- [ ] `DashboardRepositorio.obterIndicadores(usuarioId, periodo, escopo)`.
- [ ] Saldo atual consolidado; receitas e despesas por `dataCompetencia` no período.
- [ ] Saldo previsto somando pendentes e atrasadas até o fim do período (RN-04).
- [ ] Variação percentual contra o período anterior de **mesma duração**.
- [ ] `taxaPoupanca = resultado / receitas × 100`, com guarda para receitas zero.
- [ ] Exclusão de transferências e canceladas (RN-25).
- [ ] `GET /dashboard/indicadores` com `dataInicio`, `dataFim`, `contaCompartilhadaId`.
- [ ] Período padrão: mês corrente no timezone do perfil.

**Critérios de aceite**
- [ ] Indicadores conferem com os totalizadores da listagem para o mesmo filtro.
- [ ] Transferências não entram em receitas nem despesas.
- [ ] Receitas zero não produz `NaN` nem `Infinity` na taxa de poupança.
- [ ] Variação correta com período anterior de mesma duração (inclusive fevereiro).
- [ ] Período padrão respeita o timezone do perfil, não o do servidor.

---

#### #48 · feat(dashboard): fluxo de caixa de 12 meses

`M4` · **8 pts** · `backend` `feat` `dashboard` `p1-alta` · Depende de: #47 · RF-41

**Descrição.** Série temporal com `generate_series`, garantindo que meses sem movimentação apareçam com zero — lacunas distorceriam a leitura do gráfico.

**Checklist técnico**
- [ ] Consulta de [03-DATABASE.md §8.4](03-DATABASE.md#84-fluxo-de-caixa-de-12-meses-rf-41) com `generate_series`.
- [ ] `GET /dashboard/fluxo-caixa` com parâmetro `meses` (padrão 12, máx. 36).
- [ ] Rótulo mensal abreviado em pt-BR (`jan/26`).
- [ ] Agrupamento por `date_trunc('month', data_competencia)`.
- [ ] Exclusão de transferências, canceladas, excluídas e modelos de recorrência.
- [ ] Escopo pessoal ou de grupo.
- [ ] `$queryRaw` tipado no repositório.

**Critérios de aceite**
- [ ] Sempre retorna exatamente `meses` pontos, mesmo sem nenhuma movimentação.
- [ ] Mês sem movimentação vem com `"0.00"`, não ausente.
- [ ] Rótulos em pt-BR e na ordem cronológica.
- [ ] `meses=48` responde `400`.
- [ ] Soma dos 12 meses confere com o relatório anual do mesmo período.

---

#### #49 · feat(dashboard): agregação por categoria

`M4` · **5 pts** · `backend` `feat` `dashboard` `p1-alta` · Depende de: #47 · RF-42

**Descrição.** Distribuição de despesas (e receitas) por categoria, com percentual calculado no servidor.

**Checklist técnico**
- [ ] Consulta de [03-DATABASE.md §8.3](03-DATABASE.md#83-despesas-por-categoria-no-período-rf-42) com percentual por janela.
- [ ] `GET /dashboard/por-categoria` com `tipo` (padrão `DESPESA`), período e escopo.
- [ ] Agrupar por categoria raiz, com opção `incluirSubcategorias` para detalhar.
- [ ] Movimentação sem categoria agrupada como "Sem categoria".
- [ ] Ordenação por total decrescente.
- [ ] Soma dos percentuais igual a 100% (tratando arredondamento no último item).

**Critérios de aceite**
- [ ] Percentuais somam exatamente 100,00 quando há dados.
- [ ] Período sem despesas retorna array vazio, não erro.
- [ ] Subcategorias agrupadas na raiz por padrão.
- [ ] Movimentações sem categoria aparecem agrupadas.
- [ ] Soma dos totais confere com o indicador de despesas do mesmo período.

---

#### #50 · feat(dashboard): endpoint agregado

`M4` · **5 pts** · `backend` `feat` `dashboard` `p0-critica` · Depende de: #48, #49 · RF-40 a RF-47

**Descrição.** Endpoint único que devolve todos os blocos da tela inicial, evitando 6 requisições paralelas em conexão móvel.

**Checklist técnico**
- [ ] `GET /dashboard` retornando a estrutura de [04-API.md §21.1](04-API.md#211-get-dashboard-).
- [ ] Executar as consultas em paralelo com `Promise.all`.
- [ ] Blocos `contasCompartilhadas`, `metas`, `orcamentos` e `cartoes` retornam array vazio até as Milestones correspondentes (chave sempre presente).
- [ ] Geração de `alertas` a partir de vencimentos próximos (D-7).
- [ ] Últimas 10 movimentações.
- [ ] Rótulo de período em pt-BR ("Julho de 2026").
- [ ] Medição de tempo total logada.

**Critérios de aceite**
- [ ] Todas as chaves da estrutura documentada estão presentes, mesmo vazias.
- [ ] Responde em < 300 ms com 5 000 movimentações.
- [ ] Consultas executam em paralelo (verificado no log de duração).
- [ ] Valores conferem com os endpoints granulares equivalentes.
- [ ] Alertas listam apenas vencimentos dos próximos 7 dias.

---

#### #51 · feat(relatorios): relatórios mensal e anual

`M4` · **5 pts** · `backend` `feat` `relatorios` `p1-alta` · Depende de: #50 · RF-72

**Descrição.** Relatórios de fechamento com quebras por categoria, conta e dia, mais comparativo com o período anterior.

**Checklist técnico**
- [ ] `GET /relatorios/mensal` com a estrutura de [04-API.md §22.1](04-API.md#221-get-relatoriosmensal-).
- [ ] Saldo inicial e final do período.
- [ ] Quebras: por categoria (receitas e despesas), por conta, por dia.
- [ ] Top 10 maiores despesas.
- [ ] Comparativo com o mês anterior, com variação percentual.
- [ ] `GET /relatorios/anual` com quebra por mês, médias mensais, melhor e pior mês.
- [ ] Validar `ano` (2000–2100) e `mes` (1–12).

**Critérios de aceite**
- [ ] Relatório mensal confere com o extrato do período, valor a valor.
- [ ] `saldoFinal = saldoInicial + resultado` do período.
- [ ] Soma dos 12 meses do anual confere com o total anual.
- [ ] Período sem movimentação retorna zeros, não erro.
- [ ] `mes=13` responde `400`.
- [ ] Transferências excluídas de todas as quebras.

---

#### #52 · feat(relatorios): relatórios por categoria, conta e fluxo de caixa

`M4` · **5 pts** · `backend` `feat` `relatorios` `p2-media` · Depende de: #51 · RF-73, RF-74

**Descrição.** Três relatórios de detalhamento com período livre, complementando os de fechamento.

**Checklist técnico**
- [ ] `GET /relatorios/por-categoria` com período livre, tipo, escopo e detalhe de subcategorias.
- [ ] `GET /relatorios/por-conta` com receitas, despesas, resultado e saldos inicial/final por conta.
- [ ] `GET /relatorios/fluxo-caixa` com evolução do saldo acumulado, granularidade diária ou mensal.
- [ ] Todos aceitam `dataInicio`/`dataFim` arbitrários e `contaCompartilhadaId`.
- [ ] Validar que `dataInicio ≤ dataFim` e o intervalo máximo de 5 anos.

**Critérios de aceite**
- [ ] Soma por conta confere com o total geral do período.
- [ ] Saldo acumulado do fluxo de caixa termina no saldo atual da conta.
- [ ] `dataInicio > dataFim` responde `400`.
- [ ] Intervalo de 10 anos responde `400`.
- [ ] Granularidade diária em intervalo de 1 ano não excede 1 200 ms.

---

#### #53 · feat(frontend): dashboard responsivo

`M4` · **5 pts** · `frontend` `feat` `dashboard` `p0-critica` · Depende de: #50, #42 · RF-40 a RF-47

**Descrição.** Tela inicial do produto: em uma olhada, quanto tenho, quanto entrou, quanto saiu e para onde foi.

**Checklist técnico**
- [ ] `usarDashboard(periodo)` com `staleTime` de 60 s.
- [ ] `SelecionadorPeriodo` com atalhos e persistência na URL.
- [ ] `CartaoIndicador` com valor, rótulo, ícone e variação (seta + sinal + cor).
- [ ] Grade responsiva: 1 → 2 (`md`) → 4 (`xl`) colunas de indicadores.
- [ ] Seções: indicadores, fluxo de caixa, despesas por categoria, últimas movimentações, contas, alertas.
- [ ] Esqueleto por seção — não um *spinner* de página inteira.
- [ ] Seções condicionais (metas, orçamentos, grupos, cartões) só renderizam com dados.
- [ ] Ação rápida flutuante de "nova movimentação" em mobile.

**Critérios de aceite**
- [ ] Trocar o período recarrega os dados sem *layout shift*.
- [ ] Esqueleto por seção durante o carregamento.
- [ ] Variação exibida com seta **e** sinal, não só por cor (A11Y-01).
- [ ] Sem *scroll* horizontal em 320 px.
- [ ] Registrar movimentação em outra tela atualiza o dashboard ao voltar.
- [ ] Usuário sem dados vê estado vazio orientando o primeiro passo.

---

#### #54 · feat(frontend): gráficos acessíveis com Recharts

`M4` · **5 pts** · `frontend` `feat` `dashboard` `p1-alta` · Depende de: #53 · RF-41, RF-42, A11Y-04

**Descrição.** Componentes de gráfico reutilizáveis, legíveis nos dois temas e com equivalente textual — gráfico sem alternativa acessível é informação indisponível para parte dos usuários.

**Checklist técnico**
- [ ] `GraficoLinha` (fluxo de caixa), `GraficoPizza` (categorias), `GraficoBarra` (comparativo).
- [ ] Cores dos tokens do Design System, com contraste verificado nos dois temas.
- [ ] *Tooltip* com valor formatado em moeda pt-BR.
- [ ] `ResponsiveContainer` com altura mínima; rótulos rotacionados em telas estreitas.
- [ ] `TabelaEquivalente` recolhível abaixo de cada gráfico (A11Y-04).
- [ ] `role="img"` com `aria-label` descrevendo a tendência da série.
- [ ] Respeitar `prefers-reduced-motion` nas animações (A11Y-07).
- [ ] Estado vazio próprio ("sem dados no período").
- [ ] Paleta de categorias determinística: mesma categoria, mesma cor em todos os gráficos.

**Critérios de aceite**
- [ ] Gráficos legíveis em 320 px, sem rótulos sobrepostos.
- [ ] Tabela equivalente contém todos os pontos da série.
- [ ] Leitor de tela anuncia a descrição do gráfico.
- [ ] Com `prefers-reduced-motion`, não há animação de entrada.
- [ ] Contraste das séries adequado em tema claro e escuro.
- [ ] Mesma categoria mantém a mesma cor entre gráficos diferentes.

---

#### #55 · feat(frontend): página de relatórios

`M4` · **2 pts** · `frontend` `feat` `relatorios` `p2-media` · Depende de: #52, #54 · RF-72 a RF-74

**Descrição.** Abas de relatório reaproveitando os componentes de gráfico e tabela.

**Checklist técnico**
- [ ] Abas: Mensal · Anual · Por categoria · Por conta · Fluxo de caixa.
- [ ] Aba e período persistidos na URL.
- [ ] Navegação mês a mês e ano a ano com setas.
- [ ] Tabelas com totais no rodapé e ordenação por coluna.
- [ ] Comparativo com o período anterior destacado.
- [ ] Botão de exportação desabilitado com tooltip "disponível na v2.0" (RF-76 é M10).
- [ ] Layout de impressão razoável (`@media print`).

**Critérios de aceite**
- [ ] Troca de aba preserva o período selecionado.
- [ ] URL reproduz aba e período ao ser compartilhada.
- [ ] Totais das tabelas conferem com os indicadores.
- [ ] Tabelas com `overflow-x: auto` próprio em mobile (a página não rola horizontalmente).
- [ ] Impressão gera documento legível.

---

# Milestone 5 — CI/CD e Deploy em Produção

> 10 issues · 42 pontos · depende de M4 · **Entrega a v1.0.0 em produção**
> RNF-07 a RNF-12, RNF-19 a RNF-22

---

#### #56 · build(infra): Dockerfile do backend com PM2 cluster

`M5` · **5 pts** · `infra` `build` `p0-critica` · Depende de: #9 · RNF-09, ADR-008

**Descrição.** Imagem multi-estágio enxuta, com `pm2-runtime` em modo cluster como *entrypoint* — o PM2 usa todos os núcleos da VPS que um processo Node isolado desperdiçaria.

**Checklist técnico**
- [ ] `Dockerfile` multi-estágio conforme [08-CICD.md §3.1](08-CICD.md#31-dockerfile-do-backend): `deps` → `build` → `runtime`.
- [ ] Base `node:22-alpine`; usuário não-root (`node`).
- [ ] `prisma generate` no estágio de build; `prisma` e migrations copiados para o runtime.
- [ ] `ecosystem.config.cjs` com `instances: 'max'`, `exec_mode: 'cluster'`, `max_memory_restart`.
- [ ] `CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]` (não `pm2 start` — precisa ficar em primeiro plano como PID 1).
- [ ] `HEALTHCHECK` chamando `/api/v1/saude`.
- [ ] `.dockerignore` excluindo `node_modules`, `testes`, `.env`, `dist`.
- [ ] `dumb-init` para propagação correta de sinais.

**Critérios de aceite**
- [ ] Imagem final < 250 MB.
- [ ] Container roda como usuário não-root (`id` confirma).
- [ ] `docker stop` encerra em < 10 s, com desligamento gracioso.
- [ ] PM2 sobe N processos, com N = número de núcleos.
- [ ] `HEALTHCHECK` reporta `healthy` após a inicialização.
- [ ] Nenhum segredo embutido na imagem (`docker history` confirma).

---

#### #57 · build(infra): compose de produção e build do frontend

`M5` · **5 pts** · `infra` `build` `p0-critica` · Depende de: #56 · ADR-009

**Descrição.** Orquestração de produção com API e PostgreSQL. O frontend é artefato estático servido pelo Nginx, sem container próprio.

**Checklist técnico**
- [ ] `docker-compose.prod.yml` com `api` e `postgres`, conforme [08-CICD.md §3.3](08-CICD.md#33-docker-composeprodyml).
- [ ] PostgreSQL vinculado a `127.0.0.1` (nunca `0.0.0.0`).
- [ ] Volumes nomeados para dados; *bind mount* para `/var/pfm/uploads`.
- [ ] `restart: unless-stopped`; limites de memória e CPU.
- [ ] `depends_on` com `condition: service_healthy`.
- [ ] Rotação de logs (`json-file`, `max-size`, `max-file`).
- [ ] `Dockerfile` do frontend produzindo apenas o artefato de build (estágio de export).
- [ ] Variáveis de build do frontend injetadas em tempo de build (`VITE_*`).

**Critérios de aceite**
- [ ] `docker compose -f docker-compose.prod.yml up -d` sobe os dois serviços saudáveis.
- [ ] PostgreSQL não responde a partir de IP externo (verificado com `nmap`).
- [ ] Volume de uploads persiste após `down`/`up`.
- [ ] Build do frontend gera `dist/` com *assets* versionados por hash.
- [ ] Logs limitados em tamanho, sem crescimento indefinido.

---

#### #58 · chore(infra): provisionamento da VPS Hostinger

`M5` · **5 pts** · `infra` `chore` `p0-critica` · Depende de: — · RNF-10

**Descrição.** Preparar o servidor: usuário de deploy sem privilégio excessivo, Docker, firewall e endurecimento do SSH.

**Checklist técnico**
- [ ] Ubuntu 24.04 LTS atualizado; `unattended-upgrades` para pacotes de segurança.
- [ ] Usuário `deploy` no grupo `docker`, com `sudo` restrito ao necessário.
- [ ] SSH: autenticação só por chave, `PermitRootLogin no`, `PasswordAuthentication no`.
- [ ] `fail2ban` no SSH.
- [ ] UFW liberando apenas 22, 80 e 443.
- [ ] Docker Engine e Compose plugin.
- [ ] Estrutura `/var/pfm/{uploads,backups,releases}` com propriedade correta.
- [ ] Swap de 2 GB (evita OOM em picos de build).
- [ ] Timezone `America/Sao_Paulo`; NTP ativo.
- [ ] Script `infra/provisionar.sh` versionado e idempotente.

**Critérios de aceite**
- [ ] Login por senha e login como root são rejeitados.
- [ ] `ufw status` mostra apenas as três portas.
- [ ] Usuário `deploy` executa `docker` sem `sudo`.
- [ ] Script reexecutado não quebra nem duplica configuração.
- [ ] Horário do servidor correto (relevante para as tarefas agendadas).

---

#### #59 · chore(infra): Nginx com TLS, proxy reverso e SPA

`M5` · **5 pts** · `infra` `chore` `p0-critica` · Depende de: #58 · RNF-11, RN-56

**Descrição.** Ponto de entrada único: TLS, proxy para a API, SPA estática com *fallback* de rota e cabeçalhos de segurança.

**Checklist técnico**
- [ ] Configuração de [08-CICD.md §4.1](08-CICD.md#41-configuração-do-nginx).
- [ ] `location /` servindo `/var/www/pfm` com `try_files ... /index.html` (rotas do React Router).
- [ ] `location /api/v1` e `/api/docs` em proxy para `127.0.0.1:3333`, com `X-Forwarded-For` e `X-Forwarded-Proto`.
- [ ] Certbot com renovação automática via timer do systemd.
- [ ] Redirecionamento 80 → 443; HSTS com `preload`.
- [ ] TLS 1.2/1.3, cifras modernas, OCSP stapling.
- [ ] Cabeçalhos: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP.
- [ ] gzip e brotli; `Cache-Control: immutable` para *assets* com hash e `no-cache` para `index.html`.
- [ ] `client_max_body_size 6M` (compatível com o limite de anexo de 5 MB).

**Critérios de aceite**
- [ ] Nota A em SSL Labs.
- [ ] HTTP redireciona para HTTPS com 301.
- [ ] Recarregar `/movimentacoes` diretamente serve o `index.html` (sem 404).
- [ ] `certbot renew --dry-run` bem-sucedido.
- [ ] Upload de 5 MB passa; 7 MB é rejeitado pelo Nginx.
- [ ] Todos os cabeçalhos de segurança presentes (verificado com `curl -I`).
- [ ] `index.html` nunca vem de cache obsoleto após deploy.

---

#### #60 · ci(infra): pipeline de deploy em produção

`M5` · **8 pts** · `infra` `ci` `p0-critica` · Depende de: #57, #59 · RNF-11

**Descrição.** O pipeline que dá sentido a esta Milestone: merge em `main` publica sem intervenção manual, com *health check* como portão e rollback automático.

**Checklist técnico**
- [ ] `.github/workflows/deploy-producao.yml` disparando em `push` para `main`.
- [ ] Jobs sequenciais: `verificar` → `construir` → `implantar` → `verificar-saude`.
- [ ] Build da imagem da API e publicação no GHCR com tag de SHA e `latest`.
- [ ] Build do frontend com as variáveis de produção; artefato empacotado.
- [ ] Deploy via SSH sem expor a chave em log.
- [ ] Sequência no servidor: dump do banco → `pull` da imagem → `migrate deploy` → subir nova → *health check* → sincronizar frontend → limpar imagens antigas.
- [ ] Guardar a tag da versão anterior para rollback.
- [ ] `GITHUB_ENVIRONMENT` de produção com os secrets necessários.
- [ ] Notificação de sucesso/falha.

**Critérios de aceite**
- [ ] Merge em `main` publica sem nenhum passo manual.
- [ ] Pipeline completo em < 12 minutos.
- [ ] Nenhum segredo aparece no log do workflow.
- [ ] Falha em qualquer job interrompe o deploy sem publicar parcialmente.
- [ ] Dump pré-migration criado em `/var/pfm/backups`.
- [ ] Imagens antigas removidas, mantendo as duas últimas para rollback.

---

#### #61 · ci(infra): health check como portão e rollback automático

`M5` · **3 pts** · `infra` `ci` `p0-critica` · Depende de: #60 · RNF-11, RNF-20

**Descrição.** A rede de segurança do deploy. Rollback não ensaiado é rollback que falha na hora que importa — esta issue exige teste real de falha.

**Checklist técnico**
- [ ] `infra/verificar-saude.sh`: consulta `/api/v1/saude/prontidao` a cada 5 s por até 90 s.
- [ ] Exigir `status: "pronto"` e todas as verificações `ok`, não apenas HTTP 200.
- [ ] `infra/reverter.sh`: retorna à imagem anterior, sobe, revalida e alerta.
- [ ] Rollback disparado automaticamente em falha do *health check*.
- [ ] Rollback de migration **não** é automático — apenas alerta com o caminho do dump (reverter schema automaticamente é mais arriscado que o problema original).
- [ ] Log de deploy em `/var/pfm/releases/historico.log` com SHA, horário e resultado.
- [ ] Notificação distinguindo "deploy revertido" de "deploy falhou sem reverter".

**Critérios de aceite**
- [ ] Deploy de versão deliberadamente quebrada dispara rollback e a versão anterior volta a atender.
- [ ] Tempo total de indisponibilidade no rollback < 60 s.
- [ ] Histórico de deploy registra todas as tentativas.
- [ ] Falha de migration alerta com o caminho do dump e **não** tenta reverter o schema.
- [ ] Notificação diferencia os dois cenários de falha.

---

#### #62 · chore(infra): deploy de homologação em staging

`M5` · **3 pts** · `infra` `ci` `p1-alta` · Depende de: #61 · —

**Descrição.** Ambiente de homologação em subdomínio, com o mesmo pipeline, para validar a Milestone antes do PR para `main`.

**Checklist técnico**
- [ ] `deploy-staging.yml` disparando em `push` para `staging`.
- [ ] Subdomínio `staging.<dominio>` com certificado próprio.
- [ ] Compose de staging com portas e banco separados na mesma VPS.
- [ ] Banner "AMBIENTE DE HOMOLOGAÇÃO" no frontend (`VITE_AMBIENTE=staging`).
- [ ] Seed de dados de demonstração por comando manual.
- [ ] `robots.txt` bloqueando indexação; autenticação básica no Nginx.
- [ ] Backup **não** obrigatório em staging (dados descartáveis).

**Critérios de aceite**
- [ ] Push em `staging` publica em `staging.<dominio>`.
- [ ] Banner de homologação visível em todas as telas.
- [ ] Bancos de staging e produção completamente isolados.
- [ ] Staging não aparece em busca (autenticação básica ativa).
- [ ] Falha em staging não afeta produção.

---

#### #63 · chore(infra): backup automatizado e restauração testada

`M5` · **3 pts** · `infra` `chore` `p0-critica` · Depende de: #58 · RNF-12

**Descrição.** Backup diário com verificação de integridade. Backup não testado não é backup — a restauração é parte desta issue, não uma promessa futura.

**Checklist técnico**
- [ ] `infra/backup.sh` com `pg_dump --format=custom --compress=9`.
- [ ] Timer do systemd às 03:30, timezone do servidor.
- [ ] Retenção: 7 diários + 4 semanais, com limpeza automática.
- [ ] Backup incremental dos anexos (`tar` de `/var/pfm/uploads`).
- [ ] Verificação de integridade com `pg_restore --list` após cada dump.
- [ ] `infra/restaurar.sh` restaurando em banco descartável e comparando contagem de linhas.
- [ ] Alerta se o backup não rodar ou ficar abaixo do tamanho esperado.
- [ ] Procedimento documentado em [08-CICD.md](08-CICD.md).

**Critérios de aceite**
- [ ] Backup executa automaticamente e gera arquivo válido.
- [ ] Restauração em banco descartável funciona, com contagens conferindo.
- [ ] Retenção remove os antigos e mantém a quantidade correta.
- [ ] Backup vazio ou corrompido gera alerta.
- [ ] Dump pré-migration criado pelo pipeline.
- [ ] **Restauração completa executada e documentada com evidência.**

---

#### #64 · feat(backend): endurecimento de produção e observabilidade

`M5` · **3 pts** · `backend` `feat` `p1-alta` · Depende de: #56 · RNF-19 a RNF-22, RN-56

**Descrição.** Ajustes que só fazem sentido com produção real: `trust proxy`, CORS restrito, encerramento gracioso e métricas.

**Checklist técnico**
- [ ] `app.set('trust proxy', 1)` para IP real atrás do Nginx (sem isso o *rate limit* vê um único IP).
- [ ] CORS restrito a `ORIGENS_PERMITIDAS`, sem coringa em produção.
- [ ] Helmet com CSP alinhada ao Nginx.
- [ ] Encerramento gracioso: para de aceitar conexões, finaliza as em curso (30 s), desconecta o Prisma.
- [ ] Nível de log `info` em produção, com redação de campos sensíveis.
- [ ] Métricas de requisição (contagem, latência p50/p95/p99, taxa de erro) expostas em rota protegida.
- [ ] `ERRO_INTERNO` sem `stack` em produção (RN-56); `stack` sempre no log.
- [ ] Pool do Prisma dimensionado para o cluster PM2.

**Critérios de aceite**
- [ ] *Rate limit* usa o IP real do cliente, não o do proxy.
- [ ] Origem não permitida é bloqueada por CORS em produção.
- [ ] `SIGTERM` não interrompe requisição em andamento.
- [ ] Resposta de erro em produção não contém `stack`, nome de tabela nem caminho de arquivo.
- [ ] Logs de produção sem senha, token ou dado pessoal.
- [ ] Pool de conexões não esgota com N instâncias PM2 (teste de carga).

---

#### #65 · docs(infra): documentação operacional e runbook

`M5` · **2 pts** · `docs` `chore` `p1-alta` · Depende de: #63, #61 · —

**Descrição.** O que fazer quando algo dá errado às 3h da manhã. Conhecimento operacional que não está escrito é conhecimento que não existe.

**Checklist técnico**
- [ ] Runbook em [08-CICD.md](08-CICD.md): deploy manual, rollback manual, restauração, rotação de segredos.
- [ ] Procedimento de diagnóstico: onde ficam os logs, estado dos containers, teste de saúde.
- [ ] Cenários: API não sobe, banco inacessível, disco cheio, certificado expirado, deploy travado.
- [ ] Checklist de primeiro deploy (DNS, certificado, secrets, migrations).
- [ ] Inventário de GitHub Secrets com finalidade de cada um.
- [ ] `README.md` raiz com o mapa de ambientes e URLs.
- [ ] Registrar a versão `1.0.0` no `CHANGELOG.md`.

**Critérios de aceite**
- [ ] Um desenvolvedor sem contexto executa um rollback manual seguindo apenas o runbook.
- [ ] Todos os secrets inventariados com finalidade.
- [ ] Os cinco cenários de falha têm procedimento escrito.
- [ ] `CHANGELOG.md` documenta a v1.0.0 completa.

---

# Milestone 6 — Contas Compartilhadas

> 13 issues · 71 pontos · depende de M5
> RF-37, RF-44, RF-53 a RF-60 · RN-28 a RN-39
> **Maior superfície de segurança do projeto.**

---

#### #66 · feat(banco): migration de contas compartilhadas e escopo dual

`M6` · **5 pts** · `banco` `feat` `compartilhadas` `p0-critica` · Depende de: #33 · RN-28, RN-36

**Descrição.** Grupos, membros e convites, mais a ativação das colunas de escopo dual nas entidades existentes e a recriação dos `CHECK` na forma completa.

**Checklist técnico**
- [ ] Modelos `ContaCompartilhada`, `MembroCompartilhado`, `Convite` de [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo).
- [ ] Enums `PapelMembro`, `SituacaoMembro`, `SituacaoConvite`.
- [ ] Ativar FK de `contaCompartilhadaId` em `contas`, `categorias`, `movimentacoes`, `etiquetas`.
- [ ] **Recriar** os `CHECK` de escopo na forma completa de §6 (substituindo os parciais de M3).
- [ ] Índice único parcial `uq_grupo_um_administrador` (RN-28).
- [ ] Índice único parcial `uq_convite_pendente` (RN-36).
- [ ] Recriar os índices únicos de nome por escopo, cobrindo a variante de grupo.
- [ ] Migration `adiciona_contas_compartilhadas`.

**Critérios de aceite**
- [ ] Migration aplica em banco com dados existentes, sem perda.
- [ ] Inserir segundo `ADMINISTRADOR` ativo no mesmo grupo falha no banco.
- [ ] Segundo convite `PENDENTE` para o mesmo e-mail e grupo falha.
- [ ] `CHECK` de escopo aceita movimentação de grupo e continua rejeitando duplo escopo.
- [ ] Movimentações pessoais existentes permanecem íntegras após a migration.

---

#### #67 · feat(compartilhadas): CRUD de grupos e resolução de permissões

`M6` · **8 pts** · `backend` `feat` `compartilhadas` `p0-critica` · Depende de: #66 · RF-53, RF-58, RN-28, RN-30

**Descrição.** Criação de grupo com o criador como administrador, e o objeto `minhasPermissoes` que resolve a matriz RN-30 no servidor — o frontend consome a decisão, não a reimplementa.

**Checklist técnico**
- [ ] `POST /contas-compartilhadas` criando grupo e membro administrador em transação.
- [ ] `criarCategoriasPadrao` copiando as categorias do sistema para o escopo do grupo.
- [ ] `GET /contas-compartilhadas` com `meuPapel`, saldo total e resumo do mês.
- [ ] `GET /contas-compartilhadas/:id` com membros, contas e `minhasPermissoes`.
- [ ] `resolverPermissoes(papel, configuracaoGrupo)` implementando RN-30 e RN-31 em **um** lugar.
- [ ] `PATCH` e `DELETE` restritos ao administrador; `DELETE` exige confirmação pelo nome (RN-33).
- [ ] `POST /contas-compartilhadas/:id/imagem` com upload.
- [ ] Não membro recebe `404`, não `403`.

**Critérios de aceite**
- [ ] Criador vira `ADMINISTRADOR` automaticamente.
- [ ] `minhasPermissoes` correto para os três papéis.
- [ ] `permiteParticipanteEditarProprias: false` reflete em `minhasPermissoes` do participante.
- [ ] Não membro recebe `404` em todas as rotas do grupo.
- [ ] `DELETE` com nome errado responde `400`; com nome correto, `204` preservando o histórico.
- [ ] `resolverPermissoes` tem teste para cada combinação papel × ação da matriz.

---

#### #68 · feat(compartilhadas): middleware de autorização por papel

`M6` · **8 pts** · `backend` `feat` `compartilhadas` `p0-critica` · Depende de: #67 · RN-30, RN-31, RN-51

**Descrição.** O ponto único de decisão de autorização em grupos. Precisa de teste negativo para cada combinação — testar que o administrador consegue não prova que o observador não consegue.

**Checklist técnico**
- [ ] `middlewares/autorizar-compartilhada.middleware.ts` conforme [02-ARCHITECTURE.md §8.3](02-ARCHITECTURE.md#83-autorização).
- [ ] Resolver o vínculo, exigir `situacao: ATIVO`, validar o papel, popular `req.membro`.
- [ ] Não membro ou membro inativo → `404 NAO_ENCONTRADO`.
- [ ] Papel insuficiente → `403 PAPEL_INSUFICIENTE`.
- [ ] `autorizarEdicaoMovimentacao` cobrindo: administrador edita qualquer uma; participante edita as próprias se `permiteParticipanteEditarProprias`; observador nunca (RN-31).
- [ ] Aplicar em todas as rotas de escopo de grupo.
- [ ] Matriz de teste completa: 3 papéis × 13 ações de RN-30.

**Critérios de aceite**
- [ ] Toda combinação papel × ação da matriz RN-30 tem teste, positivo e negativo.
- [ ] Observador recebe `403` em toda escrita.
- [ ] Participante recebe `403` ao editar lançamento de terceiro.
- [ ] Com `permiteParticipanteEditarProprias: false`, participante recebe `403` até nos próprios.
- [ ] Membro `REMOVIDO` recebe `404` (perde o acesso imediatamente).
- [ ] Nenhuma rota de grupo sem o middleware (verificado na revisão das rotas).

---

#### #69 · feat(compartilhadas): gestão de membros e transferência de administração

`M6` · **5 pts** · `backend` `feat` `compartilhadas` `p0-critica` · Depende de: #68 · RF-56, RF-57, RN-28, RN-29, RN-34

**Descrição.** Alterar papéis, remover membros, sair do grupo e transferir a administração atomicamente. A invariante de exatamente um administrador não pode ser violada em nenhum instante.

**Checklist técnico**
- [ ] `GET /contas-compartilhadas/:id/membros`.
- [ ] `PATCH .../membros/:membroId` alterando papel; proibir alterar o próprio e proibir definir `ADMINISTRADOR` por aqui.
- [ ] `DELETE .../membros/:membroId` marcando `REMOVIDO`; movimentações permanecem (RN-34).
- [ ] `POST .../transferir-administracao` trocando os dois papéis na mesma transação (RN-28).
- [ ] `POST .../sair` marcando `SAIU`; administrador recebe `422 ADMINISTRADOR_UNICO` (RN-29).
- [ ] Notificar o novo administrador e o membro removido.
- [ ] Log de auditoria em todas essas ações.

**Critérios de aceite**
- [ ] Transferência de administração jamais deixa dois ou zero administradores.
- [ ] Administrador não sai nem é removido sem transferir antes.
- [ ] Alterar o próprio papel responde `422`.
- [ ] Definir `ADMINISTRADOR` via `PATCH` responde `422` indicando a rota correta.
- [ ] Movimentações de membro removido continuam no grupo, com autor preservado.
- [ ] Membro removido perde acesso imediatamente.

---

#### #70 · feat(convites): ciclo completo de convites

`M6` · **5 pts** · `backend` `feat` `convites` `p1-alta` · Depende de: #69 · RF-54, RF-55, RN-35 a RN-39

**Descrição.** Enviar, aceitar, recusar, cancelar e expirar convites, incluindo convite para e-mail ainda não cadastrado.

**Checklist técnico**
- [ ] `POST .../convites` gerando token, validade de 7 dias e e-mail; retorna `usuarioJaCadastrado`.
- [ ] Bloquear convite duplicado (`409 CONVITE_DUPLICADO`) e para quem já é membro (`409 JA_E_MEMBRO`).
- [ ] `GET .../convites` (administrador) e `GET /convites/recebidos`.
- [ ] `POST /convites/:id/aceitar` criando o membro com o papel do convite, em transação (RN-39).
- [ ] Validar que o e-mail autenticado coincide com o do convite (`403` se não).
- [ ] `POST /convites/:id/recusar` e `DELETE /convites/:id`.
- [ ] Rejeitar aceite de convite expirado (`422 CONVITE_EXPIRADO`).
- [ ] Tarefa `limpar-tokens` marcando convites vencidos como `EXPIRADO`.
- [ ] Notificações de convite recebido e aceito.
- [ ] *Rate limit* de 20 convites/hora.

**Critérios de aceite**
- [ ] Convite duplicado pendente responde `409`.
- [ ] Convite para membro atual responde `409`.
- [ ] Aceitar com e-mail diferente do convidado responde `403`.
- [ ] Convite expirado não pode ser aceito.
- [ ] Convite para e-mail sem cadastro fica pendente e é encontrado após o cadastro (RN-37).
- [ ] Convite já respondido não pode ser respondido de novo.
- [ ] Aceitar cria o membro com o papel exato do convite.

---

#### #71 · feat(convites): pré-visualização pública com dados mascarados

`M6` · **5 pts** · `backend` `feat` `convites` `p2-media` · Depende de: #70 · RF-55

**Descrição.** Rota pública para exibir o convite a quem ainda não tem conta. Por ser pública e o token poder circular, expõe o mínimo possível.

**Checklist técnico**
- [ ] `GET /convites/token/:token` sem autenticação.
- [ ] Retornar apenas: nome do grupo, quem convidou, papel, validade, situação, `requerCadastro`.
- [ ] **Nunca** retornar saldo, movimentação, lista de membros ou e-mails completos.
- [ ] Mascarar o e-mail do convidado (`an***@exemplo.com`).
- [ ] *Rate limit* estrito por IP (sem ele, o token é atacável por força bruta).
- [ ] Token inválido responde `404` genérico, sem distinguir inexistente de expirado.
- [ ] Template de e-mail de convite com o link.

**Critérios de aceite**
- [ ] Resposta não contém nenhum dado financeiro (teste inspeciona o JSON inteiro).
- [ ] E-mail mascarado.
- [ ] Token inexistente e token expirado produzem respostas indistinguíveis.
- [ ] *Rate limit* ativo por IP.
- [ ] `requerCadastro: true` quando o e-mail não tem conta.

---

#### #72 · feat(compartilhadas): movimentações, contas e categorias no escopo de grupo

`M6` · **5 pts** · `backend` `feat` `compartilhadas` `p0-critica` · Depende de: #68 · RF-58, RF-59, RN-09, RN-11, RN-32

**Descrição.** Estender as entidades de M2/M3 ao escopo de grupo. O autor de cada lançamento é sempre visível.

**Checklist técnico**
- [ ] Aceitar `contaCompartilhadaId` em criação de conta, categoria, etiqueta e movimentação.
- [ ] Validar membresia ativa e papel em cada caso.
- [ ] Categoria de movimentação de grupo deve ser do mesmo grupo ou global (RN-11).
- [ ] Listagens filtram por `contaCompartilhadaId` quando informado; escopo pessoal quando ausente.
- [ ] `autor` sempre presente na movimentação de grupo (RF-59).
- [ ] Rejeitar movimentação em moeda divergente da moeda do grupo (RN-32).
- [ ] Saldo do grupo somando suas contas.
- [ ] Criação de conta de grupo restrita ao administrador.

**Critérios de aceite**
- [ ] Participante cria movimentação no grupo; observador recebe `403`.
- [ ] Categoria de outro grupo responde `422`.
- [ ] Categoria pessoal em movimentação de grupo responde `422`.
- [ ] Movimentações pessoais e de grupo nunca se misturam nas listagens.
- [ ] `autor` presente com nome e foto.
- [ ] Saldo do grupo confere com a soma das suas contas.

---

#### #73 · feat(transferencias): transferência entre conta pessoal e de grupo

`M6` · **5 pts** · `backend` `feat` `transferencias` `p2-media` · Depende de: #72 · RF-37, RN-27, RN-32

**Descrição.** Estender a transferência para atravessar a fronteira pessoal/grupo, exigindo membresia nas duas pontas.

**Checklist técnico**
- [ ] Aceitar contas de escopos diferentes em `POST /transferencias`.
- [ ] Validar membresia ativa quando alguma ponta é de grupo (RN-27).
- [ ] Validar papel ≥ `PARTICIPANTE` na ponta de grupo.
- [ ] Rejeitar transferência entre moedas diferentes (RN-32).
- [ ] Descrição automática identificando o grupo ("Carteira → Casa/Caixa").
- [ ] Log de auditoria no grupo envolvido.
- [ ] Atualizar `GET /transferencias/:id` para exibir o escopo de cada lado.

**Critérios de aceite**
- [ ] Transferência pessoal → grupo e grupo → pessoal funcionam, atômicas.
- [ ] Não membro do grupo de destino responde `404`.
- [ ] Observador na ponta de grupo responde `403`.
- [ ] Moedas diferentes respondem `422`.
- [ ] Saldos das duas pontas corretos após a operação.
- [ ] Auditoria registra a transferência no grupo.

---

#### #74 · feat(frontend): lista e criação de grupos

`M6` · **5 pts** · `frontend` `feat` `compartilhadas` `p1-alta` · Depende de: #67, #53 · RF-53, RF-44

**Descrição.** Entrada para o diferencial do produto: lista de grupos com resumo e formulário de criação.

**Checklist técnico**
- [ ] `funcionalidades/compartilhadas/` com hooks, serviço, schemas e componentes.
- [ ] `CartaoGrupo` com imagem, nome, papel, saldo, contagem de membros e resumo do mês.
- [ ] `FormularioGrupo` com nome, descrição, cor, moeda, imagem e configuração de permissão.
- [ ] Upload de imagem com recorte e pré-visualização.
- [ ] Seção de convites pendentes recebidos, com ações aceitar/recusar.
- [ ] Badge de contagem de convites pendentes na navegação.
- [ ] Estado vazio explicando o valor de contas compartilhadas (é o recurso menos autoexplicativo do produto).
- [ ] Seção `contasCompartilhadas` do dashboard.

**Critérios de aceite**
- [ ] Criar grupo redireciona para o detalhe recém-criado.
- [ ] Papel do usuário visível em cada cartão.
- [ ] Convite pendente aparece com destaque; aceitar adiciona o grupo à lista.
- [ ] Estado vazio explica o recurso, não apenas informa a ausência.
- [ ] Grade responsiva sem *scroll* horizontal em 320 px.

---

#### #75 · feat(frontend): detalhe do grupo com abas

`M6` · **5 pts** · `frontend` `feat` `compartilhadas` `p1-alta` · Depende de: #74, #72 · RF-58, RF-59, RF-60

**Descrição.** Tela de trabalho do grupo, com controles condicionados a `minhasPermissoes` — sem reimplementar a matriz no cliente.

**Checklist técnico**
- [ ] Abas: Movimentações · Contas · Membros · Categorias · Configurações.
- [ ] Cabeçalho com imagem, nome, saldo e papel.
- [ ] Aba Movimentações reaproveitando os componentes de M3, com escopo de grupo e coluna de autor (avatar + nome).
- [ ] Aba Contas com os cartões de saldo do grupo.
- [ ] Aba Membros com papel, data de entrada e ações de administrador.
- [ ] Aba Configurações visível apenas ao administrador.
- [ ] Todo controle de escrita condicionado a `minhasPermissoes`.
- [ ] Observador vê a interface em modo leitura, sem botões de ação.
- [ ] Aba de auditoria como *placeholder* até M11.

**Critérios de aceite**
- [ ] Observador não vê nenhum botão de criação ou edição.
- [ ] Participante vê ações apenas nos próprios lançamentos.
- [ ] Aba Configurações oculta para não administrador.
- [ ] Autor visível em cada movimentação.
- [ ] Abas persistidas na URL.
- [ ] Nenhuma decisão de permissão calculada no cliente — só leitura de `minhasPermissoes`.

---

#### #76 · feat(frontend): gestão de membros e convites

`M6` · **5 pts** · `frontend` `feat` `compartilhadas` `p1-alta` · Depende de: #75, #70 · RF-54 a RF-57

**Descrição.** Fluxos de convite e administração de membros, com confirmações proporcionais ao risco de cada ação.

**Checklist técnico**
- [ ] `DialogoConvite` com e-mail, papel, mensagem opcional e explicação de cada papel.
- [ ] Lista de convites pendentes enviados, com cancelamento e indicador de validade.
- [ ] `DialogoAlterarPapel` explicando o efeito da mudança.
- [ ] `DialogoRemoverMembro` avisando que as movimentações permanecem (RN-34).
- [ ] `DialogoTransferirAdministracao` com seleção de membro e confirmação por digitação.
- [ ] Ação "sair do grupo" com aviso específico para o administrador.
- [ ] Tratar `409 CONVITE_DUPLICADO`, `409 JA_E_MEMBRO` e `422 ADMINISTRADOR_UNICO` com mensagens que indiquem a saída.
- [ ] Página pública de convite consumindo a pré-visualização mascarada.

**Critérios de aceite**
- [ ] Convidar exibe confirmação e o convite aparece na lista de pendentes.
- [ ] `409` de duplicidade mostra mensagem específica, não erro genérico.
- [ ] Transferir administração exige confirmação explícita e atualiza os papéis na interface.
- [ ] Administrador tentando sair vê o aviso e o caminho (transferir primeiro).
- [ ] Página pública de convite funciona sem autenticação e sem expor dado financeiro.
- [ ] Todos os diálogos fecham por `Esc` e devolvem o foco à origem.

---

#### #77 · test(compartilhadas): matriz completa de autorização

`M6` · **5 pts** · `backend` `test` `p0-critica` · Depende de: #73, #71 · RN-28 a RN-39

**Descrição.** A issue que impede um vazamento entre grupos. Cada combinação de papel e ação precisa de teste positivo **e** negativo.

**Checklist técnico**
- [ ] Fábricas `fabricarGrupoComMembros(papeis)` e `fabricarConvite`.
- [ ] Teste tabular cobrindo 3 papéis × 13 ações de RN-30.
- [ ] Testes de isolamento: usuário do grupo A não acessa nada do grupo B.
- [ ] Teste de invariante de administrador único, incluindo tentativa concorrente de transferência.
- [ ] Testes de ciclo completo de convite, com todas as transições de situação.
- [ ] Teste de membro removido perdendo acesso imediatamente.
- [ ] Teste verificando que a pré-visualização pública não contém dado financeiro.
- [ ] Teste de movimentação de ex-membro permanecendo no grupo.

**Critérios de aceite**
- [ ] Cobertura ≥ 90% em `conta-compartilhada.servico.ts`, `membro.servico.ts` e `convite.servico.ts`.
- [ ] Todas as 39 combinações da matriz testadas.
- [ ] Nenhum vazamento entre grupos em nenhuma rota.
- [ ] Invariante de administrador único mantida sob concorrência.
- [ ] Todas as transições de convite cobertas.

---

#### #78 · test(compartilhadas): E2E do fluxo de grupo

`M6` · **5 pts** · `frontend` `test` `p1-alta` · Depende de: #76, #77 · RF-53 a RF-60

**Descrição.** Fluxo E2E com dois usuários reais, validando o cenário que define o produto.

**Checklist técnico**
- [ ] Cenário Playwright com dois contextos de navegador (dois usuários simultâneos).
- [ ] Usuário A cria grupo, cria conta de grupo, convida B.
- [ ] Usuário B recebe o e-mail (via API do Mailpit), acessa o link e aceita.
- [ ] B lança despesa; A vê o lançamento com o autor correto.
- [ ] B tenta editar lançamento de A e não encontra o controle.
- [ ] A promove B e transfere a administração.
- [ ] A tenta sair antes de transferir e recebe o aviso.
- [ ] Verificar saldo do grupo após cada operação.

**Critérios de aceite**
- [ ] Cenário completo passa de ponta a ponta.
- [ ] Interface de B não oferece edição de lançamento de A.
- [ ] Saldo do grupo correto em cada etapa.
- [ ] Teste executa em < 90 s e é estável em três execuções consecutivas.

---

# Milestone 7 — Metas Financeiras

> 7 issues · 29 pontos · depende de M5 (paralela a M6)
> RF-45, RF-61 a RF-64 · RN-46, RN-47

---

#### #79 · feat(banco): migration de metas e movimentações de meta

`M7` · **3 pts** · `banco` `feat` `metas` `p1-alta` · Depende de: #33 · RF-61

**Descrição.** Modelos `Meta` e `MovimentacaoMeta`, com escopo dual e vínculo opcional a movimentação.

**Checklist técnico**
- [ ] Modelos conforme [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo).
- [ ] Enums `SituacaoMeta` e `TipoMovimentacaoMeta`.
- [ ] `valorAlvo` e `valorAcumulado` como `Decimal(14,2)`.
- [ ] `movimentacaoId` único em `MovimentacaoMeta` (1:1 opcional).
- [ ] `CHECK` de escopo XOR e `valor_alvo > 0`.
- [ ] Índices `(usuario_id, situacao)` e `(conta_compartilhada_id, situacao)`.
- [ ] Migration `adiciona_metas`.

**Critérios de aceite**
- [ ] `valor_alvo = 0` é rejeitado pelo banco.
- [ ] Escopo duplo é rejeitado.
- [ ] Duas movimentações de meta não podem apontar para a mesma movimentação.
- [ ] Excluir a meta remove os aportes em cascata; excluir a movimentação apenas desvincula (`SetNull`).

---

#### #80 · feat(metas): CRUD de metas com progresso calculado

`M7` · **5 pts** · `backend` `feat` `metas` `p1-alta` · Depende de: #79 · RF-61, RF-63, RN-46

**Descrição.** CRUD com os campos derivados de progresso, incluindo o aporte mensal necessário para cumprir o prazo.

**Checklist técnico**
- [ ] `GET /metas` com filtro por situação (padrão `ATIVA`) e escopo.
- [ ] Campos derivados: `valorRestante`, `percentualProgresso` (limitado a 100 na exibição), `diasRestantes`, `aporteMensalNecessario`.
- [ ] `aporteMensalNecessario = valorRestante / meses restantes`, arredondado para cima; `null` sem prazo.
- [ ] `POST`, `GET /:id`, `PATCH`, `DELETE` (exclusão lógica).
- [ ] Validar `prazoEm` no futuro na criação.
- [ ] Escopo de grupo exigindo membresia ativa.
- [ ] Impedir reduzir `valorAlvo` abaixo do `valorAcumulado` (`422`).

**Critérios de aceite**
- [ ] Progresso correto em 0%, 50%, 100% e acima de 100% (exibido como 100).
- [ ] `aporteMensalNecessario` é `null` sem prazo.
- [ ] Prazo no passado responde `400` na criação.
- [ ] Reduzir alvo abaixo do acumulado responde `422`.
- [ ] Meta de outro usuário responde `404`.
- [ ] Divisão por zero (prazo neste mês) não produz `Infinity`.

---

#### #81 · feat(metas): aportes e resgates

`M7` · **5 pts** · `backend` `feat` `metas` `p0-critica` · Depende de: #80 · RF-62, RF-64, RN-46, RN-47

**Descrição.** Registro de aportes e resgates, com ou sem movimentação vinculada, e conclusão automática ao atingir o alvo.

**Checklist técnico**
- [ ] `POST /metas/:id/aportes` com `tipo`, `valor`, `data`, `contaId` e `gerarMovimentacao`.
- [ ] Com `gerarMovimentacao: true`: cria a movimentação na conta e vincula, em transação (RN-47).
- [ ] Com `false`: registra apenas o progresso.
- [ ] Recalcular `valorAcumulado` na mesma transação.
- [ ] `RESGATE` que deixaria o acumulado negativo responde `422`.
- [ ] Atingir o alvo → `CONCLUIDA` + `concluidaEm` + notificação (RF-64).
- [ ] Resgate abaixo do alvo em meta concluída volta para `ATIVA`.
- [ ] `DELETE /metas/:id/aportes/:aporteId` recalculando e removendo a movimentação vinculada, em transação.
- [ ] Retornar a meta atualizada junto do aporte.

**Critérios de aceite**
- [ ] Aporte com movimentação reduz o saldo da conta exatamente pelo valor.
- [ ] Aporte sem movimentação não altera saldo algum.
- [ ] Atingir o alvo marca `CONCLUIDA` e cria a notificação.
- [ ] Resgate que zeraria abaixo de zero responde `422`.
- [ ] Excluir aporte recalcula o acumulado e remove a movimentação, atomicamente.
- [ ] Sequência de 10 aportes e 3 resgates resulta no acumulado correto.
- [ ] Resgate em meta concluída a reabre.

---

#### #82 · feat(frontend): página de metas

`M7` · **3 pts** · `frontend` `feat` `metas` `p2-media` · Depende de: #80, #53 · RF-61, RF-63

**Descrição.** Visualização de progresso — o principal valor percebido do recurso é ver a barra avançar.

**Checklist técnico**
- [ ] `CartaoMeta` com ícone, nome, barra de progresso, valores e prazo.
- [ ] Barra com cor por faixa e **rótulo textual** do percentual (não só cor).
- [ ] Indicador de prazo: dias restantes, aporte mensal necessário, alerta se atrasada.
- [ ] Abas Ativas / Concluídas / Todas.
- [ ] `FormularioMeta` com seletor de ícone e cor.
- [ ] Selo visual de meta concluída.
- [ ] Estado vazio com sugestões de metas comuns.
- [ ] Seção de metas no dashboard.

**Critérios de aceite**
- [ ] Progresso exibido com percentual textual além da barra.
- [ ] Meta concluída visualmente distinta.
- [ ] Meta com prazo vencido e alvo não atingido é sinalizada.
- [ ] Grade responsiva sem *scroll* horizontal em 320 px.
- [ ] `aporteMensalNecessario` ausente não exibe campo vazio.

---

#### #83 · feat(frontend): formulário de aporte e histórico

`M7` · **5 pts** · `frontend` `feat` `metas` `p2-media` · Depende de: #82, #81 · RF-62

**Descrição.** Registrar aporte ou resgate com pré-visualização do progresso resultante e histórico da meta.

**Checklist técnico**
- [ ] `DialogoAporte` com tipo, valor, data, conta e alternância de `gerarMovimentacao`.
- [ ] Explicar a diferença entre com e sem movimentação (é a decisão menos óbvia do formulário).
- [ ] Pré-visualização do progresso após o aporte.
- [ ] `HistoricoMeta` listando aportes e resgates, com exclusão.
- [ ] Celebração visual ao concluir a meta, respeitando `prefers-reduced-motion`.
- [ ] Invalidar `metas`, `contas`, `movimentacoes` e `dashboard` após mutação.
- [ ] Tratar `422` de resgate excessivo com mensagem clara.

**Critérios de aceite**
- [ ] Pré-visualização confere com o progresso real após submeter.
- [ ] Aporte com movimentação atualiza o saldo da conta na interface imediatamente.
- [ ] Excluir aporte reverte o progresso e o saldo.
- [ ] Conclusão exibe celebração; com `prefers-reduced-motion`, sem animação.
- [ ] Resgate excessivo mostra mensagem específica.

---

#### #84 · feat(metas): notificações de meta

`M7` · **5 pts** · `backend` `feat` `metas` `p3-baixa` · Depende de: #81 · RF-64

**Descrição.** Notificações de conclusão e de prazo próximo. Como M9 ainda não existe, esta issue cria a estrutura mínima de notificação, que M9 estende.

**Checklist técnico**
- [ ] Migration mínima de `Notificacao` (antecipada de M9, com o enum completo `TipoNotificacao`).
- [ ] `NotificacaoServico.criar` genérico e reutilizável.
- [ ] Notificação `META_CONCLUIDA` ao atingir o alvo.
- [ ] Tarefa diária de `META_PRAZO_PROXIMO` (30 dias antes, se progresso < 80%).
- [ ] Idempotência: uma notificação de prazo por meta por ciclo.
- [ ] `GET /notificacoes` e `PATCH /notificacoes/:id/ler` mínimos.
- [ ] Respeitar `notificacoesApp` do perfil.

**Critérios de aceite**
- [ ] Concluir meta gera exatamente uma notificação.
- [ ] Tarefa de prazo não duplica notificação em reexecução.
- [ ] Notificação desativada no perfil não é criada.
- [ ] `urlAcao` navega para a meta correspondente.

---

#### #85 · test(metas): suíte de metas

`M7` · **3 pts** · `backend` `test` `p1-alta` · Depende de: #84 · RN-46, RN-47

**Descrição.** Cobertura das regras de progresso e da atomicidade dos aportes.

**Checklist técnico**
- [ ] Fábricas `fabricarMeta` e `fabricarAporte`.
- [ ] Integração de todas as rotas de metas e aportes.
- [ ] Teste de invariante: `valorAcumulado = Σ aportes − Σ resgates` após 15 operações mistas.
- [ ] Teste de atomicidade: falha ao criar a movimentação não persiste o aporte.
- [ ] Testes de transição de situação (ativa → concluída → ativa).
- [ ] Testes de autorização em escopo pessoal e de grupo.
- [ ] Casos-limite: valor de 1 centavo, alvo atingido exatamente, prazo hoje.

**Critérios de aceite**
- [ ] Cobertura ≥ 85% em `meta.servico.ts`.
- [ ] Invariante do acumulado mantida após 15 operações.
- [ ] Falha simulada na movimentação não deixa aporte órfão.
- [ ] Casos-limite passam.

---

# Milestone 8 — Cartões, Faturas e Parcelamentos

> 12 issues · 63 pontos · depende de M5 (paralela a M6/M7)
> RF-28, RF-48 a RF-52 · RN-21, RN-40 a RN-45
> **Aritmética de datas e arredondamento: escreva os testes antes da implementação.**

---

#### #86 · feat(banco): migration de cartões e faturas

`M8` · **5 pts** · `banco` `feat` `cartoes` `p0-critica` · Depende de: #33 · RF-48

**Descrição.** Modelos `Cartao` e `Fatura`, com a chave natural do ciclo e o vínculo 1:1 com a movimentação de pagamento.

**Checklist técnico**
- [ ] Modelos conforme [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo).
- [ ] Enums `BandeiraCartao` e `SituacaoFatura`.
- [ ] `@@unique([cartaoId, ano, mes])` como chave natural do ciclo.
- [ ] `movimentacaoPagamentoId` único (1:1, RN-45).
- [ ] Relação `ItensFatura` entre `Fatura` e `Movimentacao`.
- [ ] `CHECK` de dias entre 1 e 31 e de limite não negativo (RN-41).
- [ ] Armazenar no máximo os quatro últimos dígitos — **nunca** o número completo.
- [ ] Migration `adiciona_cartoes_faturas_parcelamentos` (inclui `CompraParcelada`, modelada em #32).

**Critérios de aceite**
- [ ] Duas faturas do mesmo cartão para o mesmo ano/mês violam a unicidade.
- [ ] `dia_fechamento = 0` ou `32` é rejeitado pelo banco.
- [ ] Nenhuma coluna capaz de armazenar número completo de cartão.
- [ ] Excluir cartão remove faturas em cascata; movimentações usam `Restrict`.

---

#### #87 · feat(cartoes): utilitário de ciclo de fatura

`M8` · **8 pts** · `backend` `feat` `cartoes` `p0-critica` · Depende de: #86 · RN-40, RN-41

**Descrição.** A função mais sujeita a erro de toda a Milestone: dada uma data de compra e o dia de fechamento, determinar a fatura. Exige 100% de cobertura e testes escritos antes da implementação.

**Checklist técnico**
- [ ] `utilitarios/data.ts`: `determinarCicloFatura(dataCompra, diaFechamento)` retornando `{ ano, mes }`.
- [ ] Compra **no dia** do fechamento entra no ciclo seguinte (RN-40).
- [ ] `ajustarDiaParaMes(dia, ano, mes)` usando o último dia quando o dia excede o mês (RN-41).
- [ ] `calcularDatasFatura(ano, mes, diaFechamento, diaVencimento)`.
- [ ] Tratar vencimento no mês seguinte ao fechamento.
- [ ] Tabela de casos cobrindo: dia 1, 15, 28 e 31; fevereiro comum e bissexto; meses de 30 e 31 dias; viradas de ano.
- [ ] Nenhuma dependência de timezone (aritmética de data pura).

**Critérios de aceite**
- [ ] Cobertura **100%** em `data.ts`.
- [ ] Compra em 28/07 com fechamento dia 28 vai para a fatura de agosto (RN-40).
- [ ] Compra em 27/07 com fechamento dia 28 vai para a fatura de julho.
- [ ] Fechamento dia 31 em fevereiro usa 28 (ou 29 em bissexto).
- [ ] Fechamento dia 31 em abril usa 30.
- [ ] Compra em 29/12 com fechamento dia 28 vai para janeiro do ano seguinte.
- [ ] Fechamento dia 28 e vencimento dia 8 produz vencimento no mês seguinte.
- [ ] Resultado idêntico em qualquer timezone do servidor.

---

#### #88 · feat(cartoes): CRUD de cartões e cálculo de limite

`M8` · **8 pts** · `backend` `feat` `cartoes` `p1-alta` · Depende de: #87 · RF-48, RF-50, RN-42, RN-43

**Descrição.** CRUD com limite utilizado e disponível. Exceder o limite gera aviso, não bloqueio — o sistema registra a realidade, não a impõe.

**Checklist técnico**
- [ ] `GET /cartoes` com `limiteUtilizado`, `limiteDisponivel`, `percentualUtilizado` e `faturaAtual`.
- [ ] Consulta de [03-DATABASE.md §8.6](03-DATABASE.md#86-limite-disponível-do-cartão-rn-42), considerando apenas faturas abertas, fechadas e parcialmente pagas.
- [ ] `POST`, `GET /:id`, `PATCH`, `DELETE` (lógico).
- [ ] Validar dias entre 1 e 31 e `contaPagamentoPadraoId` pertencente ao usuário.
- [ ] `diasParaFechamento` na fatura atual.
- [ ] `DELETE` bloqueado com fatura em aberto com saldo (`409`), oferecendo desativação.
- [ ] Alterar `diaFechamento` **não** realoca faturas existentes — documentar na resposta.

**Critérios de aceite**
- [ ] Limite disponível confere com o total menos as parcelas em faturas não pagas.
- [ ] Fatura paga não consome limite.
- [ ] Cartão de outro usuário responde `404`.
- [ ] `diaFechamento = 32` responde `400`.
- [ ] Conta de pagamento de terceiro responde `404`.
- [ ] Excluir cartão com fatura em aberto responde `409` com alternativa.

---

#### #89 · feat(faturas): geração automática e alocação de despesas

`M8` · **5 pts** · `backend` `feat` `faturas` `p0-critica` · Depende de: #88 · RF-49, RN-40, RN-44

**Descrição.** Ao lançar despesa de cartão, encontrar ou criar a fatura do ciclo e alocar. O cliente nunca escolhe a fatura — é decisão do servidor.

**Checklist técnico**
- [ ] `FaturaServico.obterOuCriarPorCiclo(cartaoId, ano, mes)` idempotente.
- [ ] Integrar ao fluxo de criação de movimentação com `cartaoId` (#34).
- [ ] Recalcular `valorTotal` da fatura a cada alocação, dentro da transação.
- [ ] Recalcular ao editar ou excluir movimentação de cartão.
- [ ] `faturaId` ignorado se enviado pelo cliente (sempre resolvido no servidor).
- [ ] `GET /cartoes/:id/faturas` com filtros e paginação.
- [ ] `GET /faturas/:id` com itens e `resumoPorCategoria`.
- [ ] Aviso (não erro) quando a despesa excede o limite disponível (RN-43).

**Critérios de aceite**
- [ ] Despesa de cartão é alocada na fatura correta conforme o ciclo.
- [ ] Fatura criada automaticamente no primeiro lançamento do ciclo.
- [ ] Dois lançamentos no mesmo ciclo usam a mesma fatura.
- [ ] `valorTotal` sempre igual à soma dos itens (teste de invariante).
- [ ] Excluir movimentação reduz o `valorTotal` da fatura.
- [ ] `faturaId` enviado pelo cliente é ignorado.
- [ ] Despesa acima do limite é aceita, com aviso em `meta`.

---

#### #90 · feat(movimentacoes): compras parceladas com rateio exato

`M8` · **5 pts** · `backend` `feat` `movimentacoes` `p0-critica` · Depende de: #89, #23 · RF-28, RN-21, RN-22

**Descrição.** Parcelamento com a invariante mais verificável do sistema: a soma das parcelas é **exatamente** igual ao valor total.

**Checklist técnico**
- [ ] `POST /movimentacoes/parceladas` criando `CompraParcelada` e N movimentações em transação.
- [ ] Rateio via `ratearParcelas` de #23, com resto na última parcela (RN-21).
- [ ] Cada parcela com `numeroParcela`, `totalParcelas` e rótulo `x/N`.
- [ ] Parcelas de cartão alocadas nas faturas dos ciclos consecutivos.
- [ ] Parcelas de conta (carnê/boleto) com vencimentos mensais.
- [ ] Aceitar `cartaoId` **ou** `contaId`, nunca ambos.
- [ ] `totalParcelas` entre 2 e 72.
- [ ] Excluir a compra remove todas as parcelas (`Cascade`) e recalcula as faturas afetadas.
- [ ] Editar uma parcela isolada é permitido; editar a compra recria as parcelas não pagas.

**Critérios de aceite**
- [ ] `Σ parcelas = valorTotal` exatamente para `1000/3`, `100/7`, `0.05/2`, `10/4`, `5800/10`.
- [ ] Última parcela absorve a diferença de arredondamento.
- [ ] Parcelas de cartão caem em faturas de ciclos consecutivos.
- [ ] Compra em 10× com fechamento dia 28 aloca corretamente as 10 faturas.
- [ ] `totalParcelas = 1` responde `400`; `= 100` responde `400`.
- [ ] Excluir a compra remove todas as parcelas e ajusta os totais das faturas.

---

#### #91 · feat(faturas): pagamento de fatura

`M8` · **5 pts** · `backend` `feat` `faturas` `p0-critica` · Depende de: #90 · RF-51, RN-45

**Descrição.** Pagar a fatura gera **uma** despesa na conta pagadora, sem duplicar as despesas já registradas no cartão — a confusão mais comum em software financeiro doméstico.

**Checklist técnico**
- [ ] `PATCH /faturas/:id/pagar` com `contaId`, `valor` e `dataPagamento`.
- [ ] Criar movimentação de despesa na conta pagadora, vinculada à fatura (RN-45).
- [ ] Categoria própria "Pagamento de fatura", excluída de relatórios por categoria (senão o gasto seria contado duas vezes).
- [ ] Situação da fatura conforme o valor: `PAGA` ou `PAGA_PARCIALMENTE`.
- [ ] Rejeitar pagamento de fatura já `PAGA` e `valor > valorRestante` (`422`).
- [ ] Conta padrão do cartão como sugestão quando `contaId` é omitido.
- [ ] Retornar fatura e movimentação com o saldo atualizado da conta.
- [ ] Toda a operação em transação.

**Critérios de aceite**
- [ ] Pagar fatura de `640.50` reduz o saldo da conta em exatamente `640.50`.
- [ ] As despesas do cartão **não** são contadas de novo em nenhum relatório.
- [ ] Pagamento parcial resulta em `PAGA_PARCIALMENTE` com `valorRestante` correto.
- [ ] Pagar fatura já paga responde `422`.
- [ ] `valor` acima do restante responde `422`.
- [ ] Resposta traz o saldo atualizado da conta pagadora.

---

#### #92 · feat(faturas): fechamento automático e notificações

`M8` · **5 pts** · `backend` `feat` `faturas` `p2-media` · Depende de: #91 · RN-44, RF-69

**Descrição.** Tarefa diária de fechamento e avisos de fatura fechada e a vencer.

**Checklist técnico**
- [ ] `fechar-faturas.tarefa.ts` (00:30): fecha faturas cujo dia de fechamento é hoje.
- [ ] Criar a fatura do ciclo seguinte ao fechar a atual.
- [ ] Notificação `FATURA_FECHADA` com valor e vencimento.
- [ ] Notificação `FATURA_A_VENCER` em D-3 e D-0.
- [ ] Idempotência: fatura já `FECHADA` não é reprocessada.
- [ ] Fatura sem movimentação fecha com valor zero, sem notificar.
- [ ] Log com contagem de faturas fechadas.

**Critérios de aceite**
- [ ] Fatura fecha automaticamente na data correta.
- [ ] Reexecução no mesmo dia não altera nada nem duplica notificação.
- [ ] Fatura do ciclo seguinte é criada ao fechar a anterior.
- [ ] Fatura vazia fecha sem gerar notificação.
- [ ] Notificações de vencimento disparam uma única vez por marco.

---

#### #93 · feat(frontend): página de cartões

`M8` · **5 pts** · `frontend` `feat` `cartoes` `p1-alta` · Depende de: #88, #53 · RF-48, RF-50

**Descrição.** Visão dos cartões com limite e fatura atual em destaque.

**Checklist técnico**
- [ ] `CartaoCredito` com cor da bandeira, nome, últimos dígitos e anel de limite.
- [ ] Anel de progresso com cor por faixa e **percentual textual**.
- [ ] Bloco da fatura atual com valor, vencimento, dias para fechamento e ação de pagar.
- [ ] `FormularioCartao` com seletor de bandeira, limite, dias e conta padrão.
- [ ] Aviso ao alterar `diaFechamento` explicando que faturas existentes não são realocadas.
- [ ] Seção de cartões inativos recolhível.
- [ ] Seção de cartões no dashboard.
- [ ] Estado vazio explicando o recurso.

**Critérios de aceite**
- [ ] Anel de limite com percentual textual, não só cor.
- [ ] Fatura atual em destaque com dias para fechamento.
- [ ] Alterar dia de fechamento exibe o aviso antes de confirmar.
- [ ] Grade responsiva sem *scroll* horizontal em 320 px.
- [ ] Cartão com limite estourado é sinalizado claramente.

---

#### #94 · feat(frontend): detalhe de fatura e pagamento

`M8` · **5 pts** · `frontend` `feat` `faturas` `p1-alta` · Depende de: #93, #91 · RF-51, RF-52

**Descrição.** Detalhe da fatura com itens, resumo por categoria e o fluxo de pagamento.

**Checklist técnico**
- [ ] Página de fatura com cabeçalho (valor, situação, datas) e lista de itens.
- [ ] Itens com rótulo de parcela (`3/10`) e categoria.
- [ ] Gráfico de pizza do `resumoPorCategoria`.
- [ ] Navegação entre faturas (anterior/próxima) e histórico.
- [ ] `DialogoPagarFatura` com conta, valor (padrão total) e data; pré-visualização do saldo após.
- [ ] Suporte a pagamento parcial com `valorRestante` visível.
- [ ] Selo de situação com cor e texto.
- [ ] Invalidar `faturas`, `cartoes`, `contas`, `movimentacoes` e `dashboard` após pagar.

**Critérios de aceite**
- [ ] Itens agrupados e somados conferindo com o total da fatura.
- [ ] Parcelas exibem o rótulo `x/N`.
- [ ] Pré-visualização do saldo confere com o resultado.
- [ ] Pagamento parcial atualiza `valorRestante` corretamente.
- [ ] Navegação entre faturas preserva o contexto do cartão.
- [ ] Saldo da conta atualizado na interface imediatamente após o pagamento.

---

#### #95 · feat(frontend): formulário de compra parcelada

`M8` · **5 pts** · `frontend` `feat` `movimentacoes` `p1-alta` · Depende de: #94, #90 · RF-28

**Descrição.** Formulário com pré-visualização das parcelas — o usuário precisa ver que a soma fecha antes de confirmar.

**Checklist técnico**
- [ ] `FormularioCompraParcelada` com descrição, valor total, número de parcelas, data, cartão/conta e categoria.
- [ ] Pré-visualização de todas as parcelas com valor e vencimento, usando a **mesma** regra de rateio do backend.
- [ ] Exibir a soma das parcelas confirmando que fecha com o total.
- [ ] Destacar a última parcela quando difere das demais, explicando o arredondamento.
- [ ] Atalhos de número de parcelas (2×, 3×, 6×, 10×, 12×) mais entrada livre.
- [ ] Aviso quando o total excede o limite disponível (sem bloquear).
- [ ] Visualização de compra parcelada agrupando as parcelas.

**Critérios de aceite**
- [ ] Pré-visualização coincide exatamente com as parcelas criadas pelo backend.
- [ ] Soma exibida é igual ao valor total informado.
- [ ] Última parcela diferente vem com explicação visível.
- [ ] Aviso de limite não impede a submissão.
- [ ] Formulário completável por teclado.

---

#### #96 · test(cartoes): casos-limite de ciclo e rateio

`M8` · **5 pts** · `backend` `test` `p0-critica` · Depende de: #92, #90 · RN-21, RN-40 a RN-45

**Descrição.** A suíte que protege as duas áreas de maior risco da Milestone: aritmética de datas e arredondamento.

**Checklist técnico**
- [ ] Teste tabular de `determinarCicloFatura` com ≥ 30 combinações de data e dia de fechamento.
- [ ] Teste tabular de `ratearParcelas` com ≥ 15 combinações, verificando a soma.
- [ ] Testes de todos os meses, incluindo fevereiro bissexto e não bissexto.
- [ ] Teste de compra em 10× atravessando a virada de ano.
- [ ] Invariante: `Fatura.valorTotal = Σ itens` após criar, editar e excluir.
- [ ] Invariante de limite: `disponivel = total − utilizado` após 20 operações.
- [ ] Teste de pagamento não duplicando despesas em relatórios.
- [ ] Teste de idempotência das tarefas de fechamento.
- [ ] Teste com `TZ=UTC` e `TZ=America/Sao_Paulo` produzindo o mesmo resultado.

**Critérios de aceite**
- [ ] Cobertura 100% em `data.ts` e `dinheiro.ts`.
- [ ] Cobertura ≥ 90% em `cartao.servico.ts`, `fatura.servico.ts` e no serviço de parcelamento.
- [ ] Todas as combinações da tabela de ciclos passam.
- [ ] Soma das parcelas fecha em todos os casos testados.
- [ ] Invariantes de fatura e limite mantidas.
- [ ] Resultados idênticos nos dois timezones.

---

#### #97 · test(cartoes): E2E do ciclo de cartão

`M8` · **2 pts** · `frontend` `test` `p2-media` · Depende de: #95, #96 · RF-48 a RF-52

**Descrição.** Fluxo completo do cartão na interface.

**Checklist técnico**
- [ ] Cenário: criar cartão → lançar despesa → conferir fatura → criar compra em 10× → conferir parcelas → pagar fatura → conferir saldo.
- [ ] Verificar a soma das parcelas na pré-visualização e após a criação.
- [ ] Verificar limite disponível após cada operação.
- [ ] Verificar que o pagamento reduz o saldo da conta uma única vez.

**Critérios de aceite**
- [ ] Cenário completo passa de ponta a ponta.
- [ ] Soma das parcelas confere na interface e no banco.
- [ ] Limite disponível correto em cada etapa.
- [ ] Teste estável em três execuções consecutivas.

---

# Milestone 9 — Orçamentos e Notificações

> 11 issues · 52 pontos · depende de M6, M7 e M8
> RF-46, RF-65 a RF-71 · RN-48 a RN-50

---

#### #98 · feat(banco): migration de orçamentos e notificações completas

`M9` · **5 pts** · `banco` `feat` `orcamentos` `p1-alta` · Depende de: #66, #84 · RN-48

**Descrição.** Modelo `Orcamento` com escopo dual e marcas de idempotência de alerta, mais a extensão do modelo `Notificacao` criado parcialmente em #84.

**Checklist técnico**
- [ ] Modelo `Orcamento` conforme [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo).
- [ ] Colunas `alerta80EnviadoEm`, `alerta90EnviadoEm`, `alerta100EnviadoEm` (marcas de idempotência, RN-50).
- [ ] Completar `Notificacao` com `entidadeTipo`, `entidadeId`, `urlAcao`.
- [ ] Índices únicos parciais `uq_orcamento_usuario_periodo` e `uq_orcamento_grupo_periodo` (RN-48).
- [ ] `CHECK` de escopo XOR, `valor_limite > 0` e período válido.
- [ ] Índice `(usuario_id, lida_em, criado_em)` em `notificacoes`.
- [ ] Preferências granulares de notificação no `Perfil` (JSON de tipos desativados).
- [ ] Migration `adiciona_orcamentos_e_notificacoes`.

**Critérios de aceite**
- [ ] Segundo orçamento para a mesma categoria/escopo/período falha no banco.
- [ ] Orçamento excluído logicamente libera o período para novo cadastro.
- [ ] `valor_limite = 0` é rejeitado.
- [ ] `mes = 13` é rejeitado.
- [ ] Notificações existentes de #84 permanecem íntegras.

---

#### #99 · feat(orcamentos): CRUD com consumo e projeção

`M9` · **5 pts** · `backend` `feat` `orcamentos` `p1-alta` · Depende de: #98 · RF-65, RF-66, RN-48, RN-49

**Descrição.** CRUD com o cálculo de consumo por período. O escopo do consumo é a parte sutil: orçamento pessoal conta apenas despesas pessoais; de grupo, apenas as do grupo.

**Checklist técnico**
- [ ] `GET /orcamentos` com `ano`/`mes` (padrão mês corrente) e escopo.
- [ ] Consulta de consumo de [03-DATABASE.md §8.5](03-DATABASE.md#85-consumo-de-orçamento-rn-49), respeitando o escopo.
- [ ] Consumo por `dataCompetencia`, excluindo transferências, canceladas e excluídas (RN-49).
- [ ] Incluir subcategorias no consumo da categoria pai.
- [ ] `situacaoAlerta` nas quatro faixas de [04-API.md §19.1](04-API.md#191-get-orcamentos-).
- [ ] `projecaoFimMes = consumido / dias decorridos × dias do mês`; `vaiEstourar`.
- [ ] `POST`, `GET /:id`, `PATCH`, `DELETE` (lógico).
- [ ] `meta.totalizadores` com limite e consumo agregados.
- [ ] Validar que a categoria é do tipo `DESPESA` ou `AMBOS`.

**Critérios de aceite**
- [ ] Consumo confere com a soma das despesas da categoria no período.
- [ ] Orçamento pessoal ignora despesas de grupo e vice-versa.
- [ ] Subcategorias somam no orçamento da categoria pai.
- [ ] `situacaoAlerta` correto nos limites exatos (79,99% / 80% / 89,99% / 90% / 100%).
- [ ] Projeção no dia 1 do mês não produz divisão por zero.
- [ ] Orçamento duplicado responde `409`.
- [ ] Categoria de `RECEITA` responde `422`.

---

#### #100 · feat(orcamentos): replicação entre períodos

`M9` · **5 pts** · `backend` `feat` `orcamentos` `p3-baixa` · Depende de: #99 · RF-68

**Descrição.** Copiar os orçamentos de um mês para outro, sem sobrescrever silenciosamente o que já existe.

**Checklist técnico**
- [ ] `POST /orcamentos/replicar` com `deAno`, `deMes`, `paraAno`, `paraMes`, `sobrescrever`.
- [ ] Com `sobrescrever: false`, preservar existentes e contabilizar como ignorados.
- [ ] Com `true`, atualizar o `valorLimite` e **zerar** as marcas de alerta (novo período, novos alertas).
- [ ] Toda a operação em transação.
- [ ] Retornar contagem de criados e ignorados, mais a lista resultante.
- [ ] Rejeitar replicação para o mesmo período de origem (`422`).
- [ ] Respeitar o escopo (pessoal ou de grupo, não misturar).

**Critérios de aceite**
- [ ] Replicação cria os orçamentos ausentes e ignora os existentes.
- [ ] Com `sobrescrever: true`, valores são atualizados e as marcas de alerta zeradas.
- [ ] Período de origem sem orçamentos responde `200` com contagem zero, não erro.
- [ ] Origem igual ao destino responde `422`.
- [ ] Mensagem informa quantos foram criados e quantos ignorados.

---

#### #101 · feat(notificacoes): serviço completo de notificações

`M9` · **5 pts** · `backend` `feat` `notificacoes` `p1-alta` · Depende de: #98 · RF-69 a RF-71

**Descrição.** Central de notificações com todos os tipos, respeitando as preferências do usuário.

**Checklist técnico**
- [ ] `GET /notificacoes` com filtros `apenasNaoLidas` e `tipo`, paginação e `meta.naoLidas`.
- [ ] `GET /notificacoes/nao-lidas/contagem` — endpoint leve para o *badge*.
- [ ] `PATCH /notificacoes/:id/ler` e `PATCH /notificacoes/ler-todas` (retornando `atualizadas`).
- [ ] `DELETE /notificacoes/:id`.
- [ ] `NotificacaoServico.criar` verificando `notificacoesApp` e as preferências por tipo (RF-71).
- [ ] `urlAcao` como caminho relativo do frontend.
- [ ] Preferências por tipo em `PATCH /perfil`.
- [ ] Tarefa de limpeza removendo notificações lidas com mais de 90 dias.

**Critérios de aceite**
- [ ] Contagem de não lidas confere com a listagem filtrada.
- [ ] Tipo desativado nas preferências não gera notificação.
- [ ] `notificacoesApp: false` desativa todas.
- [ ] `ler-todas` retorna a quantidade correta e é idempotente.
- [ ] Notificação de outro usuário responde `404`.
- [ ] `urlAcao` é caminho relativo, nunca URL absoluta.

---

#### #102 · feat(orcamentos): alertas idempotentes por limiar

`M9` · **5 pts** · `backend` `feat` `orcamentos` `p0-critica` · Depende de: #101, #99 · RF-67, RN-50

**Descrição.** A tarefa que dá utilidade ao orçamento. A idempotência por limiar é a regra crítica: sem ela, o usuário receberia o mesmo alerta todos os dias até o fim do mês.

**Checklist técnico**
- [ ] `alertar-orcamentos.tarefa.ts` (07:00) avaliando todos os orçamentos do mês corrente.
- [ ] Disparar `ORCAMENTO_80`, `ORCAMENTO_90` e `ORCAMENTO_100` conforme a faixa.
- [ ] Gravar a marca correspondente ao notificar; não notificar se a marca já existe (RN-50).
- [ ] Salto direto acima de 100% dispara apenas o alerta de 100%, não os três.
- [ ] Marcas resetadas ao mudar de período (orçamento novo nasce sem marcas).
- [ ] Notificação com valor consumido, limite e percentual na mensagem.
- [ ] Orçamento de grupo notifica todos os membros com papel ≥ `PARTICIPANTE`.
- [ ] Log com contagem de orçamentos avaliados e alertas emitidos.

**Critérios de aceite**
- [ ] Orçamento em 85% dispara **um** alerta de 80%.
- [ ] Reexecução no mesmo dia não gera segundo alerta (RN-50).
- [ ] Passar de 85% para 92% dispara o alerta de 90%, e só ele.
- [ ] Pular de 50% para 120% dispara apenas o alerta de 100%.
- [ ] Orçamento do mês seguinte dispara alertas próprios.
- [ ] Orçamento de grupo notifica todos os membros elegíveis.
- [ ] Tarefa executada 5 vezes seguidas produz o mesmo estado.

---

#### #103 · feat(notificacoes): notificações de vencimento e receitas previstas

`M9` · **5 pts** · `backend` `feat` `notificacoes` `p2-media` · Depende de: #101 · RF-69

**Descrição.** Avisos de contas a vencer, atrasadas e receitas previstas.

**Checklist técnico**
- [ ] `notificar-vencimentos.tarefa.ts` (07:05).
- [ ] `DESPESA_A_VENCER` em D-3 e D-0; `DESPESA_ATRASADA` no dia seguinte ao vencimento.
- [ ] `RECEITA_PREVISTA` em D-0 para receitas pendentes.
- [ ] Agrupar múltiplos vencimentos do mesmo dia em uma notificação ("3 contas vencem hoje") — evita inundar o usuário.
- [ ] Idempotência por movimentação e por marco, usando o tipo e a `entidadeId`.
- [ ] Movimentações de grupo notificam os membros elegíveis.
- [ ] Log com contagem por tipo.

**Critérios de aceite**
- [ ] Notificação de D-3 dispara uma única vez por movimentação.
- [ ] Três vencimentos no mesmo dia geram uma notificação agrupada.
- [ ] Movimentação paga antes do vencimento não gera notificação.
- [ ] Reexecução no mesmo dia não duplica.
- [ ] Movimentação de grupo notifica os membros, não apenas o autor.

---

#### #104 · feat(dashboard): bloco de alertas e orçamentos

`M9` · **5 pts** · `backend` `feat` `dashboard` `p2-media` · Depende de: #102 · RF-46

**Descrição.** Completar os blocos do dashboard que ficaram vazios desde M4, agora que orçamentos, metas, grupos e cartões existem.

**Checklist técnico**
- [ ] Preencher `orcamentos`, `metas`, `contasCompartilhadas` e `cartoes` no `GET /dashboard`.
- [ ] Bloco `alertas` consolidando: orçamento em risco, vencimentos próximos, faturas a vencer, metas com prazo próximo.
- [ ] Ordenar alertas por severidade (`CRITICO` → `ATENCAO` → `INFORMACAO`) e limitar a 5.
- [ ] Manter o alvo de latência de 300 ms com todos os blocos preenchidos.
- [ ] Revisar as consultas paralelas para não degradar com o volume adicional.
- [ ] Cada alerta com `urlAcao` navegável.

**Critérios de aceite**
- [ ] Todos os blocos preenchidos com dados reais.
- [ ] Alertas ordenados por severidade, máximo 5.
- [ ] `GET /dashboard` continua abaixo de 300 ms com 5 000 movimentações e todos os recursos ativos.
- [ ] Usuário sem orçamentos, metas ou cartões recebe arrays vazios, sem erro.
- [ ] Toda `urlAcao` corresponde a uma rota existente do frontend.

---

#### #105 · feat(frontend): página de orçamentos

`M9` · **5 pts** · `frontend` `feat` `orcamentos` `p1-alta` · Depende de: #99, #53 · RF-65, RF-66

**Descrição.** Visualização de consumo por categoria, com semáforo de risco e projeção.

**Checklist técnico**
- [ ] `CartaoOrcamento` com categoria, barra de consumo, valores e semáforo.
- [ ] Barra com cor por faixa mais **percentual e valores textuais** (não só cor).
- [ ] Indicador de projeção com aviso "no ritmo atual, vai estourar", rotulado como estimativa.
- [ ] Navegação mês a mês, com o mês persistido na URL.
- [ ] `FormularioOrcamento` com categoria (só `DESPESA`/`AMBOS`), período e limite.
- [ ] Cartão-resumo do orçamento total do mês.
- [ ] `DialogoReplicar` para copiar do mês anterior.
- [ ] Estado vazio sugerindo criar a partir da média de gastos das categorias mais usadas.

**Critérios de aceite**
- [ ] Consumo e percentual conferem com a soma de despesas da categoria.
- [ ] Semáforo com rótulo textual além da cor (A11Y-01).
- [ ] Projeção identificada como estimativa, não como fato.
- [ ] Navegação de mês preserva o escopo selecionado.
- [ ] Replicação exibe o resultado (criados e ignorados).
- [ ] Grade responsiva sem *scroll* horizontal em 320 px.

---

#### #106 · feat(frontend): central de notificações

`M9` · **5 pts** · `frontend` `feat` `notificacoes` `p1-alta` · Depende de: #101, #53 · RF-69, RF-70

**Descrição.** Notificações acessíveis do cabeçalho, com badge de contagem e navegação para o recurso relacionado.

**Checklist técnico**
- [ ] `SinoNotificacoes` no cabeçalho com badge de não lidas.
- [ ] `usarContagemNaoLidas` com `refetchInterval` de 60 s.
- [ ] `PainelNotificacoes` em `Popover` (desktop) / `Sheet` (mobile).
- [ ] Item com ícone por tipo, título, mensagem, tempo relativo e indicador de não lida.
- [ ] Clique marca como lida e navega para `urlAcao`.
- [ ] Ação "marcar todas como lidas" e exclusão individual.
- [ ] Página dedicada com filtros por tipo e paginação.
- [ ] Badge anunciado por `aria-live` ao mudar; painel navegável por teclado.
- [ ] Estado vazio adequado.

**Critérios de aceite**
- [ ] Badge reflete a contagem real e atualiza a cada 60 s.
- [ ] Clicar na notificação marca como lida e navega corretamente.
- [ ] "Marcar todas" zera o badge imediatamente.
- [ ] Painel operável por teclado, fechando com `Esc`.
- [ ] Leitor de tela anuncia novas notificações.
- [ ] Painel legível em 320 px.

---

#### #107 · feat(frontend): alertas no dashboard e preferências

`M9` · **5 pts** · `frontend` `feat` `dashboard` `p2-media` · Depende de: #104, #106 · RF-46, RF-71

**Descrição.** Alertas acionáveis no dashboard e controle granular de notificações no perfil.

**Checklist técnico**
- [ ] `PainelAlertas` no dashboard com severidade visual e ação por alerta.
- [ ] Ícone e cor por severidade, com **rótulo textual** de severidade.
- [ ] Alerta dispensável na sessão (sem persistir dispensa no servidor).
- [ ] Seção de preferências de notificação nas configurações, com alternância por tipo.
- [ ] Agrupamento por domínio (orçamentos, vencimentos, metas, grupos, cartões).
- [ ] Alternância mestre `notificacoesApp` desabilitando o grupo inteiro.
- [ ] Seção de orçamentos no dashboard, com os 3 mais críticos.

**Critérios de aceite**
- [ ] Alertas exibem severidade com texto, não só cor.
- [ ] Clicar no alerta navega para o recurso correto.
- [ ] Desativar um tipo interrompe as notificações daquele tipo.
- [ ] Alternância mestre desabilita visualmente as individuais.
- [ ] Dashboard sem alertas não exibe a seção vazia.

---

#### #108 · test(orcamentos): suíte de orçamentos e notificações

`M9` · **2 pts** · `backend` `test` `p1-alta` · Depende de: #103, #102 · RN-48 a RN-50

**Descrição.** Cobertura do cálculo de consumo e, principalmente, da idempotência dos alertas.

**Checklist técnico**
- [ ] Fábricas `fabricarOrcamento` e `fabricarNotificacao`.
- [ ] Integração de todas as rotas de orçamentos e notificações.
- [ ] Teste de consumo por escopo: orçamento pessoal versus de grupo.
- [ ] Teste tabular de `situacaoAlerta` nos limites exatos das quatro faixas.
- [ ] Teste de idempotência executando a tarefa de alertas 5 vezes.
- [ ] Teste de progressão de limiares (50% → 85% → 92% → 105%).
- [ ] Teste de salto direto para acima de 100%.
- [ ] Teste de preferências desativadas.

**Critérios de aceite**
- [ ] Cobertura ≥ 85% em `orcamento.servico.ts` e `notificacao.servico.ts`.
- [ ] Tarefa de alertas idempotente em 5 execuções.
- [ ] Progressão de limiares gera exatamente 3 notificações.
- [ ] Salto para 120% gera exatamente 1 notificação.
- [ ] Consumo isolado por escopo.

---

# Milestone 10 — Dashboard Analítico e Exportações

> 10 issues · 47 pontos · depende de M9
> RF-75 a RF-79

---

#### #109 · feat(relatorios): relatório comparativo entre períodos

`M10` · **5 pts** · `backend` `feat` `relatorios` `p2-media` · Depende de: #52 · RF-75

**Descrição.** Comparar dois períodos arbitrários, sinalizando quando têm durações diferentes — comparar 30 dias com 90 dias sem aviso produz conclusão errada.

**Checklist técnico**
- [ ] `GET /relatorios/comparativo` com os quatro parâmetros de data e `agruparPor`.
- [ ] Agrupamentos `CATEGORIA`, `CONTA` e `MES`.
- [ ] Variação absoluta e percentual por item.
- [ ] Incluir itens presentes em apenas um dos períodos (com zero no outro).
- [ ] `meta.duracaoDiferente: true` quando as durações divergem.
- [ ] Validar sobreposição de períodos, permitindo com aviso.
- [ ] Ordenar por variação absoluta decrescente.

**Critérios de aceite**
- [ ] Categoria presente só no período A aparece com zero em B.
- [ ] Variação percentual com valor base zero retorna `null`, não `Infinity`.
- [ ] Durações diferentes sinalizadas em `meta`.
- [ ] Períodos invertidos (início > fim) respondem `400`.
- [ ] Somas de cada período conferem com o relatório do período isolado.

---

#### #110 · feat(dashboard): indicadores derivados e analíticos

`M10` · **5 pts** · `backend` `feat` `dashboard` `p2-media` · Depende de: #109 · RF-79

**Descrição.** Métricas de segunda ordem que exigem histórico para ter sentido.

**Checklist técnico**
- [ ] `GET /dashboard/analitico` com média de gastos diária/mensal, maior despesa, categoria de maior crescimento, taxa de poupança histórica.
- [ ] Evolução patrimonial (saldo consolidado ao fim de cada mês).
- [ ] Distribuição de gastos por dia da semana (base do *heatmap*).
- [ ] Gastos recorrentes versus eventuais.
- [ ] Ticket médio por categoria.
- [ ] Exigir mínimo de 3 meses de histórico; abaixo disso, responder com `meta.historicoInsuficiente`.
- [ ] Latência-alvo < 1 200 ms.

**Critérios de aceite**
- [ ] Métricas conferem com cálculo manual em base de teste conhecida.
- [ ] Usuário com menos de 3 meses recebe `historicoInsuficiente`, não valores enganosos.
- [ ] Evolução patrimonial termina no saldo consolidado atual.
- [ ] Divisão por zero tratada em todas as médias.
- [ ] Responde em < 1 200 ms com 24 meses de histórico.

---

#### #111 · feat(relatorios): comparativo de 12 meses por dimensão

`M10` · **5 pts** · `backend` `feat` `relatorios` `p3-baixa` · Depende de: #110 · RF-78

**Descrição.** Matriz de 12 meses × dimensão (categoria, conta ou usuário do grupo), base das barras empilhadas.

**Checklist técnico**
- [ ] `GET /relatorios/matriz-12-meses` com `dimensao` (`CATEGORIA`|`CONTA`|`USUARIO`) e `tipo`.
- [ ] Dimensão `USUARIO` válida apenas com `contaCompartilhadaId`; sem ele, `400`.
- [ ] Retornar matriz densa: toda dimensão com valor em todos os 12 meses (zero quando ausente).
- [ ] Limitar a 15 dimensões, agrupando o excedente em "Outros".
- [ ] Totais por linha e por coluna.
- [ ] Consulta única, sem laço de N consultas.

**Critérios de aceite**
- [ ] Matriz densa: nenhuma célula ausente.
- [ ] Dimensão `USUARIO` sem grupo responde `400`.
- [ ] Mais de 15 dimensões agrupa o restante em "Outros".
- [ ] Soma das colunas confere com o fluxo de caixa do mesmo período.
- [ ] Uma única consulta ao banco (verificado no log do Prisma).

---

#### #112 · feat(relatorios): exportação em CSV e XLSX

`M10` · **5 pts** · `backend` `feat` `relatorios` `p2-media` · Depende de: #111 · RF-76

**Descrição.** Exportação com atenção ao que realmente atrapalha o usuário brasileiro: separador e *encoding* do CSV no Excel, e valores como número (não texto) no XLSX.

**Checklist técnico**
- [ ] `POST /relatorios/exportar` com `tipo`, `formato` e `parametros`.
- [ ] CSV com **UTF-8 BOM** e separador `;` (padrão pt-BR do Excel).
- [ ] XLSX via `exceljs`, com valores como **número**, formato de moeda aplicado e cabeçalho congelado.
- [ ] Datas em formato de data reconhecível pela planilha, não string.
- [ ] Nome de arquivo descritivo: `pfm-relatorio-mensal-2026-07.xlsx`.
- [ ] Cabeçalhos em pt-BR.
- [ ] `Content-Disposition: attachment` com `filename*` para acentos.
- [ ] *Rate limit* de 10 exportações/hora.

**Critérios de aceite**
- [ ] CSV abre no Excel pt-BR com colunas e acentos corretos, sem importação manual.
- [ ] XLSX permite somar a coluna de valores diretamente na planilha.
- [ ] Datas reconhecidas como data pela planilha.
- [ ] Nome de arquivo identifica tipo e período.
- [ ] 11ª exportação em uma hora responde `429`.
- [ ] Exportação respeita o escopo do solicitante.

---

#### #113 · feat(relatorios): exportação em PDF

`M10` · **5 pts** · `backend` `feat` `relatorios` `p3-baixa` · Depende de: #112 · RF-76

**Descrição.** PDF com identidade visual, tabelas e gráficos renderizados no servidor.

**Checklist técnico**
- [ ] Geração com `pdfkit` ou `puppeteer` a partir de template HTML.
- [ ] A4, cabeçalho com período, escopo e data de geração; rodapé com paginação.
- [ ] Gráficos renderizados como imagem (SVG → PNG).
- [ ] Tabelas com quebra de página preservando o cabeçalho.
- [ ] Valores formatados em moeda pt-BR.
- [ ] Fontes embutidas para acentuação correta.
- [ ] `incluirGraficos: false` gera versão só com tabelas (mais rápida).

**Critérios de aceite**
- [ ] PDF abre corretamente em leitores comuns.
- [ ] Acentuação correta em todo o documento.
- [ ] Cabeçalho de tabela repetido em cada página.
- [ ] Gráficos legíveis e com as cores do Design System.
- [ ] Geração de relatório anual completo em < 10 s.

---

#### #114 · feat(relatorios): processamento assíncrono de exportações grandes

`M10` · **5 pts** · `backend` `feat` `relatorios` `p3-baixa` · Depende de: #113 · RF-76

**Descrição.** Relatórios acima de 5 000 linhas processados fora do ciclo de requisição, com entrega por e-mail — manter a conexão aberta por minutos é falha esperando acontecer.

**Checklist técnico**
- [ ] Estimar volume antes de processar; acima de 5 000 linhas, responder `202`.
- [ ] Registro de processamento com situação (`PENDENTE`, `PROCESSANDO`, `CONCLUIDO`, `FALHOU`).
- [ ] Fila em memória com processamento sequencial e limite de concorrência.
- [ ] Arquivo salvo em `/var/pfm/exportacoes` com token de acesso e validade de 24 h.
- [ ] E-mail com link de download.
- [ ] `GET /relatorios/exportacoes/:id` para consultar a situação.
- [ ] Tarefa diária removendo arquivos expirados.
- [ ] Falha no processamento notifica o usuário.

**Critérios de aceite**
- [ ] Relatório com mais de 5 000 linhas responde `202` com `processamentoId`.
- [ ] E-mail chega com link funcional.
- [ ] Link expira após 24 h respondendo `404`.
- [ ] Link de outro usuário responde `404`.
- [ ] Falha no processamento gera notificação, sem silêncio.
- [ ] Arquivos expirados removidos pela tarefa.

---

#### #115 · feat(frontend): página de análises

`M10` · **5 pts** · `frontend` `feat` `dashboard` `p2-media` · Depende de: #110, #54 · RF-77, RF-79

**Descrição.** Página de análise avançada com filtros combináveis e os gráficos adicionais.

**Checklist técnico**
- [ ] Página com filtros de período, escopo, tipo e dimensão persistidos na URL.
- [ ] `GraficoArea` (evolução patrimonial), `GraficoBarraEmpilhada` (12 meses por dimensão).
- [ ] Cartões de indicadores derivados com explicação do cálculo em tooltip.
- [ ] Estado de histórico insuficiente com mensagem clara, em vez de gráficos vazios.
- [ ] Alternância entre visualização de gráfico e tabela.
- [ ] Legenda interativa permitindo isolar séries.
- [ ] Todos os gráficos com tabela equivalente (A11Y-04).

**Critérios de aceite**
- [ ] Filtros combinados refletem em todos os gráficos.
- [ ] Histórico insuficiente exibe mensagem, não gráfico vazio.
- [ ] Legenda interativa acessível por teclado.
- [ ] Cada indicador explica seu cálculo.
- [ ] Gráficos legíveis em 320 px.

---

#### #116 · feat(frontend): heatmap de gastos

`M10` · **5 pts** · `frontend` `feat` `dashboard` `p3-baixa` · Depende de: #115 · RF-77

**Descrição.** Mapa de calor de gastos por dia. Componente com risco de acessibilidade acima da média, por depender de gradiente de cor.

**Checklist técnico**
- [ ] `GraficoHeatmap` em grade de semanas × dias.
- [ ] Escala sequencial de cor derivada do token `perigo`, com contraste verificado.
- [ ] Tooltip com data, valor total e quantidade de lançamentos.
- [ ] Legenda de escala com faixas de valor **rotuladas numericamente**.
- [ ] Tabela equivalente obrigatória, expandida por padrão em leitor de tela (A11Y-04).
- [ ] Células navegáveis por teclado, anunciando data e valor.
- [ ] Alternativa de visualização em barras por dia da semana.
- [ ] Dias sem gasto visualmente distintos de dias sem dados.

**Critérios de aceite**
- [ ] Escala de cor com contraste adequado nos dois temas.
- [ ] Legenda com valores numéricos, não apenas gradiente.
- [ ] Tabela equivalente presente e completa.
- [ ] Células navegáveis por teclado, com anúncio de data e valor.
- [ ] Dia sem gasto distinguível de dia fora do período.

---

#### #117 · feat(frontend): interface de exportação

`M10` · **5 pts** · `frontend` `feat` `relatorios` `p2-media` · Depende de: #114, #55 · RF-76

**Descrição.** Modal de exportação tratando os dois modos de resposta — download direto e processamento assíncrono.

**Checklist técnico**
- [ ] `DialogoExportar` com tipo, formato, período e opção de incluir gráficos.
- [ ] Explicar cada formato ("CSV para planilhas, PDF para arquivar").
- [ ] Tratar `200` com download imediato via blob.
- [ ] Tratar `202` exibindo mensagem de processamento e informando o e-mail.
- [ ] Painel de exportações em andamento, com consulta de situação.
- [ ] Tratar `429` informando quando será possível tentar de novo.
- [ ] Indicador de progresso durante a geração.
- [ ] Botão de exportar habilitado nas páginas de relatórios e análises.

**Critérios de aceite**
- [ ] Download direto funciona nos três formatos.
- [ ] `202` exibe mensagem clara sobre a entrega por e-mail.
- [ ] Painel de andamento reflete a situação real.
- [ ] `429` informa o tempo de espera.
- [ ] Modal operável por teclado, fechando com `Esc`.

---

#### #118 · test(relatorios): suíte de análises e exportações

`M10` · **2 pts** · `backend` `test` `p2-media` · Depende de: #114, #111 · RF-75 a RF-79

**Descrição.** Cobertura dos cálculos analíticos e da integridade dos arquivos exportados.

**Checklist técnico**
- [ ] Base de teste determinística com 24 meses de histórico conhecido.
- [ ] Testes de todos os indicadores derivados contra valores calculados manualmente.
- [ ] Teste da matriz de 12 meses verificando densidade e totais.
- [ ] Teste de exportação CSV verificando BOM, separador e acentuação.
- [ ] Teste de exportação XLSX lendo o arquivo gerado e verificando tipos de célula.
- [ ] Teste de exportação PDF verificando geração sem erro e tamanho plausível.
- [ ] Teste de escopo: exportação não inclui dado de terceiro.
- [ ] Teste do fluxo assíncrono, do `202` até o arquivo pronto.

**Critérios de aceite**
- [ ] Cobertura ≥ 80% em `relatorio.servico.ts` e `exportacao.servico.ts`.
- [ ] CSV gerado contém BOM e separador correto.
- [ ] XLSX tem valores como número, não texto.
- [ ] Nenhuma exportação vaza dado fora do escopo.
- [ ] Fluxo assíncrono completo coberto.

---

# Milestone 11 — Pesquisa, Auditoria e Observabilidade

> 10 issues · 42 pontos · depende de M6 e M9
> RF-09, RF-80 a RF-83 · RNF-19 a RNF-22

---

#### #119 · feat(banco): migration de auditoria e índice trigram

`M11` · **5 pts** · `banco` `feat` `auditoria` `p1-alta` · Depende de: #66 · RF-80, RF-82

**Descrição.** Modelo `LogAuditoria` e a extensão `pg_trgm` com índice GIN para a pesquisa textual.

**Checklist técnico**
- [ ] Modelo `LogAuditoria` conforme [03-DATABASE.md §4](03-DATABASE.md#4-schema-prisma-completo), com `estadoAnterior`/`estadoNovo` como `Json`.
- [ ] Enum `AcaoAuditoria` completo.
- [ ] `CREATE EXTENSION IF NOT EXISTS pg_trgm`.
- [ ] `idx_mov_descricao_trgm` (GIN) e índices trigram equivalentes em `categorias`, `contas` e `metas`.
- [ ] Índices `(usuario_id, criado_em)`, `(conta_compartilhada_id, criado_em)`, `(entidade_tipo, entidade_id)`.
- [ ] Migration `adiciona_indice_trgm_e_auditoria`.
- [ ] Nenhum endpoint de `UPDATE` ou `DELETE` em auditoria — a tabela é *append-only* por design.

**Critérios de aceite**
- [ ] Extensão `pg_trgm` ativa.
- [ ] Índices GIN existentes (verificado em `pg_indexes`).
- [ ] `EXPLAIN` de busca por `ILIKE '%termo%'` usa o índice trigram.
- [ ] Migration aplica em base com dados sem bloqueio prolongado.
- [ ] Nenhuma rota de escrita destrutiva sobre `logs_auditoria`.

---

#### #120 · feat(auditoria): registro de ações sensíveis

`M11` · **5 pts** · `backend` `feat` `auditoria` `p1-alta` · Depende de: #119 · RF-82

**Descrição.** Serviço de auditoria acoplado às operações sensíveis, registrando estado anterior e novo — sem isso, "quem excluiu esse lançamento?" fica sem resposta.

**Checklist técnico**
- [ ] `AuditoriaServico.registrar({ usuarioId, acao, entidadeTipo, entidadeId, estadoAnterior, estadoNovo, contexto })`.
- [ ] Capturar IP, `userAgent` e `requestId` do contexto da requisição (`AsyncLocalStorage`).
- [ ] Instrumentar: login, logout, alteração de senha, exclusão de movimentação, alteração de valor efetivado, gestão de membros, convites, transferência de administração, exclusão de grupo, exclusão de conta, exportação.
- [ ] Sanitizar o estado: **nunca** registrar senha, hash ou token.
- [ ] Registrar apenas os campos alterados em atualizações, não o objeto inteiro.
- [ ] Registro na mesma transação da operação auditada (auditoria perdida é auditoria inútil).
- [ ] Falha ao auditar **não** silencia: loga erro em nível `error`.

**Critérios de aceite**
- [ ] Todas as ações listadas geram registro.
- [ ] `estadoAnterior` e `estadoNovo` contêm apenas os campos relevantes.
- [ ] Nenhum registro contém senha, hash ou token (teste varre a tabela).
- [ ] `requestId` correlaciona o registro com os logs da aplicação.
- [ ] Rollback da operação também descarta o registro de auditoria.

---

#### #121 · feat(auditoria): consulta de auditoria de grupo

`M11` · **3 pts** · `backend` `feat` `auditoria` `p2-media` · Depende de: #120 · RF-83

**Descrição.** Administrador consulta o histórico do próprio grupo. Nenhum acesso a auditoria de outros escopos.

**Checklist técnico**
- [ ] `GET /contas-compartilhadas/:id/auditoria` restrita a `ADMINISTRADOR`.
- [ ] Filtros: `acao` (repetível), `usuarioId`, `entidadeTipo`, `dataInicio`, `dataFim`.
- [ ] Paginação, ordenação por `criadoEm` decrescente.
- [ ] Incluir dados do autor (nome e foto).
- [ ] Diferença legível entre estado anterior e novo, calculada no servidor.
- [ ] Retenção de 2 anos para auditoria de grupo; tarefa de limpeza.
- [ ] Sem endpoint global de auditoria na v1.x/v2.0.

**Critérios de aceite**
- [ ] Participante e observador recebem `403`.
- [ ] Não membro recebe `404`.
- [ ] Filtros funcionam isolados e combinados.
- [ ] Diferença entre estados é legível, sem exigir interpretação de JSON bruto.
- [ ] Auditoria de outro grupo nunca aparece.

---

#### #122 · feat(pesquisa): pesquisa global multi-entidade

`M11` · **5 pts** · `backend` `feat` `pesquisa` `p1-alta` · Depende de: #119 · RF-80, RF-81

**Descrição.** Uma consulta encontrando qualquer coisa acessível ao usuário — e nada além disso. O escopo é a parte crítica.

**Checklist técnico**
- [ ] `GET /pesquisa` com `termo` (≥ 2 caracteres), `tipos` (repetível) e `limitePorTipo`.
- [ ] Busca em movimentações, categorias, contas, cartões, grupos e metas, usando os índices trigram.
- [ ] Bloco `usuarios` restrito a membros de grupos em comum — **nunca** a base de usuários.
- [ ] Escopo rigoroso: apenas recursos próprios e de grupos com membresia ativa (RF-81).
- [ ] Cada resultado com `urlAcao` navegável.
- [ ] Ordenação por relevância (similaridade trigram) dentro de cada tipo.
- [ ] Consultas paralelas com `Promise.all`; alvo < 400 ms.
- [ ] `totalEncontrado` agregado.

**Critérios de aceite**
- [ ] Usuário A jamais encontra recurso de usuário B (teste com dois usuários e dados homônimos).
- [ ] Bloco `usuarios` traz somente membros de grupos em comum.
- [ ] Termo de 1 caractere responde `400`.
- [ ] Busca acentuada e não acentuada encontram o mesmo resultado.
- [ ] `EXPLAIN` confirma uso do índice trigram, sem `Seq Scan`.
- [ ] Responde em < 400 ms.

---

#### #123 · feat(perfil): exclusão de conta com anonimização

`M11` · **5 pts** · `backend` `feat` `perfil` `p1-alta` · Depende de: #120 · RF-09, RN-34

**Descrição.** Direito de eliminação preservando a integridade dos grupos: dados pessoais são anonimizados, registros financeiros compartilhados permanecem.

**Checklist técnico**
- [ ] `DELETE /perfil/conta` exigindo senha e a frase `EXCLUIR MINHA CONTA`.
- [ ] Bloquear se o usuário for administrador único de algum grupo (`422 ADMINISTRADOR_UNICO`).
- [ ] Anonimizar: nome → "Usuário removido", e-mail → hash irreversível, foto removida do disco.
- [ ] Preencher `anonimizadoEm`; revogar todas as sessões.
- [ ] Excluir dados exclusivamente pessoais (contas, movimentações pessoais, cartões, metas, orçamentos, anexos).
- [ ] Preservar movimentações de grupo com autor anonimizado (RN-34).
- [ ] Registro de auditoria da exclusão.
- [ ] Tudo em uma transação; e-mail de confirmação antes da anonimização.

**Critérios de aceite**
- [ ] Senha incorreta ou frase errada responde `400`.
- [ ] Administrador único responde `422` indicando o caminho (transferir antes).
- [ ] Após a exclusão, nome e e-mail não são recuperáveis.
- [ ] Movimentações de grupo permanecem, com autor "Usuário removido".
- [ ] O e-mail liberado permite novo cadastro.
- [ ] Anexos pessoais removidos do disco.
- [ ] Nenhuma sessão sobrevive.

---

#### #124 · feat(perfil): exportação de dados pessoais

`M11` · **3 pts** · `backend` `feat` `perfil` `p2-media` · Depende de: #123 · RF-09

**Descrição.** Direito de acesso: tudo o que o usuário forneceu, em formato legível por máquina e por pessoa.

**Checklist técnico**
- [ ] `GET /perfil/exportar-dados` respondendo `202` e processando de forma assíncrona.
- [ ] Incluir: perfil, contas, categorias, etiquetas, movimentações, transferências, cartões, faturas, metas, orçamentos, grupos e papéis, notificações.
- [ ] JSON estruturado com dicionário de campos em pt-BR.
- [ ] Anexos incluídos em um ZIP junto ao JSON.
- [ ] **Nunca** incluir hash de senha nem tokens.
- [ ] Link temporário de 24 h enviado por e-mail.
- [ ] *Rate limit* de 1 exportação por dia.
- [ ] Registro de auditoria da exportação.

**Critérios de aceite**
- [ ] Exportação contém todas as entidades do usuário.
- [ ] Nenhum hash de senha ou token no arquivo.
- [ ] Anexos presentes no ZIP.
- [ ] Link expira em 24 h.
- [ ] Segunda exportação no mesmo dia responde `429`.
- [ ] Dados de grupo limitados ao que o usuário pode ver.

---

#### #125 · feat(backend): métricas e painel operacional

`M11` · **5 pts** · `backend` `feat` `p2-media` · Depende de: #64 · RNF-21

**Descrição.** Visibilidade operacional mínima: o que está lento, o que está falhando, se as tarefas rodaram.

**Checklist técnico**
- [ ] Coletor de métricas em memória: contagem por rota, latência p50/p95/p99, taxa de erro por código.
- [ ] Métricas de tarefas agendadas: última execução, duração, registros afetados, falhas.
- [ ] Métricas de banco: latência de consulta, uso do pool.
- [ ] `GET /metricas` protegido por token de administração (variável de ambiente), não por sessão de usuário.
- [ ] Formato compatível com Prometheus, para coleta futura sem retrabalho.
- [ ] Janela deslizante de 1 hora, sem crescimento indefinido de memória.
- [ ] Alerta em log quando a taxa de erro passa de 5% em 5 minutos.

**Critérios de aceite**
- [ ] Métricas refletem o tráfego real (verificado com carga sintética).
- [ ] `/metricas` sem token responde `401`.
- [ ] Consumo de memória do coletor estável após 1 hora de carga.
- [ ] Tarefas agendadas reportam última execução e resultado.
- [ ] Taxa de erro alta gera registro de alerta.

---

#### #126 · feat(frontend): pesquisa global com atalho de teclado

`M11` · **5 pts** · `frontend` `feat` `pesquisa` `p1-alta` · Depende de: #122 · RF-80

**Descrição.** Paleta de comando acessível de qualquer tela por `Ctrl/Cmd + K`.

**Checklist técnico**
- [ ] `PaletaPesquisa` em `Command` (cmdk), aberta por `Ctrl/Cmd + K` e por ícone no cabeçalho.
- [ ] Debounce de 300 ms; mínimo 2 caracteres.
- [ ] Resultados agrupados por tipo, com ícone e informação contextual.
- [ ] Navegação por setas, seleção por `Enter`, fechamento por `Esc`.
- [ ] Histórico de buscas recentes em `localStorage`.
- [ ] Ações rápidas sem termo ("Nova movimentação", "Nova conta").
- [ ] Estado de carregando, vazio e erro dentro da paleta.
- [ ] Anúncio da contagem de resultados por `aria-live`.
- [ ] Em mobile, ocupar a tela inteira.

**Critérios de aceite**
- [ ] `Ctrl/Cmd + K` abre a paleta de qualquer tela, inclusive com modal aberto.
- [ ] Navegação completa por teclado, sem mouse.
- [ ] Selecionar resultado navega para o recurso correto.
- [ ] Contagem de resultados anunciada por leitor de tela.
- [ ] Paleta em tela cheia abaixo de 768 px.
- [ ] Atalho não conflita com atalhos do navegador.

---

#### #127 · feat(frontend): aba de auditoria e configurações de privacidade

`M11` · **3 pts** · `frontend` `feat` `auditoria` `p2-media` · Depende de: #121, #124 · RF-83, RF-09

**Descrição.** Auditoria legível para o administrador do grupo e a área de privacidade do perfil.

**Checklist técnico**
- [ ] Aba Auditoria no detalhe do grupo, visível só ao administrador.
- [ ] Linha do tempo com autor, ação, entidade e horário.
- [ ] Diferença legível entre estado anterior e novo (campo por campo, não JSON bruto).
- [ ] Filtros por ação, membro e período; paginação por rolagem incremental.
- [ ] Aba Privacidade nas configurações: exportar dados e excluir conta.
- [ ] `DialogoExcluirConta` com senha, frase de confirmação e lista do que será perdido.
- [ ] Tratar `422 ADMINISTRADOR_UNICO` listando os grupos que exigem transferência.
- [ ] Estado de exportação em andamento.

**Critérios de aceite**
- [ ] Aba Auditoria invisível para não administrador.
- [ ] Diferenças legíveis sem interpretar JSON.
- [ ] Diálogo de exclusão exige senha e frase exata.
- [ ] `422` lista os grupos pendentes de transferência, com link para cada um.
- [ ] Exportação exibe confirmação de que o e-mail será enviado.
- [ ] Rolagem incremental carrega páginas seguintes sem perder a posição.

---

#### #128 · test(pesquisa): suíte de pesquisa, auditoria e privacidade

`M11` · **3 pts** · `backend` `test` `p0-critica` · Depende de: #125, #124 · RF-80 a RF-83, RN-51

**Descrição.** Última rede de segurança do projeto, concentrada em isolamento de escopo — a falha mais grave possível aqui é um usuário encontrar dados de outro.

**Checklist técnico**
- [ ] Cenário com 3 usuários, 2 grupos e dados homônimos deliberados entre escopos.
- [ ] Teste de isolamento da pesquisa para cada tipo de entidade.
- [ ] Teste de que o bloco `usuarios` respeita a regra de grupos em comum.
- [ ] Teste de auditoria: cada ação sensível gera registro com os campos esperados.
- [ ] Teste varrendo `logs_auditoria` em busca de senha, hash ou token.
- [ ] Teste de imutabilidade: nenhuma rota altera ou exclui registro de auditoria.
- [ ] Teste completo de exclusão de conta, verificando o que é anonimizado e o que é preservado.
- [ ] Teste da exportação de dados verificando completude e ausência de segredos.
- [ ] Teste de `/metricas` sem token.

**Critérios de aceite**
- [ ] Cobertura ≥ 85% em `pesquisa.servico.ts`, `auditoria.servico.ts` e no serviço de privacidade.
- [ ] **Zero** vazamento de escopo em qualquer tipo de entidade da pesquisa.
- [ ] Nenhum segredo em `logs_auditoria`.
- [ ] Auditoria comprovadamente imutável.
- [ ] Exclusão de conta anonimiza o pessoal e preserva o de grupo.
- [ ] Exportação completa e sem segredos.

---

## Resumo de pontos por Milestone

| Milestone | Issues | Pontos | Acumulado |
| --------- | -----: | -----: | --------: |
| M0 — Fundação e Infraestrutura | 9 | 34 | 34 |
| M1 — Autenticação e Perfil | 12 | 55 | 89 |
| M2 — Contas Financeiras e Categorias | 10 | 42 | 131 |
| M3 — Movimentações e Transferências | 14 | 76 | 207 |
| M4 — Dashboard e Relatórios | 10 | 50 | 257 |
| M5 — CI/CD e Deploy em Produção | 10 | 42 | 299 |
| M6 — Contas Compartilhadas | 13 | 71 | 370 |
| M7 — Metas Financeiras | 7 | 29 | 399 |
| M8 — Cartões, Faturas e Parcelamentos | 12 | 63 | 462 |
| M9 — Orçamentos e Notificações | 11 | 52 | 514 |
| M10 — Dashboard Analítico e Exportações | 10 | 47 | 561 |
| M11 — Pesquisa, Auditoria e Observabilidade | 10 | 42 | **603** |

### Distribuição por camada

| Camada | Issues | % |
| ------ | -----: | -: |
| `backend` | 62 | 48% |
| `frontend` | 38 | 30% |
| `banco` | 10 | 8% |
| `infra` | 11 | 9% |
| `docs` | 1 | 1% |
| Somente teste (`test`) | 6 | 4% |

Issues de teste dedicadas existem além dos testes escritos dentro de cada issue de implementação — a Definição de Pronto já exige testes em toda entrega. As issues `test(...)` cobrem suítes transversais, invariantes e matrizes de autorização que não pertencem a uma feature isolada.

---

**Documentos relacionados:** [01-SPECIFICATION.md](01-SPECIFICATION.md) · [05-DEVELOPMENT.md](05-DEVELOPMENT.md) · [06-MILESTONES.md](06-MILESTONES.md) · [09-CLAUDE.md](09-CLAUDE.md)
