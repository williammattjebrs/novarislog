
# Reestruturação em 5 Módulos

Vamos reorganizar o hub logístico substituindo a estrutura atual (Operação/Frota/Armazém/Comercial) por **5 módulos** conforme solicitado. Manteremos a **Torre de Controle** como home (`/`) e adicionaremos rotas dedicadas para cada módulo. Continua **front-end only** com mock data — pronto para conectar ao Lovable Cloud depois.

## Estrutura de rotas

```text
/                    Torre de Controle (dashboard geral)
/clientes            Módulo 1 — Clientes, Tabelas de Frete, Cotação, CRM
/coletas             Módulo 2 — Coletas & Entregas (fluxo NF-e → CT-e)
/monitoramento       Módulo 3 — Monitoramento ponta a ponta / Follow-up
/armazem             Módulo 4 — WMS (remessa → estoque → separação → retorno)
/financeiro          Módulo 5 — Financeiro completo (receitas + despesas)
```

Rotas antigas `/operacao`, `/frota`, `/comercial` são removidas; o conteúdo relevante (frota/motoristas) é absorvido pelo Monitoramento e Financeiro.

## Módulo 1 — Clientes & Comercial (`/clientes`)

Abas internas:
- **Clientes** — CRUD (mock) com dados fiscais, contato, segmento, contratos.
- **Tabela de frete** — por cliente: origem/destino, faixa de peso, valor por kg, ad valorem, GRIS, pedágio, taxas mínimas.
- **Cotação / Simulação** — form com origem, destino, peso, volumes, valor NF → calcula frete usando tabela do cliente. Botão "salvar cotação" alimenta o CRM.
- **CRM (pipeline)** — kanban com estágios: Lead → Cotação enviada → Negociação → Fechado / Perdido. Cards com cliente, valor estimado, próximo follow-up, responsável.

## Módulo 2 — Coletas & Entregas (`/coletas`)

Fluxo em estágios (pipeline visual + tabela):
`NF-e recebida → Coleta agendada → Em coleta → Coletado → Aguardando CT-e → Pronto para viagem → Em viagem`

- Botão **Importar XML NF-e** e **Importar XML CT-e** (mock: drag-and-drop que simula parsing e move o pedido de estágio).
- Cada pedido mostra: chave NF, cliente, remetente, destinatário, peso/volumes, valor NF, motorista/veículo alocado, CT-e vinculado.
- Ações: agendar coleta, marcar coletado, vincular CT-e, liberar para viagem.

## Módulo 3 — Monitoramento / Torre de Controle Ponta a Ponta (`/monitoramento`)

- Filtros: cliente, destino (UF/cidade), data, status.
- Visões (tabs): **Lista completa**, **Por cliente**, **Por destino**, **Por data**.
- Cada entrega com timeline de eventos (coletado → em trânsito → chegou base → em rota → entregue), previsão vs. real, ocorrências.
- Painel de **Follow-up**: entregas críticas (atrasadas / sem evento >Xh), botão "Disparar follow ao cliente" (mock — abre modal com template de mensagem WhatsApp/e-mail).
- Placeholder de integração: card "Conectar API de rastreamento" (Cargon, Buonny, etc.) com estado "não conectado".

## Módulo 4 — Armazém / WMS (`/armazem`)

Fluxo completo de armazenagem de terceiros:

```text
NF Remessa p/ Estocagem → Conferência → Endereçamento → Estoque
Estoque → NF Venda do cliente → Tarefa de Separação → Conferência → NF Retorno Simbólico → Baixa de estoque
```

Abas:
- **Entradas** — NFs de remessa recebidas, com botão importar XML (mock), conferência e endereçamento.
- **Estoque** — saldo por cliente/SKU/endereço, giro, mínimo.
- **Saídas & Separação** — NFs de venda do cliente, tarefas de separação (pendente / em separação / concluída), aguardando NF retorno.
- **Movimentações** — histórico de entradas/saídas/transferências.

## Módulo 5 — Financeiro (`/financeiro`)

- **Receitas** — ordens de coleta valorizadas via tabela/cotação, CT-es emitidos, títulos a receber, recebidos, vencidos.
- **Despesas** — cadastro por natureza: **Fixas** (aluguel, folha, seguros), **Variáveis** (combustível, pedágio, manutenção), **Frete de terceiros** (subcontratação), **Administrativas**.
- **Fluxo de caixa** — projetado vs. realizado por semana/mês.
- **Resultado por área** — receita − despesas por módulo (Coletas, Armazém, Admin) mostrando margem em tempo real.
- **Rentabilidade por cliente** — receita − custo estimado por cliente.

## Design system

- Mantemos o tema dark cockpit atual (cores, tipografia, `panel`, `num`, tokens de status). Nenhuma mudança em `styles.css` além de eventuais utilitários novos.
- Componentes reutilizáveis novos: `StageBadge`, `Pipeline` (kanban horizontal), `TimelineEvent`, `MetricCard`, `Tabs` (leve, sem shadcn).

## Mock data

Expandir `src/lib/mock-data.ts` com:
- `freightTables`, `quotations`, `crmDeals`
- `pickups` (com estágio + NF/CT-e vinculados), `xmlEvents`
- `warehouseInbound`, `warehouseOutbound`, `pickTasks`, `stockMovements`
- `expenses` (fixas/variáveis/frete), `cashflow`, `resultByArea`

## Navegação

Atualizar `AppShell` com os 5 itens + Torre de Controle. Atualizar `__root.tsx` metadados.

## Detalhes técnicos

- Todas as rotas seguem o padrão TanStack Router já em uso (`createFileRoute` + `head()` com meta próprio).
- Import de XML é **simulado**: `<input type="file">` que lê o texto e faz parse simples via `DOMParser` para extrair chave/valor/emitente — sem backend. Fica pronto pra plugar no Cloud depois.
- CRM Kanban é feito com colunas flex + cards arrastáveis (sem lib externa — HTML5 drag&drop nativo).
- Sem novas dependências npm.

## Entrega em uma passada

Criarei/editarei em paralelo:
- `src/lib/mock-data.ts` (expandir)
- `src/components/AppShell.tsx` (nav)
- `src/components/pipeline.tsx`, `src/components/tabs.tsx` (auxiliares)
- `src/routes/clientes.tsx`, `coletas.tsx`, `monitoramento.tsx`, `armazem.tsx` (reescrito), `financeiro.tsx`
- remover `src/routes/operacao.tsx`, `frota.tsx`, `comercial.tsx`
- `src/routes/index.tsx` (ajustar KPIs para novos módulos)
- `src/routes/__root.tsx` (metadados)

Após confirmar, executo tudo de uma vez.
