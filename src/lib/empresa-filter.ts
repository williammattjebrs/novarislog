// Filtro global "Empresa: Todas / X", salvo por usuário neste navegador e compartilhado por todas as páginas.
import { useSyncExternalStore } from "react";
import type { Invoice, Expense, OrdemColeta, Order } from "./mock-data";

const KEY = "novaris.empresaFiltro";
const subs = new Set<() => void>();
let atual = "";
let carregado = false;
function load() {
  if (carregado || typeof window === "undefined") return;
  carregado = true;
  try { atual = localStorage.getItem(KEY) ?? ""; } catch { atual = ""; }
}
export function setEmpresaFiltro(id: string) {
  atual = id;
  try { localStorage.setItem(KEY, id); } catch { /* ignora */ }
  subs.forEach((f) => f());
}
/** "" = todas; "__sem" = registros sem empresa vinculada; senão o id da empresa. */
export function useEmpresaFiltro(): [string, (id: string) => void] {
  const v = useSyncExternalStore(
    (cb) => { load(); subs.add(cb); cb(); return () => { subs.delete(cb); }; },
    () => { load(); return atual; },
    () => "",
  );
  return [v, setEmpresaFiltro];
}
export const casaEmpresa = (filtro: string, empresaId?: string) => !filtro || (filtro === "__sem" ? !empresaId : empresaId === filtro);
export const filtrarOcs = (filtro: string, ocs: OrdemColeta[]) => ocs.filter((o) => casaEmpresa(filtro, o.empresaId));
/** NF pertence à empresa da OC ativa que a contém. */
export function filtrarNfs(filtro: string, nfs: Order[], ocs: OrdemColeta[]) {
  if (!filtro) return nfs;
  const empresaDaNf = new Map<string, string | undefined>();
  for (const o of ocs) if (o.status !== "cancelada") o.orderIds.forEach((id) => empresaDaNf.set(id, o.empresaId));
  return nfs.filter((n) => casaEmpresa(filtro, empresaDaNf.get(n.id)));
}
export const filtrarFin = <T extends Invoice | Expense>(filtro: string, xs: T[]) => xs.filter((x) => casaEmpresa(filtro, x.empresaId));
