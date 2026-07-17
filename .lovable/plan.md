
# Plano — Evolução do Hub Logístico

Cinco frentes, sem ativar backend ainda. Todos os dados atuais serão **zerados** para permitir testes reais, e todo registro passa a ter ações (mudar status, previsão, observação, custos).

## 1. Controle de acesso (front-only)

- Tela `/login` com email + seleção de perfil (mock — sem senha real).
- 5 perfis: **Admin, Comercial, Operação, Armazém, Financeiro**.
- `AuthContext` guarda usuário atual em `localStorage`.
- `AppShell` mostra só os módulos permitidos por perfil:
  - Admin: tudo
  - Comercial: Clientes, Torre
  - Operação: Coletas, Monitoramento, Torre
  - Armazém: Armazém, Torre
  - Financeiro: Financeiro, Torre
- Botão de logout + trocar perfil no topo.
- Pronto para plugar em auth real depois (basta trocar o context).

## 2. Módulo Clientes — Tabelas por cliente + Upload Excel

- Cliente pode ser **CNPJ único** ou **conglomerado** (grupo com várias empresas/CNPJs).
- Ao clicar no cliente, abre página `/clientes/$id` com abas:
  - **Dados / CNPJs** — lista de CNPJs do grupo
  - **Tabelas de frete** — várias tabelas por cliente, cada uma com:
    - modalidade: **Fracionada** ou **Lotação**
    - origem/destino (UF ou cidade), faixas de peso, valor/kg, ad valorem, GRIS, pedágio, mínimo, prazo
    - vigência (início/fim)
    - botão **Importar Excel** (parse client-side via SheetJS já suportado ou parser simples CSV — usando `FileReader` + template padronizado)
  - **Cotações** — histórico de cotações aprovadas (viram "tabela ad-hoc" válida para aquele roteiro)
  - **CRM** — deals do cliente
- Simulador de cotação continua, mas agora salva no histórico do cliente e pode ser "aprovada" (vira roteiro válido).

## 3. Fluxo NF-e → Ordem de Coleta → CT-e (com divergência)

Nova rota `/coletas` reescrita em torno de **Ordens de Coleta**:

```text
XML NF-e recebido
   ↓ busca roteiro (remetente + cidade coleta + cidade entrega)
   ├─ achou tabela/cotação → gera ORDEM DE COLETA automática com valor
   └─ não achou           → fica em "AGUARDA VINCULAÇÃO" (ação humana)
                             usuário vincula tabela ou cria cotação
Ordem valorizada
   ↓ agenda coleta → em coleta → coletado
   ↓ aguarda CT-e
XML CT-e recebido
   ↓ compara valor CT-e × valor da ordem
   ├─ dentro da tolerância (%) → ok, gera Ordem de Transporte
   └─ fora da tolerância        → marca "DIVERGÊNCIA" (badge + diff),
                                  registra para o financeiro, mas segue fluxo
Ordem de Transporte
   ├─ tipo MIDDLE MILE (transferência entre bases)
   └─ tipo LAST MILE  (entrega final)
   ↓ em viagem → entregue
```

- **Tolerância configurável** em Configurações (default 2%). Divergência > tolerância = badge vermelho + card no financeiro.
- Cada Ordem de Transporte tem seleção **Frota própria** ou **Terceiro** (com campo "valor pago ao terceiro").
- Upload de XML NF-e/CT-e via `<input type=file>` com `DOMParser` real (extrai chave, valor, emitente, destinatário, cidades) — sem backend, mas parse é real.

## 4. Custo por entrega

Cada ordem/entrega tem card **Custo**:

- **Se terceiro**: campo único "Valor pago ao terceiro" + observação.
- **Se frota própria**: parametrização em `/configuracoes/custos-frota`:
  - preço diesel R$/L, consumo km/L do veículo
  - Arla R$/L + consumo
  - pedágio (valor manual ou tabela por rota)
  - comissão motorista (% do frete ou R$/entrega)
  - depreciação R$/km
  - outros (manutenção prevista R$/km)
- Sistema calcula custo estimado automático (km × custos) + campos editáveis para custo real.
- **Margem em tempo real** por entrega (receita CT-e − custo total).

## 5. Interações em todos os registros

Padrão universal — todo card/linha (cliente, ordem, entrega, NF, tarefa de armazém, título) tem menu de ações:

- **Alterar status** (dropdown com estágios válidos do fluxo)
- **Informar previsão** (data/hora com picker nativo)
- **Adicionar observação** (histórico com timestamp e autor)
- **Anexar arquivo** (mock — só nome do arquivo)
- **Registrar ocorrência** (com categoria: atraso, avaria, recusa, etc.)

Componente reutilizável `RecordActions` + `Timeline` para o histórico.

## 6. Torre de Controle — mapa do Brasil com pins

- Substitui o gráfico de linhas por **mapa real** com pins geográficos das entregas ativas.
- Vamos usar **Leaflet + OpenStreetMap** (tiles grátis, sem token, sem conector). Carregamento client-side (`<ClientOnly>` + `React.lazy`).
- Pins coloridos por status (em rota, entregue, ocorrência, atrasado).
- Clique no pin abre popup com dados da entrega + link para detalhe.
- Mantidos os KPIs superiores e a lista de ocorrências ao lado.

## 7. Limpeza dos dados

- `src/lib/mock-data.ts` fica **vazio de exemplos** — só define tipos e retorna arrays vazios.
- Novo `src/lib/mock-store.ts`: store em `localStorage` com CRUD para cada entidade (clientes, tabelas, ordens, CT-es, custos, ocorrências), para o usuário testar de verdade criando registros à mão ou subindo XMLs/Excels.
- Todas as telas passam a ler/escrever do store, não do array estático.

## Detalhes técnicos

- Zero dependência nova, **exceto Leaflet** (`leaflet` + `react-leaflet` + `@types/leaflet`) para o mapa. Nada de Mapbox/Google (usuário escolheu pins geográficos — OSM é grátis, sem conector).
- Excel: parse via **SheetJS (`xlsx`)** client-side — biblioteca leve, sem backend.
- XML: `DOMParser` nativo, sem lib.
- Persistência: `localStorage` (chave `novaris:*`), pronto para trocar por Lovable Cloud depois — camada de acesso já isolada em `mock-store.ts`.
- Rotas novas: `/login`, `/clientes/$id`, `/configuracoes/custos-frota`, `/configuracoes/tolerancia`.
- Componentes novos: `AuthContext`, `RoleGate`, `RecordActions`, `Timeline`, `BrazilMap`, `ExcelUpload`, `XmlDrop`, `DivergenceBadge`, `CostPanel`.

## Arquivos a criar/editar

**Novos**
- `src/lib/auth.tsx`, `src/lib/mock-store.ts`, `src/lib/xml-parser.ts`, `src/lib/excel-parser.ts`, `src/lib/cost-calc.ts`
- `src/components/RoleGate.tsx`, `RecordActions.tsx`, `Timeline.tsx`, `BrazilMap.tsx`, `DivergenceBadge.tsx`, `CostPanel.tsx`
- `src/routes/login.tsx`, `clientes.$id.tsx`, `coletas.$id.tsx`, `configuracoes.tsx`, `configuracoes.custos-frota.tsx`

**Reescritos**
- `src/lib/mock-data.ts` (esvaziado, só tipos)
- `src/routes/index.tsx` (mapa Brasil no lugar do gráfico)
- `src/routes/clientes.tsx`, `coletas.tsx`, `monitoramento.tsx`, `armazem.tsx`, `financeiro.tsx` (interações + store)
- `src/components/AppShell.tsx` (perfil no header + gate de menus)
- `src/routes/__root.tsx` (AuthProvider)

Se aprovar, executo tudo em uma passada.
