import type { Client, Order } from "./mock-data";
export const digits = (value: string) => value.replace(/\D/g, "");
export function identifyClient(clients: Client[], cnpj: string) {
  const key = digits(cnpj);
  const matches = key ? clients.filter((c) => c.cnpjs.some((x) => digits(x.cnpj) === key)) : [];
  return { client: matches.length === 1 ? matches[0] : null, ambiguous: matches.length > 1 };
}
export function compareCte(base: number, fiscal: number, tolerance: number) {
  if (!(Number.isFinite(base) && base > 0 && Number.isFinite(fiscal) && fiscal > 0)) return { status: "pendente" as const, percent: undefined, base, fiscal, tolerance };
  const percent = (fiscal - base) / base * 100;
  return { status: Math.abs(percent) > tolerance ? "divergente" as const : "conferido" as const, percent, base, fiscal, tolerance };
}
export function allocateCte(total: number, orders: Pick<Order, "id" | "valorFrete" | "origemValor" | "peso">[]) {
  if (!(total > 0) || !orders.length) return { method: "pendente" as const, allocations: [] as { orderId: string; value: number }[] };
  // Regra: rateio pelo % do peso de cada NF sobre o total; frete previsto só como alternativa.
  const weight = orders.every((o) => Number.isFinite(o.peso) && o.peso > 0);
  const freight = !weight && orders.every((o) => o.valorFrete > 0 && !!o.origemValor);
  if (!freight && !weight) return { method: "pendente" as const, allocations: [] as { orderId: string; value: number }[] };
  const weights = orders.map((o) => weight ? o.peso : o.valorFrete);
  const sum = weights.reduce((a, b) => a + b, 0), cents = Math.round(total * 100);
  const shares = weights.map((w) => Math.floor(cents * w / sum));
  const ranked = weights.map((w, i) => ({ i, remainder: cents * w / sum - shares[i] })).sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (let i = 0, left = cents - shares.reduce((a, b) => a + b, 0); i < left; i++) shares[ranked[i % ranked.length].i]++;
  return { method: freight ? "frete" as const : "peso" as const, allocations: orders.map((o, i) => ({ orderId: o.id, value: shares[i] / 100 })) };
}
export function financialState(o: Order, tolerance = 2) {
  if (!o.cteChave) return "sem_documento";
  return o.conferencia?.status ?? compareCte(o.origemValor ? o.valorFrete : 0, o.cteValor ?? 0, tolerance).status;
}
export function isoDate(value: string) {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const date = br ? `${br[3]}-${br[2]}-${br[1]}` : value.slice(0, 10);
  const parsed = new Date(date + "T12:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error("Data inválida.");
  return date;
}
export type Movement = { id: string; type: "baixa" | "estorno"; value: number; date: string; author: string; reason: string; reverses?: string; account?: string };
export function paidAmount(movements: Movement[] = [], legacy = 0) { return Math.round((legacy + movements.reduce((s, m) => s + (m.type === "estorno" ? -m.value : m.value), 0)) * 100) / 100; }
export function addPayment(total: number, movements: Movement[], legacy: number, movement: Movement) {
  isoDate(movement.date);
  const remaining = Math.round((total - paidAmount(movements, legacy)) * 100) / 100;
  if (!Number.isFinite(movement.value) || movement.value <= 0 || movement.value > remaining + 0.001) throw new Error("Informe um valor positivo, limitado ao saldo restante.");
  return [...movements, movement];
}
export function reversePayment(movements: Movement[], id: string, author: string, reason: string, date: string): Movement[] {
  const original = movements.find((m) => m.id === id && m.type === "baixa");
  if (!original || movements.some((m) => m.reverses === id) || !reason.trim()) throw new Error("Estorno inválido: informe o motivo e selecione uma baixa não estornada.");
  return [...movements, { id: crypto.randomUUID(), type: "estorno", value: original.value, date: isoDate(date), author, reason: reason.trim(), reverses: id }];
}