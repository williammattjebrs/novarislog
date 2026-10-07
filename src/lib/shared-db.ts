// Sincronização das coleções do app com o banco compartilhado (tabela app_records).
// Mantém cache em memória + localStorage para leitura instantânea e replica via realtime.
import { supabase } from "@/integrations/supabase/client";

const PREFIX = "novaris:";
const isBrowser = typeof window !== "undefined";
type Row = { collection: string; id: string; data: any; criado_em: string };

const listeners: Record<string, Set<() => void>> = {};
export function notify(key: string) { listeners[key]?.forEach((l) => l()); }
export function subscribe(key: string, cb: () => void) {
  (listeners[key] ??= new Set()).add(cb);
  return () => { listeners[key].delete(cb); };
}

// Coleções em lista: key -> array; documentos únicos (config) guardados com id "__doc"
const cache: Record<string, any[]> = {};
let started = false;

function persistLocal(key: string) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(cache[key])); } catch { /* ignore */ }
}
export function getList<T>(key: string): T[] | undefined {
  if (!isBrowser) return undefined;
  if (!cache[key]) {
    try { const raw = localStorage.getItem(PREFIX + key); if (raw) cache[key] = JSON.parse(raw); } catch { /* ignore */ }
  }
  return cache[key];
}

function withIds(list: any[], key: string) {
  return list.map((x, i) => (x && typeof x === "object" && x.id ? x : { ...x, id: `${key}-${Date.now().toString(36)}-${i}` }));
}

export function setList(key: string, next: any[]) {
  if (!isBrowser) return;
  const prev = cache[key] ?? [];
  const list = withIds(next, key);
  cache[key] = list;
  persistLocal(key);
  notify(key);
  const prevMap = new Map(prev.map((x: any) => [x.id, JSON.stringify(x)]));
  const ids = new Set(list.map((x) => x.id));
  const upserts = list.filter((x) => prevMap.get(x.id) !== JSON.stringify(x)).map((x) => ({ collection: key, id: String(x.id), data: x }));
  const removed = prev.filter((x: any) => !ids.has(x.id)).map((x: any) => String(x.id));
  void pushChanges(key, upserts, removed);
}

async function pushChanges(key: string, upserts: any[], removed: string[]) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  if (upserts.length) {
    const { error } = await supabase.from("app_records").upsert(upserts, { onConflict: "collection,id" });
    if (error) console.error("Falha ao salvar no banco", key, error);
  }
  if (removed.length) {
    const { error } = await supabase.from("app_records").delete().eq("collection", key).in("id", removed);
    if (error) console.error("Falha ao excluir no banco", key, error);
  }
}

// Documento único (ex.: config)
export function getDoc<T>(key: string): T | undefined { return getList<any>(key)?.[0]?.value; }
export function setDoc(key: string, value: any) { setList(key, [{ id: "__doc", value }]); }

async function loadAll() {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return;
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("app_records").select("collection,id,data,criado_em").order("criado_em", { ascending: false }).range(from, from + 999);
    if (error) { console.error("Falha ao carregar banco", error); return; }
    rows.push(...(data as Row[]));
    if (!data || data.length < 1000) break;
  }
  const grouped: Record<string, any[]> = {};
  rows.forEach((r) => (grouped[r.collection] ??= []).push(r.data));
  // Migra dados locais antigos para coleções ainda vazias no banco
  const localKeys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  for (const lk of localKeys) {
    const key = lk.slice(PREFIX.length);
    if (grouped[key]) continue;
    try {
      const val = JSON.parse(localStorage.getItem(lk) ?? "null");
      if (key === "config" && val && !Array.isArray(val)) { cache[key] = []; setDoc(key, val); continue; }
      if (key.startsWith("tracking-group:")) {
        if (val && !grouped["trackingGroups"]) { const id = key.slice("tracking-group:".length); setList("trackingGroups", [...(cache["trackingGroups"] ?? []).filter((g: any) => g.id !== id), { ...val, id }]); }
        continue;
      }
      if (Array.isArray(val) && val.length) { cache[key] = []; setList(key, val); }
    } catch { /* ignore */ }
  }
  Object.entries(grouped).forEach(([k, list]) => { cache[k] = list; persistLocal(k); notify(k); });
}

export function startSharedSync() {
  if (!isBrowser || started) return;
  started = true;
  void loadAll();
  supabase.auth.onAuthStateChange((event) => { if (event === "SIGNED_IN") void loadAll(); });
  supabase.channel("app_records_sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "app_records" }, (p: any) => {
      const row = (p.new && p.new.collection ? p.new : p.old) as Row;
      if (!row?.collection) return;
      const key = row.collection;
      const list = [...(cache[key] ?? [])];
      const idx = list.findIndex((x: any) => String(x.id) === row.id);
      if (p.eventType === "DELETE") { if (idx >= 0) list.splice(idx, 1); }
      else if (idx >= 0) list[idx] = p.new.data; else list.unshift(p.new.data);
      cache[key] = list; persistLocal(key); notify(key);
    })
    .subscribe();
}
