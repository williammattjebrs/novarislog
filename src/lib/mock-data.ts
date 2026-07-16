// Mock data for the logistics operator hub.
// Front-end only prototype — replace with API calls when backend is wired.

export type OrderStatus =
  | "coleta"
  | "armazem"
  | "em_rota"
  | "entregue"
  | "ocorrencia";

export interface Order {
  id: string;
  cliente: string;
  origem: string;
  destino: string;
  peso: number;
  volumes: number;
  valor: number;
  status: OrderStatus;
  eta: string;
  motorista?: string;
  placa?: string;
}

export const orders: Order[] = [
  { id: "LG-24081", cliente: "Ambev", origem: "Guarulhos/SP", destino: "Campinas/SP", peso: 1240, volumes: 32, valor: 4820, status: "em_rota", eta: "14:20", motorista: "Carlos Andrade", placa: "RIO-2A81" },
  { id: "LG-24082", cliente: "Natura", origem: "Cajamar/SP", destino: "Rio de Janeiro/RJ", peso: 620, volumes: 14, valor: 3120, status: "em_rota", eta: "18:45", motorista: "Felipe Rocha", placa: "SPX-9C22" },
  { id: "LG-24083", cliente: "Magazine Luiza", origem: "Louveira/SP", destino: "Belo Horizonte/MG", peso: 2140, volumes: 58, valor: 7890, status: "armazem", eta: "amanhã 08:00" },
  { id: "LG-24084", cliente: "Petrobras", origem: "Duque de Caxias/RJ", destino: "Vitória/ES", peso: 3860, volumes: 12, valor: 12400, status: "coleta", eta: "hoje 22:00" },
  { id: "LG-24085", cliente: "Renner", origem: "Extrema/MG", destino: "Curitiba/PR", peso: 980, volumes: 41, valor: 5210, status: "em_rota", eta: "16:10", motorista: "Marcos Lima", placa: "PAR-7B90" },
  { id: "LG-24086", cliente: "iFood", origem: "Osasco/SP", destino: "Santos/SP", peso: 210, volumes: 8, valor: 890, status: "entregue", eta: "concluído 11:32", motorista: "Ana Souza", placa: "SPX-1D45" },
  { id: "LG-24087", cliente: "Casas Bahia", origem: "Jundiaí/SP", destino: "São José/SC", peso: 1720, volumes: 47, valor: 9210, status: "ocorrencia", eta: "atrasado 3h", motorista: "Rafael Costa", placa: "SPX-4E11" },
  { id: "LG-24088", cliente: "Ambev", origem: "Guarulhos/SP", destino: "Sorocaba/SP", peso: 540, volumes: 22, valor: 2140, status: "entregue", eta: "concluído 09:14", motorista: "Ana Souza", placa: "SPX-1D45" },
];

export interface Route {
  id: string;
  motorista: string;
  placa: string;
  paradas: number;
  concluidas: number;
  distancia: number;
  progresso: number;
  status: "em_rota" | "programada" | "concluida" | "atrasada";
  regiao: string;
}

export const routes: Route[] = [
  { id: "R-8801", motorista: "Carlos Andrade", placa: "RIO-2A81", paradas: 12, concluidas: 7, distancia: 184, progresso: 58, status: "em_rota", regiao: "Interior SP" },
  { id: "R-8802", motorista: "Felipe Rocha", placa: "SPX-9C22", paradas: 9, concluidas: 4, distancia: 421, progresso: 44, status: "em_rota", regiao: "SP → RJ" },
  { id: "R-8803", motorista: "Marcos Lima", placa: "PAR-7B90", paradas: 15, concluidas: 9, distancia: 512, progresso: 60, status: "em_rota", regiao: "Sul" },
  { id: "R-8804", motorista: "Rafael Costa", placa: "SPX-4E11", paradas: 11, concluidas: 3, distancia: 610, progresso: 27, status: "atrasada", regiao: "SC" },
  { id: "R-8805", motorista: "Ana Souza", placa: "SPX-1D45", paradas: 8, concluidas: 8, distancia: 92, progresso: 100, status: "concluida", regiao: "Baixada SP" },
  { id: "R-8806", motorista: "Juliana Prado", placa: "SPX-6F02", paradas: 10, concluidas: 0, distancia: 220, progresso: 0, status: "programada", regiao: "ABC" },
];

export interface StockItem {
  sku: string;
  descricao: string;
  categoria: string;
  endereco: string;
  qtd: number;
  minimo: number;
  cliente: string;
  giro: "alto" | "medio" | "baixo";
}

export const stock: StockItem[] = [
  { sku: "SKU-40012", descricao: "Cerveja lata 350ml — pack 12", categoria: "Bebidas", endereco: "A-12-04", qtd: 4820, minimo: 1200, cliente: "Ambev", giro: "alto" },
  { sku: "SKU-40018", descricao: "Refrigerante 2L PET", categoria: "Bebidas", endereco: "A-14-02", qtd: 980, minimo: 800, cliente: "Ambev", giro: "alto" },
  { sku: "SKU-51201", descricao: "Kit cosmético Ekos", categoria: "Cosméticos", endereco: "C-04-11", qtd: 2140, minimo: 500, cliente: "Natura", giro: "medio" },
  { sku: "SKU-51244", descricao: "Perfume 100ml — Essencial", categoria: "Cosméticos", endereco: "C-05-08", qtd: 320, minimo: 400, cliente: "Natura", giro: "medio" },
  { sku: "SKU-70021", descricao: "Smart TV 50\" LED 4K", categoria: "Eletro", endereco: "D-02-01", qtd: 148, minimo: 60, cliente: "Magazine Luiza", giro: "alto" },
  { sku: "SKU-70088", descricao: "Fritadeira Air Fryer 5L", categoria: "Eletro", endereco: "D-03-04", qtd: 74, minimo: 80, cliente: "Casas Bahia", giro: "medio" },
  { sku: "SKU-91120", descricao: "Camiseta básica algodão — sortido", categoria: "Vestuário", endereco: "B-08-10", qtd: 3210, minimo: 800, cliente: "Renner", giro: "alto" },
  { sku: "SKU-91130", descricao: "Calça jeans slim — sortido", categoria: "Vestuário", endereco: "B-09-02", qtd: 210, minimo: 400, cliente: "Renner", giro: "baixo" },
];

export interface Client {
  nome: string;
  cnpj: string;
  segmento: string;
  contrato: string;
  volMensal: number;
  faturamentoMes: number;
  sla: number;
  status: "ativo" | "renovacao" | "inadimplente" | "prospect";
  contato: string;
  telefone: string;
  cidade: string;
  uf: string;
}

export const clients: Client[] = [
  { nome: "Ambev", cnpj: "07.526.557/0001-00", segmento: "Bebidas", contrato: "MSA-2023-014", volMensal: 4820, faturamentoMes: 1_240_800, sla: 98.4, status: "ativo", contato: "Ricardo Faria", telefone: "(11) 3708-2200", cidade: "São Paulo", uf: "SP" },
  { nome: "Natura", cnpj: "71.673.990/0001-77", segmento: "Cosméticos", contrato: "MSA-2024-007", volMensal: 1980, faturamentoMes: 612_400, sla: 96.1, status: "ativo", contato: "Carla Meneses", telefone: "(11) 4446-4000", cidade: "Cajamar", uf: "SP" },
  { nome: "Magazine Luiza", cnpj: "47.960.950/0001-21", segmento: "Varejo", contrato: "MSA-2022-041", volMensal: 3210, faturamentoMes: 984_200, sla: 94.7, status: "renovacao", contato: "Bruno Sales", telefone: "(11) 3504-2500", cidade: "Franca", uf: "SP" },
  { nome: "Petrobras", cnpj: "33.000.167/0001-01", segmento: "Óleo & Gás", contrato: "MSA-2021-002", volMensal: 620, faturamentoMes: 1_820_000, sla: 99.2, status: "ativo", contato: "Márcio Duarte", telefone: "(21) 3224-1500", cidade: "Rio de Janeiro", uf: "RJ" },
  { nome: "Renner", cnpj: "92.754.738/0001-62", segmento: "Varejo", contrato: "MSA-2024-018", volMensal: 2410, faturamentoMes: 542_100, sla: 95.8, status: "ativo", contato: "Fernanda Lopes", telefone: "(51) 2121-0555", cidade: "Porto Alegre", uf: "RS" },
  { nome: "Casas Bahia", cnpj: "33.041.260/0001-64", segmento: "Varejo", contrato: "MSA-2023-032", volMensal: 1740, faturamentoMes: 421_800, sla: 91.2, status: "inadimplente", contato: "Alexandre Vaz", telefone: "(11) 4225-8200", cidade: "São Caetano", uf: "SP" },
  { nome: "iFood", cnpj: "14.380.200/0001-21", segmento: "Delivery", contrato: "MSA-2024-021", volMensal: 5820, faturamentoMes: 312_400, sla: 97.6, status: "ativo", contato: "Talita Ramos", telefone: "(11) 3197-0900", cidade: "Osasco", uf: "SP" },
  { nome: "AgroBrasil", cnpj: "12.884.201/0001-49", segmento: "Agronegócio", contrato: "—", volMensal: 0, faturamentoMes: 0, sla: 0, status: "prospect", contato: "Leandro Prado", telefone: "(62) 3241-4400", cidade: "Goiânia", uf: "GO" },
];

// ============ MODULE 1: Freight tables + Quotations + CRM =============

export interface FreightTableRow {
  id: string;
  cliente: string;
  origemUf: string;
  destinoUf: string;
  faixaPeso: string; // e.g., "0-50 kg"
  valorKg: number;
  minimo: number;
  adValorem: number; // %
  gris: number; // %
  pedagio: number;
  prazo: number; // dias
}

export const freightTables: FreightTableRow[] = [
  { id: "FT-001", cliente: "Ambev", origemUf: "SP", destinoUf: "SP", faixaPeso: "0-500", valorKg: 0.42, minimo: 120, adValorem: 0.15, gris: 0.10, pedagio: 45, prazo: 1 },
  { id: "FT-002", cliente: "Ambev", origemUf: "SP", destinoUf: "SP", faixaPeso: "500-2000", valorKg: 0.36, minimo: 220, adValorem: 0.15, gris: 0.10, pedagio: 60, prazo: 1 },
  { id: "FT-003", cliente: "Ambev", origemUf: "SP", destinoUf: "RJ", faixaPeso: "0-2000", valorKg: 0.58, minimo: 320, adValorem: 0.20, gris: 0.12, pedagio: 180, prazo: 2 },
  { id: "FT-004", cliente: "Natura", origemUf: "SP", destinoUf: "RJ", faixaPeso: "0-1000", valorKg: 0.72, minimo: 280, adValorem: 0.18, gris: 0.14, pedagio: 180, prazo: 2 },
  { id: "FT-005", cliente: "Natura", origemUf: "SP", destinoUf: "MG", faixaPeso: "0-1000", valorKg: 0.68, minimo: 250, adValorem: 0.18, gris: 0.14, pedagio: 120, prazo: 2 },
  { id: "FT-006", cliente: "Magazine Luiza", origemUf: "SP", destinoUf: "MG", faixaPeso: "0-3000", valorKg: 0.52, minimo: 380, adValorem: 0.22, gris: 0.15, pedagio: 140, prazo: 2 },
  { id: "FT-007", cliente: "Renner", origemUf: "MG", destinoUf: "PR", faixaPeso: "0-2000", valorKg: 0.61, minimo: 340, adValorem: 0.20, gris: 0.12, pedagio: 210, prazo: 3 },
  { id: "FT-008", cliente: "iFood", origemUf: "SP", destinoUf: "SP", faixaPeso: "0-300", valorKg: 0.85, minimo: 80, adValorem: 0.10, gris: 0.08, pedagio: 20, prazo: 1 },
];

export type CRMStage = "lead" | "cotacao" | "negociacao" | "fechado" | "perdido";

export interface CRMDeal {
  id: string;
  cliente: string;
  responsavel: string;
  valorEstimado: number;
  volumeMensal: number;
  stage: CRMStage;
  proximoFollow: string;
  origem: string;
  observacao: string;
}

export const crmDeals: CRMDeal[] = [
  { id: "OPP-2201", cliente: "AgroBrasil", responsavel: "Julia Torres", valorEstimado: 220_000, volumeMensal: 480, stage: "lead", proximoFollow: "hoje 16:00", origem: "Indicação", observacao: "Precisa de expansão para MT/GO" },
  { id: "OPP-2202", cliente: "Vivara", responsavel: "Julia Torres", valorEstimado: 84_000, volumeMensal: 210, stage: "cotacao", proximoFollow: "amanhã 10:00", origem: "Site", observacao: "Aguardando aprovação comercial" },
  { id: "OPP-2203", cliente: "Localiza", responsavel: "Bruno Sales", valorEstimado: 340_000, volumeMensal: 620, stage: "cotacao", proximoFollow: "sex 14:00", origem: "LinkedIn", observacao: "Compara com concorrente XPTO" },
  { id: "OPP-2204", cliente: "MRV", responsavel: "Bruno Sales", valorEstimado: 512_000, volumeMensal: 980, stage: "negociacao", proximoFollow: "seg 09:30", origem: "Feira Intermodal", observacao: "Negociando reajuste de 6%" },
  { id: "OPP-2205", cliente: "Grendene", responsavel: "Julia Torres", valorEstimado: 148_000, volumeMensal: 340, stage: "negociacao", proximoFollow: "seg 11:00", origem: "Prospecção ativa", observacao: "Fechar contrato até fim do mês" },
  { id: "OPP-2206", cliente: "Havaianas", responsavel: "Bruno Sales", valorEstimado: 620_000, volumeMensal: 1_120, stage: "fechado", proximoFollow: "—", origem: "Indicação", observacao: "Contrato assinado 18/07" },
  { id: "OPP-2207", cliente: "Riachuelo", responsavel: "Julia Torres", valorEstimado: 210_000, volumeMensal: 420, stage: "perdido", proximoFollow: "—", origem: "RFP", observacao: "Perdeu por preço" },
];

export interface Quotation {
  id: string;
  cliente: string;
  origem: string;
  destino: string;
  peso: number;
  volumes: number;
  valorNF: number;
  valorFrete: number;
  criadoEm: string;
  status: "aberta" | "aprovada" | "recusada";
}

export const quotations: Quotation[] = [
  { id: "COT-3301", cliente: "AgroBrasil", origem: "Goiânia/GO", destino: "Cuiabá/MT", peso: 4200, volumes: 68, valorNF: 128_000, valorFrete: 4_820, criadoEm: "16/07 14:22", status: "aberta" },
  { id: "COT-3302", cliente: "Vivara", origem: "São Paulo/SP", destino: "Rio de Janeiro/RJ", peso: 180, volumes: 8, valorNF: 240_000, valorFrete: 780, criadoEm: "16/07 10:04", status: "aprovada" },
  { id: "COT-3303", cliente: "Localiza", origem: "Belo Horizonte/MG", destino: "Salvador/BA", peso: 1_240, volumes: 24, valorNF: 88_000, valorFrete: 3_120, criadoEm: "15/07 17:41", status: "aberta" },
];

// ============ MODULE 2: Coletas & Entregas (NF-e → CT-e flow) =============

export type PickupStage =
  | "nfe_recebida"
  | "coleta_agendada"
  | "em_coleta"
  | "coletado"
  | "aguardando_cte"
  | "pronto_viagem"
  | "em_viagem";

export interface Pickup {
  id: string;
  cliente: string;
  chaveNFe: string;
  numeroNFe: string;
  cteNumero?: string;
  remetente: string;
  destinatario: string;
  cidadeDestino: string;
  peso: number;
  volumes: number;
  valorNF: number;
  stage: PickupStage;
  agendamento?: string;
  motorista?: string;
  placa?: string;
  atualizadoEm: string;
}

export const pickups: Pickup[] = [
  { id: "COL-9001", cliente: "Ambev", chaveNFe: "35240707526557000100550010000114481194512340", numeroNFe: "114.481", remetente: "Ambev CD Guarulhos", destinatario: "Distrib. Campinas Ltda", cidadeDestino: "Campinas/SP", peso: 1240, volumes: 32, valorNF: 148_200, stage: "em_viagem", motorista: "Carlos Andrade", placa: "RIO-2A81", cteNumero: "CTe 442.881", atualizadoEm: "12:04" },
  { id: "COL-9002", cliente: "Natura", chaveNFe: "35240771673990000177550010000212201194512341", numeroNFe: "212.201", remetente: "Natura Cajamar", destinatario: "Beleza Rio SA", cidadeDestino: "Rio de Janeiro/RJ", peso: 620, volumes: 14, valorNF: 84_300, stage: "em_viagem", motorista: "Felipe Rocha", placa: "SPX-9C22", cteNumero: "CTe 442.902", atualizadoEm: "11:52" },
  { id: "COL-9003", cliente: "Magazine Luiza", chaveNFe: "35240747960950000121550010000318841194512342", numeroNFe: "318.841", remetente: "Magalu Louveira", destinatario: "Loja BH Centro", cidadeDestino: "Belo Horizonte/MG", peso: 2140, volumes: 58, valorNF: 240_000, stage: "pronto_viagem", motorista: "Marcos Lima", placa: "PAR-7B90", cteNumero: "CTe 441.021", atualizadoEm: "10:41" },
  { id: "COL-9004", cliente: "Petrobras", chaveNFe: "33240733000167000101550010000041201194512343", numeroNFe: "041.201", remetente: "REDUC Duque de Caxias", destinatario: "Terminal Vitória", cidadeDestino: "Vitória/ES", peso: 3860, volumes: 12, valorNF: 812_400, stage: "aguardando_cte", motorista: "Pedro Vasques", placa: "SPX-2H88", atualizadoEm: "09:12" },
  { id: "COL-9005", cliente: "Renner", chaveNFe: "31240792754738000162550010000508811194512344", numeroNFe: "508.811", remetente: "CD Renner Extrema", destinatario: "Loja Curitiba Shopping", cidadeDestino: "Curitiba/PR", peso: 980, volumes: 41, valorNF: 128_400, stage: "coletado", motorista: "Marcos Lima", placa: "PAR-7B90", atualizadoEm: "08:44" },
  { id: "COL-9006", cliente: "Ambev", chaveNFe: "35240707526557000100550010000114522194512345", numeroNFe: "114.522", remetente: "Ambev CD Guarulhos", destinatario: "Bar do Zé Sorocaba", cidadeDestino: "Sorocaba/SP", peso: 540, volumes: 22, valorNF: 42_100, stage: "em_coleta", agendamento: "hoje 14:00", motorista: "Ana Souza", placa: "SPX-1D45", atualizadoEm: "07:20" },
  { id: "COL-9007", cliente: "iFood", chaveNFe: "35240714380200000121550010000048811194512346", numeroNFe: "048.811", remetente: "CD iFood Osasco", destinatario: "Dark Kitchen Santos", cidadeDestino: "Santos/SP", peso: 210, volumes: 8, valorNF: 18_400, stage: "coleta_agendada", agendamento: "hoje 16:30", atualizadoEm: "06:58" },
  { id: "COL-9008", cliente: "Casas Bahia", chaveNFe: "35240733041260000164550010000188120194512347", numeroNFe: "188.120", remetente: "CB Jundiaí", destinatario: "Loja São José SC", cidadeDestino: "São José/SC", peso: 1720, volumes: 47, valorNF: 214_800, stage: "nfe_recebida", atualizadoEm: "06:12" },
  { id: "COL-9009", cliente: "Magazine Luiza", chaveNFe: "35240747960950000121550010000318912194512348", numeroNFe: "318.912", remetente: "Magalu Louveira", destinatario: "Loja Ribeirão Preto", cidadeDestino: "Ribeirão Preto/SP", peso: 640, volumes: 18, valorNF: 68_400, stage: "nfe_recebida", atualizadoEm: "05:41" },
];

export const pickupStages: { id: PickupStage; label: string }[] = [
  { id: "nfe_recebida", label: "NF-e recebida" },
  { id: "coleta_agendada", label: "Coleta agendada" },
  { id: "em_coleta", label: "Em coleta" },
  { id: "coletado", label: "Coletado" },
  { id: "aguardando_cte", label: "Aguardando CT-e" },
  { id: "pronto_viagem", label: "Pronto p/ viagem" },
  { id: "em_viagem", label: "Em viagem" },
];

// ============ MODULE 3: Monitoring / Track & Trace =============

export type TrackingStatus = "aguardando" | "coletado" | "em_transito" | "chegou_base" | "saiu_entrega" | "entregue" | "ocorrencia";

export interface TrackingEvent {
  quando: string;
  local: string;
  descricao: string;
  status: TrackingStatus;
}

export interface Shipment {
  id: string;
  cliente: string;
  cte: string;
  origem: string;
  destino: string;
  destinoUf: string;
  previsao: string;
  atualStatus: TrackingStatus;
  eventos: TrackingEvent[];
  motorista?: string;
  placa?: string;
  atrasoHoras: number;
  ultimoFollow?: string;
}

export const shipments: Shipment[] = [
  {
    id: "COL-9001", cliente: "Ambev", cte: "CTe 442.881", origem: "Guarulhos/SP", destino: "Campinas/SP", destinoUf: "SP",
    previsao: "hoje 14:20", atualStatus: "saiu_entrega", motorista: "Carlos Andrade", placa: "RIO-2A81", atrasoHoras: 0, ultimoFollow: "hoje 09:10",
    eventos: [
      { quando: "16/07 06:20", local: "CD Guarulhos", descricao: "Coleta realizada", status: "coletado" },
      { quando: "16/07 08:10", local: "CD Guarulhos", descricao: "Em trânsito para filial", status: "em_transito" },
      { quando: "16/07 11:00", local: "Base Campinas", descricao: "Chegou na base de destino", status: "chegou_base" },
      { quando: "16/07 13:22", local: "Base Campinas", descricao: "Saiu para entrega", status: "saiu_entrega" },
    ],
  },
  {
    id: "COL-9002", cliente: "Natura", cte: "CTe 442.902", origem: "Cajamar/SP", destino: "Rio de Janeiro/RJ", destinoUf: "RJ",
    previsao: "hoje 18:45", atualStatus: "em_transito", motorista: "Felipe Rocha", placa: "SPX-9C22", atrasoHoras: 0,
    eventos: [
      { quando: "16/07 05:40", local: "Natura Cajamar", descricao: "Coleta realizada", status: "coletado" },
      { quando: "16/07 07:22", local: "Rod. Dutra km 210", descricao: "Em trânsito", status: "em_transito" },
    ],
  },
  {
    id: "COL-9005", cliente: "Renner", cte: "CTe 441.198", origem: "Extrema/MG", destino: "Curitiba/PR", destinoUf: "PR",
    previsao: "hoje 16:10", atualStatus: "em_transito", motorista: "Marcos Lima", placa: "PAR-7B90", atrasoHoras: 0,
    eventos: [
      { quando: "15/07 21:00", local: "CD Extrema", descricao: "Coleta realizada", status: "coletado" },
      { quando: "16/07 04:12", local: "Rod. Régis Bittencourt", descricao: "Em trânsito", status: "em_transito" },
    ],
  },
  {
    id: "COL-8971", cliente: "iFood", cte: "CTe 440.812", origem: "Osasco/SP", destino: "Santos/SP", destinoUf: "SP",
    previsao: "concluído 11:32", atualStatus: "entregue", motorista: "Ana Souza", placa: "SPX-1D45", atrasoHoras: 0,
    eventos: [
      { quando: "16/07 07:10", local: "Osasco", descricao: "Coleta realizada", status: "coletado" },
      { quando: "16/07 09:40", local: "Base Santos", descricao: "Chegou na base", status: "chegou_base" },
      { quando: "16/07 10:44", local: "Santos/SP", descricao: "Saiu para entrega", status: "saiu_entrega" },
      { quando: "16/07 11:32", local: "Santos/SP", descricao: "Entregue — assin. J.Silva", status: "entregue" },
    ],
  },
  {
    id: "COL-8988", cliente: "Casas Bahia", cte: "CTe 440.921", origem: "Jundiaí/SP", destino: "São José/SC", destinoUf: "SC",
    previsao: "atrasado 3h", atualStatus: "ocorrencia", motorista: "Rafael Costa", placa: "SPX-4E11", atrasoHoras: 3, ultimoFollow: "—",
    eventos: [
      { quando: "15/07 20:00", local: "Jundiaí", descricao: "Coleta realizada", status: "coletado" },
      { quando: "16/07 02:20", local: "BR-116 km 88", descricao: "Pane elétrica", status: "ocorrencia" },
    ],
  },
  {
    id: "COL-9003", cliente: "Magazine Luiza", cte: "CTe 441.021", origem: "Louveira/SP", destino: "Belo Horizonte/MG", destinoUf: "MG",
    previsao: "amanhã 08:00", atualStatus: "aguardando", motorista: "Marcos Lima", placa: "PAR-7B90", atrasoHoras: 0,
    eventos: [
      { quando: "16/07 10:41", local: "CD Louveira", descricao: "Pronto para viagem", status: "aguardando" },
    ],
  },
];

// ============ MODULE 4: Warehouse extras (inbound / outbound / picking) =============

export interface WarehouseInbound {
  id: string;
  cliente: string;
  nfRemessa: string;
  data: string;
  volumes: number;
  peso: number;
  status: "recebida" | "em_conferencia" | "enderecada";
  endereco?: string;
}

export const warehouseInbound: WarehouseInbound[] = [
  { id: "IN-5501", cliente: "Ambev", nfRemessa: "NF 114.201", data: "16/07 07:10", volumes: 240, peso: 4820, status: "enderecada", endereco: "A-12-04" },
  { id: "IN-5502", cliente: "Natura", nfRemessa: "NF 212.104", data: "16/07 08:22", volumes: 88, peso: 620, status: "em_conferencia" },
  { id: "IN-5503", cliente: "Renner", nfRemessa: "NF 508.712", data: "16/07 09:45", volumes: 412, peso: 3210, status: "enderecada", endereco: "B-08-10" },
  { id: "IN-5504", cliente: "Magazine Luiza", nfRemessa: "NF 318.720", data: "16/07 11:14", volumes: 62, peso: 1840, status: "recebida" },
];

export interface WarehouseOutbound {
  id: string;
  cliente: string;
  nfVenda: string;
  destinatario: string;
  cidade: string;
  itens: number;
  status: "aguardando_separacao" | "em_separacao" | "conferencia" | "aguardando_retorno" | "baixado";
  separador?: string;
  nfRetorno?: string;
  atualizadoEm: string;
}

export const warehouseOutbound: WarehouseOutbound[] = [
  { id: "OUT-7701", cliente: "Ambev", nfVenda: "NF 114.881", destinatario: "Bar do Chico", cidade: "Santos/SP", itens: 48, status: "em_separacao", separador: "Luiz Prado", atualizadoEm: "12:04" },
  { id: "OUT-7702", cliente: "Natura", nfVenda: "NF 212.442", destinatario: "Consultora RJ 8812", cidade: "Rio de Janeiro/RJ", itens: 14, status: "aguardando_separacao", atualizadoEm: "11:12" },
  { id: "OUT-7703", cliente: "Renner", nfVenda: "NF 508.901", destinatario: "Loja Curitiba", cidade: "Curitiba/PR", itens: 210, status: "conferencia", separador: "Aline Duarte", atualizadoEm: "10:48" },
  { id: "OUT-7704", cliente: "Magazine Luiza", nfVenda: "NF 318.812", destinatario: "Loja BH Savassi", cidade: "Belo Horizonte/MG", itens: 32, status: "aguardando_retorno", separador: "Luiz Prado", atualizadoEm: "09:22" },
  { id: "OUT-7705", cliente: "Ambev", nfVenda: "NF 114.702", destinatario: "Distrib. Sorocaba", cidade: "Sorocaba/SP", itens: 22, status: "baixado", separador: "Aline Duarte", nfRetorno: "NF 114.703-R", atualizadoEm: "08:11" },
];

export interface StockMovement {
  id: string;
  tipo: "entrada" | "saida" | "transferencia" | "ajuste";
  cliente: string;
  sku: string;
  qtd: number;
  origem: string;
  destino: string;
  quando: string;
  responsavel: string;
}

export const stockMovements: StockMovement[] = [
  { id: "MV-991201", tipo: "entrada", cliente: "Ambev", sku: "SKU-40012", qtd: 4820, origem: "NF 114.201", destino: "A-12-04", quando: "16/07 07:22", responsavel: "Luiz Prado" },
  { id: "MV-991202", tipo: "saida", cliente: "Ambev", sku: "SKU-40012", qtd: 48, origem: "A-12-04", destino: "NF 114.881", quando: "16/07 12:04", responsavel: "Luiz Prado" },
  { id: "MV-991203", tipo: "entrada", cliente: "Renner", sku: "SKU-91120", qtd: 3210, origem: "NF 508.712", destino: "B-08-10", quando: "16/07 09:50", responsavel: "Aline Duarte" },
  { id: "MV-991204", tipo: "transferencia", cliente: "Natura", sku: "SKU-51201", qtd: 120, origem: "C-04-11", destino: "C-04-14", quando: "16/07 10:14", responsavel: "Fabio Assis" },
  { id: "MV-991205", tipo: "ajuste", cliente: "Casas Bahia", sku: "SKU-70088", qtd: -2, origem: "D-03-04", destino: "avaria", quando: "16/07 08:41", responsavel: "Aline Duarte" },
];

// ============ MODULE 5: Financeiro (Receivables + Expenses + Cashflow) =============

export interface Invoice {
  numero: string;
  cliente: string;
  emissao: string;
  vencimento: string;
  valor: number;
  status: "paga" | "aberta" | "vencida" | "emitida";
  tipo: "CTe" | "NF-e" | "Fatura";
}

export const invoices: Invoice[] = [
  { numero: "CTe 000.442.881", cliente: "Ambev", emissao: "18/07", vencimento: "17/08", valor: 184_200, status: "aberta", tipo: "CTe" },
  { numero: "CTe 000.442.902", cliente: "Natura", emissao: "18/07", vencimento: "17/08", valor: 62_800, status: "aberta", tipo: "CTe" },
  { numero: "Fatura 88214", cliente: "Petrobras", emissao: "01/07", vencimento: "31/07", valor: 421_000, status: "paga", tipo: "Fatura" },
  { numero: "Fatura 88190", cliente: "Casas Bahia", emissao: "12/06", vencimento: "12/07", valor: 148_200, status: "vencida", tipo: "Fatura" },
  { numero: "CTe 000.441.021", cliente: "Magazine Luiza", emissao: "10/07", vencimento: "09/08", valor: 92_400, status: "aberta", tipo: "CTe" },
  { numero: "NF-e 004.881", cliente: "Renner", emissao: "16/07", vencimento: "15/08", valor: 41_800, status: "emitida", tipo: "NF-e" },
  { numero: "Fatura 88176", cliente: "iFood", emissao: "05/07", vencimento: "04/08", valor: 78_200, status: "paga", tipo: "Fatura" },
];

export type ExpenseType = "fixa" | "variavel" | "frete_terceiros" | "administrativa";
export type ExpenseArea = "operacao" | "armazem" | "frota" | "administrativa" | "comercial";

export interface Expense {
  id: string;
  descricao: string;
  tipo: ExpenseType;
  area: ExpenseArea;
  fornecedor: string;
  valor: number;
  vencimento: string;
  status: "prevista" | "paga" | "vencida";
  recorrente: boolean;
}

export const expenses: Expense[] = [
  { id: "DES-001", descricao: "Aluguel CD Guarulhos", tipo: "fixa", area: "armazem", fornecedor: "Prologis", valor: 128_000, vencimento: "05/08", status: "prevista", recorrente: true },
  { id: "DES-002", descricao: "Folha operacional", tipo: "fixa", area: "operacao", fornecedor: "Interno", valor: 342_000, vencimento: "05/08", status: "prevista", recorrente: true },
  { id: "DES-003", descricao: "Combustível frota", tipo: "variavel", area: "frota", fornecedor: "Ipiranga Frotas", valor: 184_200, vencimento: "20/07", status: "paga", recorrente: false },
  { id: "DES-004", descricao: "Pedágio Sem Parar", tipo: "variavel", area: "frota", fornecedor: "Sem Parar", valor: 42_800, vencimento: "25/07", status: "prevista", recorrente: true },
  { id: "DES-005", descricao: "Manutenção preventiva SPX-4E11", tipo: "variavel", area: "frota", fornecedor: "Truck Center", valor: 12_400, vencimento: "22/07", status: "prevista", recorrente: false },
  { id: "DES-006", descricao: "Subcontratação Trans XPT", tipo: "frete_terceiros", area: "operacao", fornecedor: "Trans XPT", valor: 92_100, vencimento: "18/07", status: "vencida", recorrente: false },
  { id: "DES-007", descricao: "Subcontratação RodoSul", tipo: "frete_terceiros", area: "operacao", fornecedor: "RodoSul Ltda", valor: 62_800, vencimento: "28/07", status: "prevista", recorrente: false },
  { id: "DES-008", descricao: "Software TMS/WMS", tipo: "fixa", area: "administrativa", fornecedor: "TOTVS", valor: 24_800, vencimento: "10/08", status: "prevista", recorrente: true },
  { id: "DES-009", descricao: "Marketing digital", tipo: "administrativa", area: "comercial", fornecedor: "Agência ONE", valor: 18_000, vencimento: "15/08", status: "prevista", recorrente: true },
  { id: "DES-010", descricao: "Seguro carga anual", tipo: "fixa", area: "operacao", fornecedor: "Porto Seguro", valor: 62_000, vencimento: "30/07", status: "prevista", recorrente: false },
  { id: "DES-011", descricao: "Energia elétrica CD", tipo: "variavel", area: "armazem", fornecedor: "Enel", valor: 22_400, vencimento: "12/08", status: "prevista", recorrente: true },
];

export const cashflowSeries = [
  { semana: "S1", receita: 620_000, despesa: 480_000 },
  { semana: "S2", receita: 712_000, despesa: 512_000 },
  { semana: "S3", receita: 684_000, despesa: 498_000 },
  { semana: "S4", receita: 812_000, despesa: 604_000 },
  { semana: "S5", receita: 748_000, despesa: 542_000 },
  { semana: "S6", receita: 894_000, despesa: 612_000 },
  { semana: "S7", receita: 1_020_000, despesa: 684_000 },
  { semana: "S8", receita: 940_000, despesa: 648_000 },
];

/** Simple sparkline series for the dashboard */
export const throughputSeries = [
  42, 51, 48, 62, 58, 71, 68, 74, 80, 76, 84, 88, 91, 87, 96, 102, 98, 110, 118, 124, 121, 132, 128, 141,
];

export const slaSeries = [94, 95, 93, 96, 97, 95, 98, 96, 97, 98, 99, 97];

export function statusLabel(s: OrderStatus): string {
  return {
    coleta: "Coleta",
    armazem: "No CD",
    em_rota: "Em rota",
    entregue: "Entregue",
    ocorrencia: "Ocorrência",
  }[s];
}

export function statusTone(s: string): "cyan" | "amber" | "success" | "danger" | "muted" | "info" {
  const map: Record<string, "cyan" | "amber" | "success" | "danger" | "muted" | "info"> = {
    em_rota: "cyan",
    coleta: "info",
    armazem: "amber",
    entregue: "success",
    ocorrencia: "danger",
    programada: "muted",
    concluida: "success",
    atrasada: "danger",
    ativo: "success",
    manutencao: "amber",
    parado: "muted",
    disponivel: "success",
    descanso: "muted",
    afastado: "danger",
    renovacao: "amber",
    inadimplente: "danger",
    prospect: "info",
    paga: "success",
    aberta: "cyan",
    vencida: "danger",
    emitida: "info",
    prevista: "cyan",
    // pickup stages
    nfe_recebida: "info",
    coleta_agendada: "cyan",
    em_coleta: "cyan",
    coletado: "amber",
    aguardando_cte: "amber",
    pronto_viagem: "cyan",
    em_viagem: "success",
    // tracking
    aguardando: "muted",
    em_transito: "cyan",
    chegou_base: "amber",
    saiu_entrega: "cyan",
    // warehouse
    recebida: "cyan",
    em_conferencia: "amber",
    enderecada: "success",
    aguardando_separacao: "amber",
    em_separacao: "cyan",
    conferencia: "cyan",
    aguardando_retorno: "amber",
    baixado: "success",
    // CRM
    lead: "info",
    cotacao: "cyan",
    negociacao: "amber",
    fechado: "success",
    perdido: "danger",
    // quotations
    aprovada: "success",
    recusada: "danger",
  };
  return map[s] ?? "muted";
}

/** shared helper */
export function toneClass(tone: ReturnType<typeof statusTone>): string {
  switch (tone) {
    case "cyan": return "text-primary bg-primary/10 border-primary/30";
    case "amber": return "text-accent bg-accent/10 border-accent/30";
    case "success": return "text-success bg-success/10 border-success/30";
    case "danger": return "text-danger bg-danger/10 border-danger/30";
    case "info": return "text-info bg-info/10 border-info/30";
    default: return "text-muted-foreground bg-muted/40 border-border";
  }
}
