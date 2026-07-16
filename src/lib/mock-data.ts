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

export interface Vehicle {
  placa: string;
  tipo: string;
  modelo: string;
  capacidade: number;
  status: "ativo" | "manutencao" | "parado" | "em_rota";
  odometro: number;
  proxRevisao: number;
  documento: string;
}

export const vehicles: Vehicle[] = [
  { placa: "RIO-2A81", tipo: "Truck", modelo: "VW Constellation 24.280", capacidade: 12000, status: "em_rota", odometro: 184320, proxRevisao: 2100, documento: "ok" },
  { placa: "SPX-9C22", tipo: "Bitrem", modelo: "Scania R450", capacidade: 37000, status: "em_rota", odometro: 421890, proxRevisao: 420, documento: "ok" },
  { placa: "PAR-7B90", tipo: "Truck", modelo: "Volvo VM 270", capacidade: 14000, status: "em_rota", odometro: 98120, proxRevisao: 5210, documento: "ok" },
  { placa: "SPX-4E11", tipo: "Carreta", modelo: "Mercedes Actros 2651", capacidade: 27000, status: "em_rota", odometro: 312400, proxRevisao: -140, documento: "vencido" },
  { placa: "SPX-1D45", tipo: "VUC", modelo: "Iveco Daily", capacidade: 3500, status: "ativo", odometro: 74210, proxRevisao: 1800, documento: "ok" },
  { placa: "SPX-6F02", tipo: "3/4", modelo: "Ford Cargo 816", capacidade: 6500, status: "ativo", odometro: 142100, proxRevisao: 900, documento: "ok" },
  { placa: "SPX-2H88", tipo: "Truck", modelo: "MAN TGX 29.480", capacidade: 15000, status: "manutencao", odometro: 268400, proxRevisao: 0, documento: "ok" },
  { placa: "SPX-8K12", tipo: "VUC", modelo: "Renault Master", capacidade: 3200, status: "parado", odometro: 41200, proxRevisao: 3200, documento: "ok" },
];

export interface Driver {
  nome: string;
  cnh: string;
  categoria: string;
  telefone: string;
  status: "disponivel" | "em_rota" | "descanso" | "afastado";
  entregas: number;
  score: number;
  vinculo: string;
}

export const drivers: Driver[] = [
  { nome: "Carlos Andrade", cnh: "E - venc. 08/2027", categoria: "E", telefone: "(11) 9 8412-0021", status: "em_rota", entregas: 812, score: 96, vinculo: "CLT" },
  { nome: "Felipe Rocha", cnh: "E - venc. 03/2026", categoria: "E", telefone: "(11) 9 9024-1187", status: "em_rota", entregas: 640, score: 92, vinculo: "CLT" },
  { nome: "Marcos Lima", cnh: "D - venc. 11/2028", categoria: "D", telefone: "(41) 9 8871-4402", status: "em_rota", entregas: 421, score: 88, vinculo: "Agregado" },
  { nome: "Rafael Costa", cnh: "E - venc. 05/2025", categoria: "E", telefone: "(48) 9 9412-0812", status: "em_rota", entregas: 704, score: 74, vinculo: "Agregado" },
  { nome: "Ana Souza", cnh: "C - venc. 02/2029", categoria: "C", telefone: "(11) 9 9812-3341", status: "disponivel", entregas: 291, score: 98, vinculo: "CLT" },
  { nome: "Juliana Prado", cnh: "D - venc. 07/2027", categoria: "D", telefone: "(11) 9 8112-7789", status: "disponivel", entregas: 512, score: 94, vinculo: "CLT" },
  { nome: "Pedro Vasques", cnh: "E - venc. 09/2026", categoria: "E", telefone: "(11) 9 9214-4487", status: "descanso", entregas: 388, score: 90, vinculo: "Agregado" },
  { nome: "Sérgio Matos", cnh: "E - venc. 12/2024", categoria: "E", telefone: "(11) 9 8710-2214", status: "afastado", entregas: 620, score: 82, vinculo: "CLT" },
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
  segmento: string;
  contrato: string;
  volMensal: number;
  faturamentoMes: number;
  sla: number;
  status: "ativo" | "renovacao" | "inadimplente";
}

export const clients: Client[] = [
  { nome: "Ambev", segmento: "Bebidas", contrato: "MSA-2023-014", volMensal: 4820, faturamentoMes: 1_240_800, sla: 98.4, status: "ativo" },
  { nome: "Natura", segmento: "Cosméticos", contrato: "MSA-2024-007", volMensal: 1980, faturamentoMes: 612_400, sla: 96.1, status: "ativo" },
  { nome: "Magazine Luiza", segmento: "Varejo", contrato: "MSA-2022-041", volMensal: 3210, faturamentoMes: 984_200, sla: 94.7, status: "renovacao" },
  { nome: "Petrobras", segmento: "Óleo & Gás", contrato: "MSA-2021-002", volMensal: 620, faturamentoMes: 1_820_000, sla: 99.2, status: "ativo" },
  { nome: "Renner", segmento: "Varejo", contrato: "MSA-2024-018", volMensal: 2410, faturamentoMes: 542_100, sla: 95.8, status: "ativo" },
  { nome: "Casas Bahia", segmento: "Varejo", contrato: "MSA-2023-032", volMensal: 1740, faturamentoMes: 421_800, sla: 91.2, status: "inadimplente" },
  { nome: "iFood", segmento: "Delivery", contrato: "MSA-2024-021", volMensal: 5820, faturamentoMes: 312_400, sla: 97.6, status: "ativo" },
];

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

export function statusTone(
  s: OrderStatus | Route["status"] | Vehicle["status"] | Driver["status"] | Client["status"] | Invoice["status"],
): "cyan" | "amber" | "success" | "danger" | "muted" | "info" {
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
    paga: "success",
    aberta: "cyan",
    vencida: "danger",
    emitida: "info",
  };
  return map[s] ?? "muted";
}
