// ==================================================================
// Types & shared helpers.
// Dados vivem em `src/lib/mock-store.ts` (localStorage).
// Este arquivo NÃO exporta arrays populados — apenas tipos e utilitários.
// ==================================================================

// ---------- Clientes ----------
export interface ClientCNPJ {
  cnpj: string;
  razaoSocial: string;
  cidade: string;
  uf: string;
}

export interface ClientGroup {
  id: string;
  nome: string;
  observacao?: string;
  criadoEm: string;
}

export interface Client {
  id: string;
  nome: string;
  segmento: string;
  contato: string;
  telefone: string;
  email: string;
  status: "ativo" | "prospect" | "inadimplente" | "renovacao";
  isGrupo: boolean;
  cnpjs: ClientCNPJ[];
  grupoId?: string;
  observacao?: string;
  criadoEm: string;
}

// ---------- Tabelas de frete ----------
export type Modalidade = "fracionada" | "lotacao";

export interface FreightRow {
  faixaMin: number; // kg
  faixaMax: number;
  valorKg: number;
  minimo: number;
}

export interface FreightTable {
  id: string;
  clienteId: string;
  nome: string;              // ex.: "Tabela SP→RJ 2025"
  modalidade: Modalidade;
  origemUf: string;
  origemCidade?: string;
  destinoUf: string;
  destinoCidade?: string;
  rows: FreightRow[];
  adValorem: number;         // %
  gris: number;              // %
  pedagio: number;           // R$
  prazoDias: number;
  vigenciaInicio: string;    // yyyy-mm-dd
  vigenciaFim: string;
  ativa: boolean;
  criadoEm: string;
  // lotação: valor fixo por viagem (opcional, se modalidade === "lotacao")
  valorLotacao?: number;
}

// ---------- Rotas padrão / rotas do cliente ----------
export const TIPOS_CAMINHAO = ["Fiorino", "VUC", "3/4", "Toco", "Truck", "Carreta", "Bitrem", "Rodotrem"] as const;
export interface RouteRate {
  id: string;
  clienteId?: string;        // vazio = rota padrão
  baseRouteId?: string;      // rota padrão de origem (quando copiada p/ cliente)
  origemCidade: string;
  origemUf: string;
  destinoCidade: string;
  destinoUf: string;
  peso: number;              // kg de referência
  valorNF: number;
  valorFrete: number;
  tipoCaminhao: string;
  criadoEm: string;
}

// ---------- Cotações ----------
export interface Quotation {
  id: string;
  clienteId: string;
  origemCidade: string;
  origemUf: string;
  destinoCidade: string;
  destinoUf: string;
  peso: number;
  volumes: number;
  valorNF: number;
  valorCalculado: number;
  status: "aberta" | "aprovada" | "recusada";
  criadoEm: string;
  observacao?: string;
}

// ---------- CRM ----------
export type CRMStage = "lead" | "cotacao" | "negociacao" | "fechado" | "perdido";

export interface CRMDeal {
  id: string;
  clienteNome: string;
  responsavel: string;
  valorEstimado: number;
  stage: CRMStage;
  proximoFollow: string;
  origem: string;
  observacao: string;
  criadoEm: string;
}

// ---------- Fluxo NF-e → Ordem de Coleta → CT-e → Transporte ----------
export type OrderStage =
  | "aguarda_vinculacao"   // XML sem match, precisa ação humana
  | "valorizada"           // Match encontrado, ordem valorizada
  | "coleta_agendada"
  | "em_coleta"
  | "coletado"
  | "aguardando_cte"
  | "cte_ok"               // CT-e chegou e casa (ou dentro tolerância)
  | "cte_divergente"       // CT-e chegou com valor fora da tolerância
  | "em_viagem"
  | "entregue"
  | "ocorrencia";

export type TransportType = "middle" | "last" | "";
export type ExecMode = "frota" | "terceiro" | "";

export interface TimelineEntry {
  quando: string;      // ISO
  autor: string;       // usuário
  tipo: "status" | "observacao" | "previsao" | "anexo" | "ocorrencia" | "custo" | "sistema";
  texto: string;
}

export interface OrderCosts {
  execMode: ExecMode;
  // terceiro
  valorPagoTerceiro?: number;
  fornecedor?: string;
  // frota
  kmRodados?: number;
  precoDiesel?: number;
  kmPorLitro?: number;
  arlaLitros?: number;
  precoArla?: number;
  pedagio?: number;
  comissaoMotorista?: number;
  depreciacao?: number;
  outros?: number;
  observacao?: string;
}

export interface Order {
  id: string;
  ocId?: string;                        // OC v2 emitida (definido no servidor)
  clienteId: string;
  clienteNome: string;

  // NF-e
  chaveNFe: string;
  numeroNFe: string;
  remetente: string;
  remetenteCnpj?: string;
  cidadeColeta: string;
  ufColeta: string;
  destinatario: string;
  destinatarioCnpj?: string;
  cidadeEntrega: string;
  ufEntrega: string;
  peso: number;
  volumes: number;
  valorNF: number;

  // vinculação de tabela/cotação
  valorFrete: number;                    // valor da ordem
  origemValor: "tabela" | "cotacao" | "rota_cliente" | "rota_padrao" | "manual" | "";
  refValor?: string;                     // FreightTable.id ou Quotation.id

  // CT-e
  cteChave?: string;
  cteNumero?: string;
  cteValor?: number;
  divergenciaPercent?: number;           // (cte - ordem) / ordem * 100
  cteChaves?: string[];
  conferencia?: { status: "pendente" | "divergente" | "conferido"; percent?: number; base: number; fiscal: number; tolerance: number };
  xmlOriginal?: string;
  entregueEm?: string;
  coletadoEm?: string;

  // Transporte
  transportType: TransportType;
  motorista?: string;
  placa?: string;
  previsaoEntrega?: string;              // ISO
  emailCliente?: string;                 // destinatário dos avisos de rastreio
  rastreio?: { situacao: string; local: string; atualizadoEm: string; fonte: "manual" | "integracao" };

  stage: OrderStage;
  costs: OrderCosts;
  timeline: TimelineEntry[];
  // Coordenadas para o mapa (opcional; preenchido a partir da cidade)
  latDestino?: number;
  lngDestino?: number;

  criadoEm: string;
  atualizadoEm: string;
}

// ---------- Rotas, Ordens de Coleta, Motoristas, Veículos ----------
export interface Motorista { id: string; nome: string; cpf: string; telefone: string; email?: string; cnh?: string; observacao?: string; ativo: boolean; criadoEm: string; }
export interface Veiculo { id: string; placa: string; placaCarreta?: string; tipo: string; modelo?: string; proprietario: "frota" | "terceiro"; capacidadeKg?: number; ativo: boolean; criadoEm: string; }
export type RotaStatus = "aberta" | "programada" | "encerrada";
/** Rota = agrupamento de NF-e com mesmo remetente e destinatário. */
export interface Rota {
  id: string; clienteId: string; clienteNome: string;
  remetente: string; remetenteCnpj?: string; cidadeColeta: string; ufColeta: string;
  destinatario: string; destinatarioCnpj?: string; cidadeEntrega: string; ufEntrega: string;
  orderIds: string[]; motoristaId?: string; veiculoId?: string;
  status: RotaStatus; criadoEm: string; atualizadoEm: string;
}
export type OCStatus = "rascunho" | "aguardando_programacao" | "emitida" | "enviada_motorista" | "em_coleta" | "coletada" | "aguardando_viagem" | "em_viagem" | "entregue" | "ocorrencia" | "cancelada";
export const OC_STATUS: { id: OCStatus; label: string; stage?: OrderStage }[] = [
  { id: "rascunho", label: "Rascunho" },
  { id: "aguardando_programacao", label: "Legado · aguardando programação" },
  { id: "emitida", label: "Programada", stage: "coleta_agendada" },
  { id: "enviada_motorista", label: "Enviada ao motorista", stage: "coleta_agendada" },
  { id: "em_coleta", label: "Em coleta", stage: "em_coleta" },
  { id: "coletada", label: "Coletada · aguardando CT-e", stage: "aguardando_cte" },
  { id: "aguardando_viagem", label: "Aguardando início de viagem", stage: "cte_ok" },
  { id: "em_viagem", label: "Em viagem", stage: "em_viagem" },
  { id: "entregue", label: "Entregue", stage: "entregue" },
  { id: "ocorrencia", label: "Ocorrência", stage: "ocorrencia" },
  { id: "cancelada", label: "Cancelada" },
];
/** Ordem de Coleta = documento operacional gerado a partir da rota, enviado ao motorista. */
export interface OrdemColeta {
  id: string; numero: string; rotaId: string; clienteNome: string;
  orderIds: string[]; motoristaId?: string; veiculoId?: string;
  localColeta: string; cidadeColeta: string; ufColeta: string; dataHoraColeta: string;
  localEntrega: string; cidadeEntrega: string; ufEntrega: string; dataHoraEntrega: string;
  observacao?: string; status: OCStatus; criadoPor: string; criadoEm: string; atualizadoEm: string;
  // Modelo v2 (OC independente da rota). Ausente = registro legado aguardando conversão.
  modelo?: "v2";
  clienteColetaId?: string; clienteColetaNome?: string; localColetaId?: string;
  /** Local de coleta por NF (id da NF -> id do local). Ausente usa localColetaId como padrão. */
  coletaPorNf?: Record<string, string>;
  clienteDescargaId?: string; clienteDescargaNome?: string; localDescargaId?: string;
  contratanteId?: string; contratanteNome?: string;
  instrucoes?: string; historico?: TimelineEntry[];
  docVersion?: number; emitidaEm?: string;
  documentoEstado?: "sem_documento" | "emitido" | "legado_sem_snapshot";
  conteudoPendenteRevisao?: boolean;
  legado?: { statusOriginal: string; rotaId?: string; convertidoEm: string; convertidoPor: string };
  /** Empresa do grupo que emite a OC e toda a documentação. */
  empresaId?: string;
  /** Contratação do transporte: terceiro (valor fechado com o motorista) ou frota própria (custo manual). */
  contratacao?: "terceiro" | "frota";
  custoMotorista?: number;
  custoObs?: string;
  /** Chave de agrupamento automático (remetente|destinatário) do rascunho sugerido na importação. */
  autoKey?: string;
  /** Previsão e follow-up da coleta (Acompanhamento de Coleta). */
  previsaoColeta?: string;
}
/** Empresa do grupo (emissora de OCs e documentos). */
export interface Empresa {
  id: string; nome: string; razaoSocial?: string; cnpj?: string; endereco?: string; cidade?: string; uf?: string;
  telefone?: string; email?: string; site?: string; logoDataUrl?: string; ativa: boolean; criadoEm: string;
}
/** Local operacional (armazém/estabelecimento físico). Pode atender vários donos de carga. */
export interface LocalOperacional {
  id: string; nome: string; endereco: string; numero?: string; complemento?: string; bairro?: string; cep?: string;
  cidade: string; uf: string; contatos?: string; emails: string[]; clienteIds: string[]; ativo: boolean; criadoEm: string; atualizadoEm?: string;
}

// ---------- Armazém ----------
export interface WarehouseInbound {
  id: string;
  clienteNome: string;
  nfRemessa: string;
  data: string;
  volumes: number;
  peso: number;
  status: "recebida" | "em_conferencia" | "enderecada";
  endereco?: string;
  timeline: TimelineEntry[];
}

export interface WarehouseOutbound {
  id: string;
  clienteNome: string;
  nfVenda: string;
  destinatario: string;
  cidade: string;
  itens: number;
  status: "aguardando_separacao" | "em_separacao" | "conferencia" | "aguardando_retorno" | "baixado";
  separador?: string;
  nfRetorno?: string;
  atualizadoEm: string;
  timeline: TimelineEntry[];
}

export interface StockItem {
  sku: string;
  descricao: string;
  categoria: string;
  endereco: string;
  qtd: number;
  minimo: number;
  clienteNome: string;
  giro: "alto" | "medio" | "baixo";
}

// ---------- Financeiro ----------
export interface Invoice {
  id?: string;
  cteChave?: string;
  competencia?: string;
  movements?: import("./reliability").Movement[];
  numero: string;
  clienteNome: string;
  emissao: string;
  vencimento: string;
  valor: number;
  status: "paga" | "aberta" | "vencida" | "emitida";
  tipo: "CTe" | "NF-e" | "Fatura";
  // conciliação
  recebidoEm?: string;      // ISO yyyy-mm-dd
  valorRecebido?: number;
  conta?: string;
  empresaId?: string;
}

export type ExpenseType = "fixa" | "variavel" | "frete_terceiros" | "administrativa";
export type ExpenseArea = "operacao" | "armazem" | "frota" | "administrativa" | "comercial";

export interface Expense {
  id: string;
  orderId?: string;
  competencia?: string;
  movements?: import("./reliability").Movement[];
  descricao: string;
  tipo: ExpenseType;
  area: ExpenseArea;
  fornecedor: string;
  valor: number;
  vencimento: string;
  status: "prevista" | "paga" | "vencida";
  recorrente: boolean;
  grupo?: string;
  // conciliação
  pagoEm?: string;          // ISO yyyy-mm-dd
  valorPago?: number;
  empresaId?: string;
  ocId?: string;
  conta?: string;
}

/** Converte "dd/mm/aaaa" ou ISO em "aaaa-mm". */
export function monthKey(d?: string): string {
  if (!d) return "";
  const br = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}`;
  return d.slice(0, 7);
}

export interface ExpenseGroup {
  id: string;
  nome: string;
}

// ---------- Custos de frota (parametrização global) ----------
export interface FrotaCostParams {
  precoDiesel: number;      // R$/L
  kmPorLitro: number;       // km/L padrão
  precoArla: number;        // R$/L
  consumoArlaLitrosPor100km: number;
  pedagioMedioPorKm: number;
  comissaoMotoristaPercent: number; // % sobre valor frete
  depreciacaoPorKm: number; // R$/km
  outrosPorKm: number;      // R$/km (manutenção prevista, etc.)
}

// ---------- Config ----------
export interface AppConfig {
  toleranciaDivergenciaPercent: number; // default 2
  frota: FrotaCostParams;
  emailInbox?: EmailInboxConfig;
  emailTemplate?: EmailTemplateConfig;
  whatsapp?: WhatsappConfig;
}

export interface WhatsappConfig {
  enviarPdfAutomatico: boolean;   // envia PDF da OC ao motorista na emissão
  receberComprovantes: boolean;   // lê fotos de comprovantes e anexa à NF
  mensagemPadrao: string;         // mensagem padrão ao motorista
}

export interface EmailInboxConfig {
  provedor: "gmail" | "outlook" | "imap";
  endereco: string;
  filtro: string;          // ex: has:attachment filename:xml
  ativo: boolean;
  intervaloMin: number;
}

export interface EmailTemplateConfig {
  assunto: string;
  corpo: string;
  autoEnvio: boolean;
  estagiosAuto: string[];
}

export const DEFAULT_EMAIL_INBOX: EmailInboxConfig = {
  provedor: "gmail", endereco: "", filtro: "has:attachment filename:xml", ativo: false, intervaloMin: 5,
};

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplateConfig = {
  assunto: "Atualização da sua entrega NF {{nf}} — {{status}}",
  corpo: "Olá {{cliente}},\n\nSua entrega da NF {{nf}} ({{origem}} → {{destino}}) está em: {{status}}.\nSituação atual: {{situacao}} — {{local}}\nPrevisão de entrega: {{previsao}}\n\nAtenciosamente,\nNovaris · Operador Logístico Integrado",
  autoEnvio: false,
  estagiosAuto: ["em_viagem", "entregue", "ocorrencia"],
};

export function renderTemplate(tpl: string, o: Order, stageName: string): string {
  const vars: Record<string, string> = {
    cliente: o.clienteNome, nf: o.numeroNFe, ordem: o.id,
    origem: `${o.cidadeColeta}/${o.ufColeta}`, destino: `${o.cidadeEntrega}/${o.ufEntrega}`,
    status: stageName, situacao: o.rastreio?.situacao ?? "—", local: o.rastreio?.local ?? "—",
    previsao: o.previsaoEntrega ? new Date(o.previsaoEntrega).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "a confirmar",
    destinatario: o.destinatario,
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// ==================================================================
// Helpers visuais (mantidos para retrocompatibilidade)
// ==================================================================

export type Tone = "cyan" | "amber" | "success" | "danger" | "muted" | "info";

const TONE_MAP: Record<string, Tone> = {
  // orders
  aguarda_vinculacao: "amber",
  valorizada: "info",
  coleta_agendada: "cyan",
  em_coleta: "cyan",
  coletado: "amber",
  aguardando_cte: "amber",
  cte_ok: "cyan",
  cte_divergente: "danger",
  aguardando_viagem: "cyan",
  em_viagem: "cyan",
  entregue: "success",
  ocorrencia: "danger",
  // legado
  em_rota: "cyan",
  armazem: "amber",
  coleta: "info",
  // status genéricos
  ativo: "success",
  renovacao: "amber",
  inadimplente: "danger",
  prospect: "info",
  paga: "success",
  aberta: "cyan",
  vencida: "danger",
  emitida: "info",
  prevista: "cyan",
  aprovada: "success",
  recusada: "danger",
  lead: "info",
  cotacao: "cyan",
  negociacao: "amber",
  fechado: "success",
  perdido: "danger",
  // warehouse
  recebida: "cyan",
  em_conferencia: "amber",
  enderecada: "success",
  aguardando_separacao: "amber",
  em_separacao: "cyan",
  conferencia: "cyan",
  aguardando_retorno: "amber",
  baixado: "success",
};

export function statusTone(s: string): Tone {
  return TONE_MAP[s] ?? "muted";
}

export function toneClass(tone: Tone): string {
  switch (tone) {
    case "cyan": return "text-primary bg-primary/10 border-primary/30";
    case "amber": return "text-accent bg-accent/10 border-accent/30";
    case "success": return "text-success bg-success/10 border-success/30";
    case "danger": return "text-danger bg-danger/10 border-danger/30";
    case "info": return "text-info bg-info/10 border-info/30";
    default: return "text-muted-foreground bg-muted/40 border-border";
  }
}

export const ORDER_STAGES: { id: OrderStage; label: string }[] = [
  { id: "aguarda_vinculacao", label: "Aguarda vinculação" },
  { id: "valorizada", label: "Valorizada" },
  { id: "coleta_agendada", label: "Coleta agendada" },
  { id: "em_coleta", label: "Em coleta" },
  { id: "coletado", label: "Coletado" },
  { id: "aguardando_cte", label: "Aguardando CT-e" },
  { id: "cte_ok", label: "CT-e emitido" },
  { id: "cte_divergente", label: "CT-e divergente" },
  { id: "em_viagem", label: "Em viagem" },
  { id: "entregue", label: "Entregue" },
  { id: "ocorrencia", label: "Ocorrência" },
];

export function stageLabel(s: OrderStage): string {
  return ORDER_STAGES.find(x => x.id === s)?.label ?? s;
}

export function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ==================================================================
// Default config
// ==================================================================
export const DEFAULT_CONFIG: AppConfig = {
  toleranciaDivergenciaPercent: 2,
  frota: {
    precoDiesel: 6.20,
    kmPorLitro: 3.0,
    precoArla: 4.80,
    consumoArlaLitrosPor100km: 1.5,
    pedagioMedioPorKm: 0.15,
    comissaoMotoristaPercent: 8,
    depreciacaoPorKm: 0.40,
    outrosPorKm: 0.25,
  },
};
