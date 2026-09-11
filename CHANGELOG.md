# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui, no formato
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), com versionamento
[SemVer](https://semver.org/lang/pt-BR/).

> As versões `0.1.0` a `1.0.0` correspondem às milestones M1 a M5 e existiram apenas em
> `staging` — nenhuma delas foi publicada. **`1.1.0` é a primeira versão a chegar em `main`**
> e concentra tudo o que foi construído entre 30/07/2026 e 14/08/2026.

---

## [1.1.0] — 2026-08-14

Primeira versão estável. Milestones M0 a M6, 78 issues.

### Adicionado

**Identidade e perfil** (M1)

- Cadastro com bcrypt custo 12 e verificação obrigatória por e-mail (token de 24 h).
- Login com _access token_ de 15 min e _refresh token_ em cookie `httpOnly`, com rotação
  e detecção de reuso — token revogado invalida a família inteira.
- Renovação transparente com fila única: requisições concorrentes que recebem 401 aguardam
  uma só chamada.
- Recuperação e redefinição de senha; alteração de senha autenticada.
- Listagem e revogação de sessões ativas; logout individual e global.
- Perfil com nome, avatar, tema claro/escuro e preferências.
- Limite de tentativas nas rotas sensíveis (RN-54).

**Contas e categorias** (M2)

- Contas de vários tipos, com arquivamento, reordenação e proteção contra exclusão com
  histórico.
- Saldo atual e previsto calculados a partir das movimentações — nunca coluna de escrita.
- Saldo consolidado respeitando `incluirNoSaldoTotal` e ignorando contas arquivadas.
- Catálogo de categorias padrão do sistema, copiado no cadastro; categorias próprias com
  um nível de subcategoria e recategorização na exclusão.
- Etiquetas.

**Movimentações e transferências** (M3)

- Receitas e despesas com validação de escopo e compatibilidade de categoria.
- Situações de pagamento: pagar total ou parcial, estornar, marcação automática de atraso.
- Recorrências materializadas com registro-mãe e geração de 12 meses.
- Edição e exclusão com escopo (`APENAS_ESTA`, `ESTA_E_FUTURAS`, `TODAS`) e duplicação.
- Transferências como par vinculado, criadas e excluídas atomicamente, fora dos
  totalizadores de receita e despesa.
- Anexos validados por _magic number_, entregues por rota autenticada.
- Listagem com filtros combináveis, paginação, ordenação e totalizadores.
- Tarefas agendadas de marcação de atraso e geração de recorrências.

**Visão consolidada** (M4)

- Painel com indicadores, variação contra o período anterior e taxa de poupança.
- Fluxo de caixa de 12 meses sem lacunas, despesas e receitas por categoria.
- Relatórios mensal, anual, por categoria, por conta e de fluxo de caixa.
- Gráficos acompanhados de tabela equivalente, navegáveis por teclado (A11Y-04).

**Infraestrutura** (M5)

- `Dockerfile` multiestágio do backend com PM2 em modo cluster e imagem de migration à
  parte.
- `docker-compose.prod.yml`, configuração de Nginx com TLS, scripts de provisionamento,
  backup, restauração e rollback.
- Workflows de CI, deploy em homologação e deploy em produção com _health check_ como
  portão e reversão automática.
- `GET /saude/prontidao` verificando banco, migrations e armazenamento.

**Contas compartilhadas** (M6)

- Grupos financeiros com papéis (administrador, participante, observador) e matriz de
  permissões resolvida no servidor.
- Exatamente um administrador por grupo, garantido por índice único parcial; transferência
  de administração atômica.
- Convites por e-mail com validade de 7 dias, inclusive para quem ainda não tem cadastro;
  pré-visualização pública sem dado financeiro.
- Contas, categorias, movimentações e etiquetas no escopo de grupo, com indicação de autor.
- Transferência entre conta pessoal e conta de grupo.

### Corrigido

- Portão de orçamento de bundle passa a medir o _bundle_ inicial — entry, `modulepreload` e
  CSS — em vez da soma de todos os chunks. A medida anterior crescia a cada tela nova e
  barrava o deploy antes de chegar ao servidor (#145).
- Renovação de sessão passa a ter uma única chamada em voo compartilhada por todos os
  caminhos. Duas renovações paralelas faziam o backend revogar a família de tokens por
  reuso, derrubando a sessão a cada carga de página.
- Tela de verificação de e-mail não perde mais o resultado da chamada; ficava presa em
  "Verificando seu e-mail..." mesmo com a API respondendo com sucesso.
- Limite de login volta a contar apenas tentativas **falhas**, como RN-54 sempre exigiu.
  Contando também os acertos, quem entrava em vários aparelhos na mesma janela era
  bloqueado sem ter errado a senha.

### Segurança

- Recurso fora do escopo do solicitante responde `404`, nunca `403` — a distinção
  confirmaria a existência do recurso.
- Autorização resolvida na camada de serviço; o cliente apenas lê `minhasPermissoes`.
- Nenhum segredo versionado; nenhuma senha ou token em log, resposta ou _stack trace_.

[1.1.0]: https://github.com/SamuelDeMarco-Dev/Sistema_Financeiro/releases/tag/v1.1.0
