// Store persistente em localStorage. CRUD genérico + hooks React.
// Estrutura pronta para trocar por Lovable Cloud depois — todas as
// telas usam esse store, não arrays estáticos.

import { useEffect, useState, useSyncExternalStore } from "react";
import type {
  Client, FreightTable, RouteRate, Quotation, CRMDeal, Order,
  WarehouseInbound, WarehouseOutbound, StockItem, Invoice, Expense,
  AppConfig, ClientGroup, ExpenseGroup, Rota, OrdemColeta, Motorista, Veiculo,
} from "./mock-data";
import { DEFAULT_CONFIG } from "./mock-data";
import { getDoc, getList, notify, setDoc, setList, startSharedSync, subscribe, sharedReady } from "./shared-db";
if (typeof window !== "undefined") startSharedSync();

const PREFIX = "novaris:";
const isBrowser = typeof window !== "undefined";

type StoreKey =
  | "clients"
  | "freightTables"
  | "routeRates"
  | "quotations"
  | "crmDeals"
  | "orders"
  | "warehouseInbound"
  | "warehouseOutbound"
  | "stock"
  | "invoices"
  | "expenses"
  | "clientGroups"
  | "expenseGroups"
  | "rotas"
  | "ordensColeta"
  | "motoristas"
  | "veiculos"
  | "config";

// Dados compartilhados no banco (app_records) com cache local e realtime.
function read<T>(key: StoreKey, fallback: T): T {
  if (!isBrowser) return fallback;
  if (key === "config") return (getDoc<T>("config") ?? fallback);
  return (getList<any>(key) as T | undefined) ?? fallback;
}

function write<T>(key: StoreKey, val: T) {
  if (!isBrowser) return;
  if (key === "config") setDoc("config", val);
  else setList(key, val as any[]);
}
void PREFIX;

// ==================================================================
// Hook genérico — coleção CRUD
// ==================================================================
function useCollection<T extends { id?: string }>(
  key: StoreKey,
  fallback: T[] = [],
) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribe(key, () => setTick((t) => t + 1));
    return unsub;
  }, [key]);
  const list = read<T[]>(key, fallback);

  return {
    list,
    set: (next: T[]) => write(key, next),
    add: (item: T) => write(key, [item, ...read<T[]>(key, [])]),
    update: (id: string, patch: Partial<T>) =>
      write(
        key,
        read<T[]>(key, []).map((x: any) => (x.id === id ? { ...x, ...patch } : x)),
      ),
    remove: (id: string) =>
      write(
        key,
        read<T[]>(key, []).filter((x: any) => x.id !== id),
      ),
    clear: () => write(key, [] as T[]),
  };
}

// ==================================================================
// Hooks tipados por entidade
// ==================================================================
export const useClients = () => useCollection<Client>("clients");
export const useFreightTables = () => useCollection<FreightTable>("freightTables");
export const useRouteRates = () => useCollection<RouteRate>("routeRates");
export const useQuotations = () => useCollection<Quotation>("quotations");
export const useCRMDeals = () => useCollection<CRMDeal>("crmDeals");
export const useOrders = () => useCollection<Order>("orders");
export const useWarehouseInbound = () => useCollection<WarehouseInbound>("warehouseInbound");
export const useWarehouseOutbound = () => useCollection<WarehouseOutbound>("warehouseOutbound");
export const useStock = () => useCollection<StockItem & { id?: string }>("stock");
export const useInvoices = () => useCollection<Invoice & { id?: string }>("invoices");
export const useExpenses = () => useCollection<Expense>("expenses");
export const useRotas = () => useCollection<Rota>("rotas");
export const useOrdensColeta = () => useCollection<OrdemColeta>("ordensColeta");
export const useMotoristas = () => useCollection<Motorista>("motoristas");
export const useVeiculos = () => useCollection<Veiculo>("veiculos");
export const useClientGroups = () => useCollection<ClientGroup>("clientGroups");
export const DEFAULT_EXPENSE_GROUPS: ExpenseGroup[] = [
  { id: "EG-OPER", nome: "Operação" },
  { id: "EG-ADM", nome: "Administrativo" },
  { id: "EG-MKT", nome: "Marketing" },
  { id: "EG-TI", nome: "TI" },
];
export const useExpenseGroups = () => useCollection<ExpenseGroup>("expenseGroups", DEFAULT_EXPENSE_GROUPS);

// ==================================================================
// Config global
// ==================================================================
let cfgCacheRaw: unknown = undefined;
let cfgCacheVal: AppConfig = DEFAULT_CONFIG;
function configSnapshot(): AppConfig {
  if (!isBrowser) return DEFAULT_CONFIG;
  const raw = getDoc<AppConfig>("config");
  if (raw === cfgCacheRaw) return cfgCacheVal;
  cfgCacheRaw = raw;
  cfgCacheVal = raw ? ({ ...DEFAULT_CONFIG, ...raw } as AppConfig) : DEFAULT_CONFIG;
  return cfgCacheVal;
}

export function useConfig(): [AppConfig, (next: AppConfig) => void] {
  const cfg = useSyncExternalStore(
    (cb) => subscribe("config", cb),
    configSnapshot,
    () => DEFAULT_CONFIG,
  );
  const set = (next: AppConfig) => write("config", next);
  return [cfg, set];
}

// ==================================================================
// Utilitários síncronos (para busca dentro de handlers, sem hook)
// ==================================================================
export function getFreightTables(): FreightTable[] {
  return read<FreightTable[]>("freightTables", []);
}
export function getQuotations(): Quotation[] {
  return read<Quotation[]>("quotations", []);
}
export function getClients(): Client[] {
  return read<Client[]>("clients", []);
}
export function getConfigSync(): AppConfig {
  return configSnapshot();
}

export function resetAllData() {
  if (!isBrowser) return;
  Object.keys(localStorage).filter(k => k.startsWith("novaris:")).forEach(k => localStorage.removeItem(k));
  if (!isBrowser) return;
  (["clients", "freightTables", "routeRates", "quotations", "crmDeals", "orders",
    "warehouseInbound", "warehouseOutbound", "stock", "invoices", "expenses", "clientGroups"] as StoreKey[]
  ).forEach((k) => { write(k, []); notify(k); });
}

// util: gera ID curto
export function newId(prefix = "ID"): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}
