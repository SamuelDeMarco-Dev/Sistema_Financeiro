# 01 — Especificação do Produto

> **Documento:** Especificação Funcional e Não Funcional
> **Projeto:** Gerenciador de Finanças — _Personal Finance Manager_ (PFM)
> **Versão:** 1.0.0 · **Data:** 2026-07-29 · **Status:** Vigente

---

## Sumário

1. [Visão do produto](#1-visão-do-produto)
2. [Personas e casos de uso](#2-personas-e-casos-de-uso)
3. [Escopo](#3-escopo)
4. [Glossário e dicionário de domínio](#4-glossário-e-dicionário-de-domínio)
5. [Requisitos funcionais](#5-requisitos-funcionais)
6. [Regras de negócio](#6-regras-de-negócio)
7. [Requisitos não funcionais](#7-requisitos-não-funcionais)
8. [Design System e responsividade](#8-design-system-e-responsividade)
9. [Acessibilidade](#9-acessibilidade)
10. [Segurança e privacidade](#10-segurança-e-privacidade)
11. [Matriz de rastreabilidade](#11-matriz-de-rastreabilidade)

---

## 1. Visão do produto

### 1.1 Problema

O controle financeiro doméstico é fragmentado. Pessoas que dividem despesas — casais, famílias, repúblicas, sócios — recorrem a planilhas compartilhadas, aplicativos de mensagem e memória. O resultado é retrabalho, divergência de saldos e conflito sobre quem pagou o quê.

Aplicativos existentes tratam finanças como atividade individual: contas compartilhadas são um recurso secundário, quando existem. Não há visão consolidada entre o que é pessoal e o que é coletivo.

### 1.2 Proposta de valor

O PFM trata **finanças pessoais e compartilhadas como cidadãos de primeira classe do mesmo sistema**. O usuário mantém suas contas privadas e participa de grupos financeiros (a "Casa", o "Casal", a "Viagem"), com permissões explícitas, histórico auditável e saldo próprio por grupo — sem sair do mesmo painel.

### 1.3 Objetivo

Desenvolver uma plataforma web moderna para gestão de receitas, despesas, contas financeiras, cartões, categorias, metas, orçamentos, contas compartilhadas e relatórios, com atualização em tempo real de saldos e indicadores.

### 1.4 Princípios de produto

| Princípio                       | Significado prático                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Mobile First**                | Toda tela é projetada primeiro para 320 px e depois expandida. Nenhuma funcionalidade é exclusiva de desktop. |
| **Zero ambiguidade financeira** | Todo valor exibido tem origem rastreável. Nenhum saldo é calculado "por aproximação".                         |
| **Colaboração explícita**       | Nada é compartilhado por padrão. Todo acesso de terceiro nasce de um convite aceito.                          |
| **Reversibilidade**             | Exclusões relevantes são lógicas (_soft delete_) e auditadas.                                                 |
| **Performance percebida**       | Interface otimista com React Query; o usuário nunca espera a rede para ver o efeito da própria ação.          |

### 1.5 Métricas de sucesso

| Métrica                                               | Meta               |
| ----------------------------------------------------- | ------------------ |
| Tempo para registrar uma despesa (usuário recorrente) | < 15 segundos      |
| Contas compartilhadas ativas por usuário              | ≥ 1 em 40% da base |
| Retenção D30                                          | ≥ 35%              |
| Latência p95 das operações comuns                     | < 300 ms           |
| Cobertura de testes                                   | ≥ 80%              |

---

## 2. Personas e casos de uso

### 2.1 Personas

**P1 — Usuário individual.** Quer saber quanto entra, quanto sai e quanto sobra. Registra movimentações pelo celular, no momento do gasto. Precisa de fricção mínima.

**P2 — Administrador de grupo.** Criou o grupo "Casa". Convida membros, define permissões, revisa lançamentos, encerra o mês. Precisa de controle e visibilidade.

**P3 — Participante de grupo.** Lança apenas o que gastou, consulta o histórico do grupo. Não deve conseguir alterar lançamentos de terceiros nem a configuração do grupo.

**P4 — Planejador.** Usa metas, orçamentos e relatórios comparativos. Consome o dashboard analítico e exporta dados.

### 2.2 Casos de uso principais

| ID    | Caso de uso                                              | Persona |
| ----- | -------------------------------------------------------- | ------- |
| UC-01 | Registrar despesa em conta pessoal                       | P1      |
| UC-02 | Registrar receita recorrente (salário)                   | P1      |
| UC-03 | Transferir valor entre contas próprias                   | P1      |
| UC-04 | Criar grupo financeiro e convidar membros                | P2      |
| UC-05 | Aceitar convite para grupo                               | P3      |
| UC-06 | Lançar despesa em conta compartilhada                    | P3      |
| UC-07 | Revisar e excluir lançamento indevido do grupo           | P2      |
| UC-08 | Comprar parcelado no cartão e acompanhar faturas         | P1      |
| UC-09 | Definir orçamento mensal por categoria e receber alertas | P4      |
| UC-10 | Criar meta financeira e aportar valores                  | P4      |
| UC-11 | Gerar relatório mensal e exportar em PDF/Excel/CSV       | P4      |
| UC-12 | Transferir administração de grupo antes de sair          | P2      |

---

## 3. Escopo

### 3.1 Dentro do escopo

Autenticação e perfil · contas financeiras · categorias · movimentações (receitas e despesas) · recorrências · parcelamentos · transferências · cartões e faturas · contas compartilhadas com convites e permissões · metas · orçamentos com alertas · notificações in-app · relatórios e exportações · dashboard analítico · pesquisa global · auditoria · anexos · etiquetas.

### 3.2 Fora do escopo (v1.x e v2.0)

| Item                                                              | Justificativa                                                                                                 |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Integração Open Finance / sincronização bancária automática       | Exige homologação regulatória e certificação. Previsto para v3.0.                                             |
| Aplicativo mobile nativo (iOS/Android)                            | A entrega é web responsiva. PWA avaliado na v2.1.                                                             |
| Multi-moeda com conversão em tempo real                           | A moeda é atributo do perfil e da conta, mas **não há conversão automática** entre moedas na v1.x. Ver RN-32. |
| Split automático de despesas com cálculo de acerto entre membros  | O grupo tem saldo consolidado; o rateio individual ("quem deve a quem") entra na v2.1.                        |
| Emissão de boletos, PIX ou qualquer movimentação de dinheiro real | O sistema é um **registro contábil**, não uma instituição de pagamento.                                       |
| Análise financeira por IA e recomendações                         | Previsto para v2.0, sujeito a reavaliação de escopo.                                                          |

> **Nota de escopo relevante:** o PFM registra e organiza dados financeiros informados pelo usuário. Ele não movimenta dinheiro, não se conecta a bancos e não constitui serviço financeiro regulado.

---

## 4. Glossário e dicionário de domínio

O código, o banco e a API usam **pt-BR**. Esta tabela é o dicionário canônico — qualquer nome novo deve ser acrescentado aqui antes de ser usado no código.

| Termo (pt-BR)       | Entidade / Classe        | Tabela                   | Termo em inglês (referência) | Definição                                                                         |
| ------------------- | ------------------------ | ------------------------ | ---------------------------- | --------------------------------------------------------------------------------- |
| Usuário             | `Usuario`                | `usuarios`               | User                         | Titular de uma conta de acesso ao sistema.                                        |
| Perfil              | `Perfil`                 | `perfis`                 | Profile                      | Preferências e dados de exibição do usuário (1:1).                                |
| Conta               | `Conta`                  | `contas`                 | Account                      | Reservatório de saldo pessoal (carteira, banco, poupança).                        |
| Conta compartilhada | `ContaCompartilhada`     | `contas_compartilhadas`  | SharedAccount                | Grupo financeiro com múltiplos membros e saldo próprio.                           |
| Membro              | `MembroCompartilhado`    | `membros_compartilhados` | SharedMember                 | Vínculo entre usuário e conta compartilhada, com papel.                           |
| Categoria           | `Categoria`              | `categorias`             | Category                     | Classificação de uma movimentação (Mercado, Salário).                             |
| Movimentação        | `Movimentacao`           | `movimentacoes`          | Transaction                  | Registro de receita, despesa ou transferência.                                    |
| Compra parcelada    | `CompraParcelada`        | `compras_parceladas`     | Installment purchase         | Agregado de uma compra dividida em N parcelas.                                    |
| Parcela             | _(é uma `Movimentacao`)_ | `movimentacoes`          | Installment                  | Fração de uma compra parcelada — cada parcela é uma movimentação própria (RN-22). |
| Cartão              | `Cartao`                 | `cartoes`                | Card                         | Cartão de crédito com limite, fechamento e vencimento.                            |
| Fatura              | `Fatura`                 | `faturas`                | Invoice                      | Ciclo mensal de um cartão, agrupando parcelas e despesas.                         |
| Orçamento           | `Orcamento`              | `orcamentos`             | Budget                       | Limite planejado de gasto por categoria e período.                                |
| Meta                | `Meta`                   | `metas`                  | Goal                         | Objetivo financeiro com valor-alvo e prazo.                                       |
| Notificação         | `Notificacao`            | `notificacoes`           | Notification                 | Aviso in-app direcionado a um usuário.                                            |
| Convite             | `Convite`                | `convites`               | Invite                       | Solicitação de ingresso em conta compartilhada.                                   |
| Anexo               | `Anexo`                  | `anexos`                 | Attachment                   | Arquivo vinculado a uma movimentação (comprovante).                               |
| Etiqueta            | `Etiqueta`               | `etiquetas`              | Tag                          | Marcador livre e transversal às categorias.                                       |
| Log de auditoria    | `LogAuditoria`           | `logs_auditoria`         | AuditLog                     | Registro imutável de ação sensível.                                               |
| Token de renovação  | `TokenRenovacao`         | `tokens_renovacao`       | RefreshToken                 | Credencial de longa duração para renovar o access token.                          |
| Saldo atual         | —                        | —                        | Current balance              | Soma das movimentações **efetivadas** até hoje.                                   |
| Saldo previsto      | —                        | —                        | Forecast balance             | Saldo atual + movimentações **pendentes** até o fim do período.                   |
| Efetivada           | —                        | —                        | Settled / paid               | Movimentação cujo dinheiro já saiu ou entrou de fato.                             |
| Pendente            | —                        | —                        | Pending                      | Movimentação futura ou não paga, ainda sem efeito no saldo atual.                 |
| Recorrência         | `Recorrencia` (embutida) | —                        | Recurrence                   | Regra de repetição automática de uma movimentação.                                |

---

## 5. Requisitos funcionais

Notação: **RF-XX**. Prioridade **MUST** (MVP) / **SHOULD** (v1.1–1.2) / **COULD** (v2.0).

### 5.1 Autenticação e conta de acesso

| ID    | Requisito                                                                                                    | Prio   | Milestone |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------ | --------- |
| RF-01 | O sistema deve permitir cadastro com nome, e-mail e senha.                                                   | MUST   | M1        |
| RF-02 | O sistema deve enviar e-mail de verificação e bloquear o acesso a recursos até a confirmação.                | MUST   | M1        |
| RF-03 | O sistema deve autenticar por e-mail e senha, retornando _access token_ (15 min) e _refresh token_ (7 dias). | MUST   | M1        |
| RF-04 | O sistema deve permitir renovar o access token via refresh token, com rotação do refresh token.              | MUST   | M1        |
| RF-05 | O sistema deve permitir logout, revogando o refresh token da sessão.                                         | MUST   | M1        |
| RF-06 | O sistema deve permitir logout global, revogando todos os refresh tokens do usuário.                         | SHOULD | M1        |
| RF-07 | O sistema deve permitir recuperação de senha por e-mail com token de uso único válido por 1 hora.            | MUST   | M1        |
| RF-08 | O sistema deve permitir alteração de senha por usuário autenticado, exigindo a senha atual.                  | MUST   | M1        |
| RF-09 | O sistema deve permitir exclusão da conta do usuário, com anonimização dos dados pessoais.                   | SHOULD | M11       |

### 5.2 Perfil

| ID    | Requisito                                                                                        | Prio | Milestone |
| ----- | ------------------------------------------------------------------------------------------------ | ---- | --------- |
| RF-10 | O usuário deve poder editar nome, foto, moeda padrão, idioma, tema e _timezone_.                 | MUST | M1        |
| RF-11 | O sistema deve aceitar upload de foto de perfil (JPEG/PNG/WebP, máx. 2 MB), gerando _thumbnail_. | MUST | M1        |
| RF-12 | O sistema deve aplicar o tema (claro/escuro/sistema) escolhido pelo usuário em todas as telas.   | MUST | M1        |
| RF-13 | O sistema deve interpretar e exibir datas conforme o _timezone_ do perfil.                       | MUST | M1        |

### 5.3 Contas financeiras

| ID    | Requisito                                                                                                              | Prio  | Milestone |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ----- | --------- |
| RF-14 | O usuário deve poder criar, editar, arquivar e excluir contas financeiras.                                             | MUST  | M2        |
| RF-15 | Cada conta deve ter nome, tipo, instituição, cor, ícone, saldo inicial e indicador de inclusão no saldo total.         | MUST  | M2        |
| RF-16 | O sistema deve calcular e exibir o saldo atual de cada conta a partir do saldo inicial e das movimentações efetivadas. | MUST  | M2        |
| RF-17 | O sistema deve impedir a exclusão de conta com movimentações, oferecendo arquivamento.                                 | MUST  | M2        |
| RF-18 | O usuário deve poder reordenar as contas na exibição.                                                                  | COULD | M2        |

### 5.4 Categorias

| ID    | Requisito                                                                                          | Prio   | Milestone |
| ----- | -------------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-19 | O sistema deve criar um conjunto padrão de categorias no cadastro do usuário.                      | MUST   | M2        |
| RF-20 | O usuário deve poder criar, editar e excluir categorias próprias, com nome, tipo, cor e ícone.     | MUST   | M2        |
| RF-21 | O sistema deve suportar subcategorias em um nível de profundidade.                                 | SHOULD | M2        |
| RF-22 | O sistema deve impedir a exclusão de categoria em uso, exigindo recategorização das movimentações. | MUST   | M2        |

### 5.5 Movimentações

| ID    | Requisito                                                                                                      | Prio   | Milestone |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-23 | O usuário deve poder cadastrar receita informando valor, data, categoria, conta, descrição e observação.       | MUST   | M3        |
| RF-24 | O usuário deve poder cadastrar despesa com os mesmos campos, mais situação de pagamento.                       | MUST   | M3        |
| RF-25 | O usuário deve poder editar e excluir movimentações.                                                           | MUST   | M3        |
| RF-26 | O usuário deve poder duplicar uma movimentação existente.                                                      | MUST   | M3        |
| RF-27 | O sistema deve suportar recorrência (diária, semanal, mensal, anual) com data-limite ou número de ocorrências. | MUST   | M3        |
| RF-28 | O sistema deve suportar parcelamento, gerando N parcelas com valores e vencimentos calculados.                 | SHOULD | M8        |
| RF-29 | A despesa deve assumir uma das situações: `PENDENTE`, `PAGA`, `PAGA_PARCIALMENTE`, `ATRASADA`, `CANCELADA`.    | MUST   | M3        |
| RF-30 | O sistema deve marcar automaticamente como `ATRASADA` a despesa pendente com vencimento anterior a hoje.       | MUST   | M3        |
| RF-31 | O usuário deve poder registrar pagamento total ou parcial de uma despesa.                                      | MUST   | M3        |
| RF-32 | O usuário deve poder anexar arquivos (PDF/JPEG/PNG, máx. 5 MB, até 5 por movimentação).                        | SHOULD | M3        |
| RF-33 | O usuário deve poder aplicar etiquetas livres às movimentações.                                                | SHOULD | M3        |
| RF-34 | O sistema deve permitir filtrar movimentações por período, tipo, conta, categoria, etiqueta, situação e texto. | MUST   | M3        |
| RF-35 | O sistema deve paginar a listagem de movimentações (padrão 20, máx. 100 por página).                           | MUST   | M3        |

### 5.6 Transferências

| ID    | Requisito                                                                                                                  | Prio   | Milestone |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-36 | O usuário deve poder transferir valor entre duas contas próprias.                                                          | MUST   | M3        |
| RF-37 | O usuário deve poder transferir entre conta pessoal e conta compartilhada da qual participa.                               | SHOULD | M6        |
| RF-38 | A transferência deve gerar um par de lançamentos vinculados (saída e entrada) e não deve afetar totais de receita/despesa. | MUST   | M3        |
| RF-39 | A exclusão de uma transferência deve remover ambos os lançamentos atomicamente.                                            | MUST   | M3        |

### 5.7 Dashboard

| ID    | Requisito                                                                               | Prio   | Milestone |
| ----- | --------------------------------------------------------------------------------------- | ------ | --------- |
| RF-40 | O dashboard deve exibir saldo atual, receitas do mês, despesas do mês e saldo previsto. | MUST   | M4        |
| RF-41 | O dashboard deve exibir gráfico de fluxo de caixa dos últimos 12 meses.                 | MUST   | M4        |
| RF-42 | O dashboard deve exibir gráfico de despesas por categoria no período.                   | MUST   | M4        |
| RF-43 | O dashboard deve listar as 10 movimentações mais recentes.                              | MUST   | M4        |
| RF-44 | O dashboard deve exibir cartões-resumo das contas compartilhadas do usuário.            | SHOULD | M6        |
| RF-45 | O dashboard deve exibir progresso das metas ativas.                                     | SHOULD | M7        |
| RF-46 | O dashboard deve exibir alertas de orçamento e vencimentos próximos.                    | SHOULD | M9        |
| RF-47 | O usuário deve poder selecionar o período de referência do dashboard.                   | MUST   | M4        |

### 5.8 Cartões e faturas

| ID    | Requisito                                                                                                 | Prio   | Milestone |
| ----- | --------------------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-48 | O usuário deve poder cadastrar cartões com nome, bandeira, limite, dia de fechamento e dia de vencimento. | SHOULD | M8        |
| RF-49 | O sistema deve alocar automaticamente cada despesa de cartão na fatura correspondente ao seu ciclo.       | SHOULD | M8        |
| RF-50 | O sistema deve calcular limite utilizado e limite disponível por cartão.                                  | SHOULD | M8        |
| RF-51 | O usuário deve poder registrar o pagamento de uma fatura, debitando a conta escolhida.                    | SHOULD | M8        |
| RF-52 | O usuário deve poder consultar o histórico de faturas fechadas e pagas.                                   | SHOULD | M8        |

### 5.9 Contas compartilhadas

| ID    | Requisito                                                                                               | Prio   | Milestone |
| ----- | ------------------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-53 | O usuário deve poder criar conta compartilhada com nome, descrição e imagem, tornando-se administrador. | SHOULD | M6        |
| RF-54 | O administrador deve poder convidar usuários por e-mail.                                                | SHOULD | M6        |
| RF-55 | O convidado deve poder aceitar ou recusar o convite; o administrador deve poder cancelá-lo.             | SHOULD | M6        |
| RF-56 | O administrador deve poder remover membros e alterar seus papéis.                                       | SHOULD | M6        |
| RF-57 | O administrador deve poder transferir a administração a outro membro.                                   | SHOULD | M6        |
| RF-58 | A conta compartilhada deve ter saldo, categorias e movimentações próprias.                              | SHOULD | M6        |
| RF-59 | O sistema deve exibir o autor de cada movimentação da conta compartilhada.                              | SHOULD | M6        |
| RF-60 | O sistema deve aplicar as permissões de papel a toda operação sobre conta compartilhada.                | SHOULD | M6        |

### 5.10 Metas financeiras

| ID    | Requisito                                                                                     | Prio   | Milestone |
| ----- | --------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-61 | O usuário deve poder criar metas com nome, valor-alvo, prazo, cor e ícone.                    | SHOULD | M7        |
| RF-62 | O usuário deve poder registrar aportes e resgates em uma meta.                                | SHOULD | M7        |
| RF-63 | O sistema deve exibir percentual de progresso e valor mensal necessário para cumprir o prazo. | SHOULD | M7        |
| RF-64 | O sistema deve marcar a meta como concluída ao atingir o valor-alvo e notificar o usuário.    | SHOULD | M7        |

### 5.11 Orçamentos

| ID    | Requisito                                                                                              | Prio   | Milestone |
| ----- | ------------------------------------------------------------------------------------------------------ | ------ | --------- |
| RF-65 | O usuário deve poder definir orçamento mensal por categoria.                                           | SHOULD | M9        |
| RF-66 | O sistema deve calcular o consumo do orçamento a partir das despesas do período.                       | SHOULD | M9        |
| RF-67 | O sistema deve gerar alerta ao atingir 80%, 90% e 100% do orçamento, uma vez por limiar e por período. | SHOULD | M9        |
| RF-68 | O usuário deve poder replicar os orçamentos de um mês para o mês seguinte.                             | COULD  | M9        |

### 5.12 Notificações

| ID    | Requisito                                                                                                      | Prio   | Milestone |
| ----- | -------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-69 | O sistema deve notificar receitas previstas, contas a vencer, faturas de cartão, metas, convites e orçamentos. | SHOULD | M9        |
| RF-70 | O usuário deve poder marcar notificações como lidas, individual ou coletivamente.                              | SHOULD | M9        |
| RF-71 | O usuário deve poder configurar quais tipos de notificação deseja receber.                                     | COULD  | M9        |

### 5.13 Relatórios e exportações

| ID    | Requisito                                                                    | Prio   | Milestone |
| ----- | ---------------------------------------------------------------------------- | ------ | --------- |
| RF-72 | O sistema deve gerar relatório mensal e anual de receitas, despesas e saldo. | MUST   | M4        |
| RF-73 | O sistema deve gerar relatório por categoria e por conta.                    | MUST   | M4        |
| RF-74 | O sistema deve gerar relatório de fluxo de caixa com evolução do saldo.      | SHOULD | M4        |
| RF-75 | O sistema deve gerar relatório comparativo entre dois períodos.              | COULD  | M10       |
| RF-76 | O sistema deve exportar relatórios em PDF, XLSX e CSV.                       | COULD  | M10       |

### 5.14 Dashboard analítico

| ID    | Requisito                                                                                      | Prio  | Milestone |
| ----- | ---------------------------------------------------------------------------------------------- | ----- | --------- |
| RF-77 | O sistema deve oferecer gráficos de pizza, linha, área, barra e _heatmap_.                     | COULD | M10       |
| RF-78 | O sistema deve permitir comparativo de 12 meses por categoria, conta e usuário.                | COULD | M10       |
| RF-79 | O sistema deve exibir indicadores derivados: média de gastos, maior despesa, taxa de poupança. | COULD | M10       |

### 5.15 Pesquisa global e auditoria

| ID    | Requisito                                                                                                         | Prio   | Milestone |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------ | --------- |
| RF-80 | O sistema deve oferecer pesquisa global sobre movimentações, categorias, contas, grupos e usuários.               | COULD  | M11       |
| RF-81 | A pesquisa deve respeitar o escopo de acesso do usuário autenticado.                                              | COULD  | M11       |
| RF-82 | O sistema deve registrar em log de auditoria toda ação sensível, com autor, entidade, ação, estado anterior e IP. | SHOULD | M11       |
| RF-83 | O administrador de grupo deve poder consultar o log de auditoria do seu grupo.                                    | COULD  | M11       |

---

## 6. Regras de negócio

Notação **RN-XX**. Estas regras são obrigatórias e devem ser cobertas por testes automatizados.

### 6.1 Saldos

- **RN-01** — O saldo atual de uma conta é `saldoInicial + Σ(receitas efetivadas) − Σ(despesas efetivadas) + Σ(transferências recebidas) − Σ(transferências enviadas)`.
- **RN-02** — Movimentações com situação `PENDENTE`, `ATRASADA` ou `CANCELADA` **não** afetam o saldo atual.
- **RN-03** — Despesa `PAGA_PARCIALMENTE` afeta o saldo apenas pelo `valorPago`.
- **RN-04** — O saldo previsto de um período é o saldo atual acrescido de todas as movimentações `PENDENTE` e `ATRASADA` com vencimento dentro do período.
- **RN-05** — O saldo total do usuário considera apenas contas com `incluirNoSaldoTotal = true` e não arquivadas.
- **RN-06** — Saldos são sempre recalculados a partir das movimentações. É proibido persistir saldo como coluna mutável de escrita direta; qualquer materialização deve ser derivada e reconstruível.
- **RN-07** — Valores monetários são armazenados em `Decimal(14,2)` e nunca em ponto flutuante. Cálculos usam `Prisma.Decimal`.
- **RN-08** — Valor de movimentação deve ser estritamente maior que zero. O sinal é determinado pelo `tipo`, nunca pelo valor.

### 6.2 Movimentações

- **RN-09** — Toda movimentação pertence a exatamente uma conta pessoal **ou** uma conta compartilhada, nunca a ambas e nunca a nenhuma.
- **RN-10** — A categoria de uma movimentação deve ter `tipo` compatível: categoria de `RECEITA` só em receita; de `DESPESA` só em despesa. Categorias `AMBOS` aceitam os dois.
- **RN-11** — A categoria deve pertencer ao mesmo escopo da movimentação (mesmo usuário ou mesma conta compartilhada), ou ser categoria global do sistema.
- **RN-12** — Data de competência (`dataCompetencia`) e data de vencimento/efetivação (`dataVencimento`, `dataEfetivacao`) são campos distintos. Relatórios usam competência; saldo usa efetivação.
- **RN-13** — Movimentação não pode ser lançada com data de competência superior a 10 anos no futuro nem inferior a 20 anos no passado.
- **RN-14** — Ao marcar uma despesa como paga, `dataEfetivacao` recebe a data informada (padrão: hoje) e `valorPago` recebe o valor total, salvo pagamento parcial.
- **RN-15** — Editar o valor de uma movimentação já efetivada exige recálculo do saldo da conta e gera log de auditoria.
- **RN-16** — Exclusão de movimentação é lógica (`excluidoEm`). Movimentações excluídas não entram em nenhum cálculo nem listagem padrão.

### 6.3 Recorrências e parcelamentos

- **RN-17** — Uma movimentação recorrente é representada por um registro-mãe (`recorrenciaId = null`, `ehModeloRecorrencia = true`) e ocorrências filhas geradas materialmente.
- **RN-18** — As ocorrências são geradas com antecedência de 12 meses e reabastecidas por rotina diária.
- **RN-19** — Editar a movimentação-mãe oferece três escopos: apenas esta ocorrência, esta e as futuras, todas. O escopo escolhido é obrigatório na requisição.
- **RN-20** — Excluir a movimentação-mãe exclui as ocorrências futuras não efetivadas e preserva as já efetivadas.
- **RN-21** — Em parcelamento de N parcelas, `valorParcela = arredondar(valorTotal / N, 2)`. A diferença de arredondamento é somada à **última** parcela, garantindo `Σ parcelas = valorTotal` exatamente.
- **RN-22** — Cada parcela é uma movimentação própria, vinculada à compra-mãe, com rótulo `x/N`.

### 6.4 Transferências

- **RN-23** — Transferência gera duas movimentações do tipo `TRANSFERENCIA` vinculadas pelo mesmo `transferenciaId`: uma de saída na conta origem, uma de entrada na conta destino.
- **RN-24** — Conta origem e conta destino devem ser diferentes.
- **RN-25** — Transferências são excluídas de somatórios de receita e despesa em todos os relatórios e indicadores.
- **RN-26** — Ambos os lados da transferência são criados e excluídos na mesma transação de banco de dados.
- **RN-27** — Transferência envolvendo conta compartilhada exige que o usuário seja membro ativo dela.

### 6.5 Contas compartilhadas e permissões

- **RN-28** — Toda conta compartilhada tem, em todo momento, **exatamente um** administrador com papel `ADMINISTRADOR`.
- **RN-29** — O administrador não pode sair do grupo nem ser removido sem antes transferir a administração.
- **RN-30** — Matriz de permissões:

| Ação                                 | Administrador |   Participante    | Observador |
| ------------------------------------ | :-----------: | :---------------: | :--------: |
| Visualizar movimentações e histórico |      ✅       |        ✅         |     ✅     |
| Criar movimentação                   |      ✅       |        ✅         |     ❌     |
| Editar movimentação própria          |      ✅       | ✅ (configurável) |     ❌     |
| Editar movimentação de terceiro      |      ✅       |        ❌         |     ❌     |
| Excluir movimentação própria         |      ✅       | ✅ (configurável) |     ❌     |
| Excluir movimentação de terceiro     |      ✅       |        ❌         |     ❌     |
| Gerenciar categorias do grupo        |      ✅       |        ❌         |     ❌     |
| Convidar usuários                    |      ✅       |        ❌         |     ❌     |
| Remover membros                      |      ✅       |        ❌         |     ❌     |
| Alterar papéis                       |      ✅       |        ❌         |     ❌     |
| Editar dados do grupo                |      ✅       |        ❌         |     ❌     |
| Excluir o grupo                      |      ✅       |        ❌         |     ❌     |
| Consultar auditoria do grupo         |      ✅       |        ❌         |     ❌     |

- **RN-31** — A permissão de o participante editar/excluir os próprios lançamentos é configurável por grupo (`permiteParticipanteEditarProprias`, padrão `true`).
- **RN-32** — Todas as contas de um grupo compartilhado operam na moeda definida no grupo. Movimentações em moeda divergente são rejeitadas — não há conversão automática na v1.x.
- **RN-33** — Excluir um grupo é operação lógica, exige confirmação explícita e preserva o histórico para auditoria.
- **RN-34** — Ao remover um membro, suas movimentações permanecem no grupo, atribuídas ao usuário original e marcadas como de "ex-membro".

### 6.6 Convites

- **RN-35** — Convite tem validade de 7 dias; expirado, muda para `EXPIRADO` e não pode ser aceito.
- **RN-36** — Não pode haver dois convites `PENDENTE` para o mesmo e-mail no mesmo grupo.
- **RN-37** — Convite para e-mail sem cadastro é permitido; ao se cadastrar, o usuário encontra o convite pendente.
- **RN-38** — Usuário já membro do grupo não pode ser convidado novamente.
- **RN-39** — O aceite do convite cria o membro com o papel definido no convite e marca o convite como `ACEITO`.

### 6.7 Cartões e faturas

- **RN-40** — A fatura de uma despesa de cartão é determinada pela `dataCompetencia` e pelo `diaFechamento`: compras a partir do dia de fechamento entram na fatura do ciclo seguinte.
- **RN-41** — Quando `diaFechamento` ou `diaVencimento` excede o número de dias do mês, usa-se o último dia do mês.
- **RN-42** — `limiteDisponivel = limiteTotal − Σ(parcelas em faturas abertas e futuras não pagas)`.
- **RN-43** — Lançamento que ultrapassa o limite disponível gera aviso, mas **não** é bloqueado.
- **RN-44** — Fatura tem situação `ABERTA`, `FECHADA`, `PAGA` ou `PAGA_PARCIALMENTE`. O fechamento é automático na data de fechamento.
- **RN-45** — O pagamento de fatura gera uma movimentação de despesa na conta pagadora e não duplica as despesas já lançadas no cartão.

### 6.8 Metas e orçamentos

- **RN-46** — O progresso da meta é `valorAcumulado / valorAlvo`, limitado a 100% na exibição.
- **RN-47** — O aporte em meta é uma transferência da conta de origem para a meta e reduz o saldo da conta.
- **RN-48** — Orçamento é único por combinação de categoria, escopo e período (`ano`+`mes`).
- **RN-49** — O consumo do orçamento considera despesas com `dataCompetencia` no período, excluindo transferências e canceladas.
- **RN-50** — Cada limiar de alerta (80%, 90%, 100%) dispara no máximo uma notificação por orçamento por período.

### 6.9 Segurança e integridade

- **RN-51** — Todo recurso é acessível apenas pelo seu proprietário ou por membro autorizado do grupo. A verificação ocorre na camada de serviço, nunca apenas no frontend.
- **RN-52** — Senhas são armazenadas com bcrypt, custo 12. A senha em texto claro nunca é registrada em log.
- **RN-53** — Refresh tokens são persistidos com _hash_, associados a dispositivo e IP, e revogados em rotação.
- **RN-54** — Tentativas de login falhas são limitadas a 5 por e-mail em 15 minutos.
- **RN-55** — Toda operação que altera saldo ocorre dentro de uma transação de banco de dados.
- **RN-56** — Respostas de erro nunca expõem _stack trace_, nome de tabela ou detalhe de infraestrutura em produção.

---

## 7. Requisitos não funcionais

### 7.1 Desempenho

| ID     | Requisito                                                                            | Métrica        |
| ------ | ------------------------------------------------------------------------------------ | -------------- |
| RNF-01 | Latência de operações CRUD comuns                                                    | p95 < 300 ms   |
| RNF-02 | Latência de relatórios agregados                                                     | p95 < 1 200 ms |
| RNF-03 | _First Contentful Paint_ do frontend em 3G rápido                                    | < 2 s          |
| RNF-04 | _Bundle_ inicial do frontend (gzip)                                                  | < 250 KB       |
| RNF-05 | Toda listagem é paginada; nenhuma consulta retorna coleção ilimitada                 | obrigatório    |
| RNF-06 | Consultas de agregação usam índices; nenhuma varredura sequencial em `movimentacoes` | obrigatório    |

### 7.2 Escalabilidade e disponibilidade

| ID     | Requisito                                                                           |
| ------ | ----------------------------------------------------------------------------------- |
| RNF-07 | A API é _stateless_; nenhum estado de sessão em memória do processo.                |
| RNF-08 | A aplicação escala horizontalmente por réplicas atrás do Nginx.                     |
| RNF-09 | PM2 em modo _cluster_ utiliza todos os núcleos disponíveis da VPS.                  |
| RNF-10 | Disponibilidade-alvo de 99,5% mensal.                                               |
| RNF-11 | Deploy sem _downtime_ perceptível (_reload_ controlado + _health check_).           |
| RNF-12 | _Backup_ diário do PostgreSQL com retenção de 7 dias e teste mensal de restauração. |

### 7.3 Manutenibilidade

| ID     | Requisito                                                                       |
| ------ | ------------------------------------------------------------------------------- |
| RNF-13 | Cobertura de testes ≥ 80% em _statements_ e ≥ 75% em _branches_, medida em CI.  |
| RNF-14 | ESLint e Prettier obrigatórios; _build_ falha com erro de lint.                 |
| RNF-15 | TypeScript em modo `strict`; `any` explícito exige justificativa em comentário. |
| RNF-16 | Nenhuma regra de negócio em _controller_ ou componente React.                   |
| RNF-17 | Toda entrada externa validada por _schema_ Zod na borda.                        |
| RNF-18 | Nomenclatura em pt-BR conforme o dicionário de domínio (§4).                    |

### 7.4 Observabilidade

| ID     | Requisito                                                                              |
| ------ | -------------------------------------------------------------------------------------- |
| RNF-19 | Logs estruturados em JSON (Pino) com `requestId` correlacionado.                       |
| RNF-20 | Endpoints `/saude` (_liveness_) e `/saude/prontidao` (_readiness_, verifica o banco).  |
| RNF-21 | Métricas de requisição (contagem, latência, taxa de erro) expostas para coleta futura. |
| RNF-22 | Erros não tratados registrados com contexto completo, sem dados pessoais nem segredos. |

### 7.5 Documentação e i18n

| ID     | Requisito                                                                                      |
| ------ | ---------------------------------------------------------------------------------------------- |
| RNF-23 | Especificação OpenAPI 3.1 gerada e servida em `/api/docs`.                                     |
| RNF-24 | Textos de interface centralizados em arquivos de tradução; `pt-BR` na v1.0, `en-US` preparado. |
| RNF-25 | Formatação de moeda, data e número conforme locale e timezone do perfil.                       |

---

## 8. Design System e responsividade

### 8.1 Princípios

Mobile First · componentização · alto contraste · tema claro e escuro · acessibilidade WCAG 2.1 AA.

### 8.2 Paleta semântica

Tokens definidos como variáveis CSS e expostos no Tailwind. Cores nomeadas por **função**, nunca por matiz, no código de componente.

| Token        | Função                                 | Claro     | Escuro    |
| ------------ | -------------------------------------- | --------- | --------- |
| `primaria`   | Ações principais, links, foco          | `#2563EB` | `#3B82F6` |
| `sucesso`    | Receitas, metas atingidas, confirmação | `#16A34A` | `#22C55E` |
| `perigo`     | Despesas, exclusão, erro               | `#DC2626` | `#EF4444` |
| `atencao`    | Vencimentos, orçamento em risco        | `#EA580C` | `#F97316` |
| `informacao` | Transferências, avisos neutros         | `#7C3AED` | `#8B5CF6` |
| `fundo`      | Fundo da página                        | `#FFFFFF` | `#0F172A` |
| `superficie` | Cartões, painéis                       | `#F8FAFC` | `#1E293B` |
| `borda`      | Divisores e contornos                  | `#E2E8F0` | `#334155` |
| `texto`      | Texto principal                        | `#0F172A` | `#F1F5F9` |
| `textoSuave` | Texto secundário                       | `#64748B` | `#94A3B8` |

**Regra semântica de sinal financeiro:** receita usa `sucesso`, despesa usa `perigo`, transferência usa `informacao`. A cor **nunca** é o único portador dessa informação — sempre acompanha sinal (`+`/`−`) e rótulo textual.

### 8.3 Escala e tipografia

- Espaçamento na escala de 4 px (`4, 8, 12, 16, 24, 32, 48, 64`).
- Raio de borda: `sm 4px`, `md 8px`, `lg 12px`, `full`.
- Fonte: _Inter_ (interface) e _JetBrains Mono_ (valores tabulares).
- Valores monetários usam variante tabular (`font-variant-numeric: tabular-nums`) para alinhamento em colunas.

### 8.4 Breakpoints

| Faixa    | Largura      | Tailwind | Comportamento                                           |
| -------- | ------------ | -------- | ------------------------------------------------------- |
| Mobile   | 320–767 px   | _base_   | Coluna única, navegação inferior, tabelas viram cartões |
| Tablet   | 768–1023 px  | `md`     | Duas colunas, navegação lateral recolhível              |
| Notebook | 1024–1439 px | `lg`     | Navegação lateral fixa, grade de 3 colunas              |
| Desktop  | 1440 px +    | `xl`     | Grade de 4 colunas, largura máxima de conteúdo 1 440 px |

Todos os componentes devem funcionar em qualquer resolução ≥ 320 px, sem _scroll_ horizontal na página.

### 8.5 Estados obrigatórios de componente

Toda tela que carrega dados implementa quatro estados: **carregando** (_skeleton_, nunca _spinner_ de página inteira), **vazio** (mensagem + ação primária), **erro** (mensagem + repetir) e **conteúdo**.

---

## 9. Acessibilidade

| ID      | Requisito                                                                          |
| ------- | ---------------------------------------------------------------------------------- |
| A11Y-01 | Contraste mínimo 4.5:1 para texto normal e 3:1 para texto grande, nos dois temas.  |
| A11Y-02 | Toda funcionalidade operável por teclado, com ordem de foco lógica e foco visível. |
| A11Y-03 | Todo campo de formulário com `label` associada; erros anunciados por `aria-live`.  |
| A11Y-04 | Gráficos acompanhados de tabela ou resumo textual equivalente.                     |
| A11Y-05 | Ícones decorativos com `aria-hidden`; ícones funcionais com rótulo acessível.      |
| A11Y-06 | Modais com foco preso, retorno de foco à origem e fechamento por `Esc`.            |
| A11Y-07 | Respeito a `prefers-reduced-motion` nas animações do Framer Motion.                |
| A11Y-08 | Área mínima de toque de 44 × 44 px em mobile.                                      |

---

## 10. Segurança e privacidade

### 10.1 Controles técnicos

JWT com _access_ e _refresh token_ · rotação de refresh token · _rate limit_ global e por rota sensível · Helmet · CORS restrito por origem · bcrypt custo 12 · validação Zod em toda borda · Prisma com _queries_ parametrizadas (proteção contra SQL Injection) · _escaping_ automático do React e sanitização de HTML (proteção contra XSS) · tokens em cabeçalho `Authorization` com refresh token em cookie `httpOnly` + `SameSite=Strict` (proteção contra CSRF) · logs estruturados · auditoria de ações sensíveis.

### 10.2 Dados pessoais

| Categoria     | Dados                         | Tratamento                                                     |
| ------------- | ----------------------------- | -------------------------------------------------------------- |
| Identificação | nome, e-mail, foto            | Necessários ao serviço. Anonimizados na exclusão da conta.     |
| Autenticação  | _hash_ de senha, tokens       | Nunca retornados por nenhuma API. Nunca em log.                |
| Financeiros   | movimentações, saldos, anexos | Acessíveis apenas ao titular e a membros autorizados do grupo. |
| Técnicos      | IP, _user agent_, logs        | Retenção de 90 dias.                                           |

### 10.3 Diretrizes de conformidade (LGPD)

- Direito de acesso: exportação completa dos dados do usuário em formato legível.
- Direito de eliminação: exclusão de conta anonimiza dados pessoais e preserva registros financeiros necessários à integridade dos grupos (RN-34).
- Minimização: nenhum dado é coletado sem requisito funcional correspondente nesta especificação.
- Segredos e credenciais vivem exclusivamente em variáveis de ambiente e _GitHub Secrets_, nunca no repositório.

---

## 11. Matriz de rastreabilidade

| Milestone                                   | Requisitos cobertos                        | Documento de issues                                                                        |
| ------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------ |
| M0 — Fundação                               | RNF-13 a RNF-18, RNF-23                    | [07-ISSUES.md#m0](07-ISSUES.md#milestone-0--fundação-e-infraestrutura)                     |
| M1 — Autenticação e Perfil                  | RF-01 a RF-13, RN-52 a RN-54               | [07-ISSUES.md#m1](07-ISSUES.md#milestone-1--autenticação-e-perfil)                         |
| M2 — Contas e Categorias                    | RF-14 a RF-22, RN-01 a RN-08               | [07-ISSUES.md#m2](07-ISSUES.md#milestone-2--contas-financeiras-e-categorias)               |
| M3 — Movimentações                          | RF-23 a RF-39, RN-09 a RN-27               | [07-ISSUES.md#m3](07-ISSUES.md#milestone-3--movimentações-e-transferências)                |
| M4 — Dashboard e Relatórios                 | RF-40 a RF-43, RF-47, RF-72 a RF-74        | [07-ISSUES.md#m4](07-ISSUES.md#milestone-4--dashboard-e-relatórios)                        |
| M5 — CI/CD e Produção                       | RNF-07 a RNF-12, RNF-19 a RNF-22           | [07-ISSUES.md#m5](07-ISSUES.md#milestone-5--cicd-e-deploy-em-produção)                     |
| M6 — Contas Compartilhadas                  | RF-37, RF-44, RF-53 a RF-60, RN-28 a RN-39 | [07-ISSUES.md#m6](07-ISSUES.md#milestone-6--contas-compartilhadas)                         |
| M7 — Metas                                  | RF-45, RF-61 a RF-64, RN-46 a RN-47        | [07-ISSUES.md#m7](07-ISSUES.md#milestone-7--metas-financeiras)                             |
| M8 — Cartões e Parcelamentos                | RF-28, RF-48 a RF-52, RN-21, RN-40 a RN-45 | [07-ISSUES.md#m8](07-ISSUES.md#milestone-8--cartões-faturas-e-parcelamentos)               |
| M9 — Orçamentos e Notificações              | RF-46, RF-65 a RF-71, RN-48 a RN-50        | [07-ISSUES.md#m9](07-ISSUES.md#milestone-9--orçamentos-e-notificações)                     |
| M10 — Analítico e Exportações               | RF-75 a RF-79                              | [07-ISSUES.md#m10](07-ISSUES.md#milestone-10--dashboard-analítico-e-exportações)           |
| M11 — Pesquisa, Auditoria e Observabilidade | RF-09, RF-80 a RF-83, RNF-19 a RNF-22      | [07-ISSUES.md#m11](07-ISSUES.md#milestone-11--pesquisa-global-auditoria-e-observabilidade) |

---

## 12. Objetivo final

Construir uma plataforma financeira moderna, escalável e intuitiva, capaz de atender usuários individuais e grupos — casais, famílias, empresas e repúblicas — oferecendo controle financeiro completo com foco em colaboração, segurança, alta performance e excelente experiência de uso em qualquer dispositivo.

---

**Documentos relacionados:** [02-ARCHITECTURE.md](02-ARCHITECTURE.md) · [03-DATABASE.md](03-DATABASE.md) · [04-API.md](04-API.md) · [06-MILESTONES.md](06-MILESTONES.md)
