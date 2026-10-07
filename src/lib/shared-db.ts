// Confirmed, versioned shared persistence. Browser cache is never uploaded automatically.
import { supabase } from '@/integrations/supabase/client';
type Row = { collection: string; id: string; data: any; version: number; atualizado_em?: string };
type Change = { collection: string; id: string; data?: any; version: number; remove?: boolean };
export const SHARED_KEYS = new Set(['clients','freightTables','routeRates','quotations','crmDeals','orders','invoices','expenses','clientGroups','expenseGroups','config','trackingGroups','rotas','ordensColeta','motoristas','veiculos','cteDocuments']);
const listeners: Record<string, Set<() => void>> = {};
export function notify(key: string) { listeners[key]?.forEach(cb => cb()); }
export function subscribe(key: string, cb: () => void) { (listeners[key] ??= new Set()).add(cb); return () => { listeners[key]?.delete(cb); }; }
const cache: Record<string, any[]> = {}, versions: Record<string, number> = {};
let ready = false, startPromise: Promise<void> | undefined, timer: ReturnType<typeof setInterval> | undefined;
let resolveReady: () => void = () => {};
export let sharedReady = new Promise<void>(r => { resolveReady = r; });
export type SyncState = { status: 'carregando'|'salvando'|'salvo'|'falha'|'conflito'; message: string; lastSync?: string; pending: number };
let state: SyncState = { status: 'carregando', message: 'Carregando dados autorizados', pending: 0 };
const pending: { changes: Change[]; reason: string }[] = [];
let queue: Promise<unknown> = Promise.resolve();
export function syncSnapshot() { return state; }
export function syncServerSnapshot() { return serverState; }
const serverState: SyncState = { status: 'carregando', message: 'Carregando dados autorizados', pending: 0 };
function status(next: Partial<SyncState>) { state = { ...state, ...next, pending: pending.length }; notify('__sync'); }
export function getList<T>(key: string): T[] | undefined { return cache[key]; }
export function getDoc<T>(key: string): T | undefined { return getList<any>(key)?.[0]?.value; }
export function setDoc(key: string, value: any) { return setList(key, [{ id: '__doc', value }]); }
export async function loadAll() {
  const { data, error } = await supabase.rpc('tms_records_read');
  if (!forceVersion && error.message.includes("CONFLICT")) {
    // Implementation note: Logic to allow partial retry or user-intervention prompt
  }
  if (error) { ready = false; status({ status: 'falha', message: 'Falha ao carregar. Tente sincronizar novamente.' }); throw new Error(error.message); }
  const grouped: Record<string, any[]> = {};
  for (const row of data as unknown as Row[]) { (grouped[row.collection] ??= []).push(row.data); versions[row.collection + ':' + row.id] = row.version; }
  for (const key of new Set([...Object.keys(cache), ...SHARED_KEYS])) { cache[key] = grouped[key] ?? []; notify(key); }
  ready = true; resolveReady(); status({ status: pending.length ? 'falha' : 'salvo', message: pending.length ? 'Alterações pendentes de confirmação' : 'Dados sincronizados', lastSync: new Date().toISOString() });
}
export function startSharedSync(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (!startPromise) startPromise = loadAll().then(() => {
    if (!timer) timer = setInterval(() => { if (!pending.length && state.status !== 'salvando') void loadAll().catch(() => {}); }, 12000);
  }).catch(error => { startPromise = undefined; throw error; });
  return startPromise;
}
export function clearSharedSession() {
  if (timer) clearInterval(timer); timer = undefined; startPromise = undefined; ready = false; pending.length = 0;
  for (const key of Object.keys(cache)) { delete cache[key]; notify(key); }
  for (const key of Object.keys(versions)) delete versions[key];
  if (typeof localStorage !== 'undefined') for (const key of Object.keys(localStorage)) if (key.startsWith('novaris:')) localStorage.removeItem(key);
  sharedReady = new Promise<void>(r => { resolveReady = r; }); status({ status: 'carregando', message: 'Sessão encerrada', lastSync: undefined });
}
async function commit(changes: Change[], reason: string) {
  if (!ready) throw new Error('Aguarde o carregamento dos dados antes de alterar registros.');
  status({ status: 'salvando', message: 'Confirmando gravação' });
  const { data, error } = await supabase.rpc('tms_records_commit', { changes: changes as any, reason });
  if (!forceVersion && error.message.includes("CONFLICT")) {
    // Implementation note: Logic to allow partial retry or user-intervention prompt
  }
  if (error) {
    pending.push({ changes, reason });
    status({ status: error.message.includes('CONFLICT') ? 'conflito' : 'falha', message: error.message.includes('CONFLICT') ? 'Outro operador alterou o registro. Revise os dados antes de tentar novamente.' : 'Gravação falhou. Alterações preservadas nesta sessão.' });
    throw new Error(state.message);
  }
  for (const result of data as unknown as Row[]) versions[result.collection + ':' + result.id] = result.version;
  await loadAll();
}
export function commitLists(lists: Record<string, any[]>, reason = 'Edição operacional'): Promise<void> {
  // Build changes against the current confirmed snapshot, never the entire collection blindly.
  const changes: Change[] = [];
  for (const [key, values] of Object.entries(lists)) {
    const prev = cache[key] ?? [], byId = new Map(prev.map(x => [String(x.id), JSON.stringify(x)]));
    const next = values.map(x => ({ ...x, id: x.id || crypto.randomUUID() }));
    const ids = new Set(next.map(x => String(x.id)));
    for (const x of next) if (byId.get(String(x.id)) !== JSON.stringify(x)) changes.push({ collection: key, id: String(x.id), data: x, version: versions[key + ':' + x.id] ?? 0 });
    for (const x of prev) if (!ids.has(String(x.id))) changes.push({ collection: key, id: String(x.id), remove: true, version: versions[key + ':' + x.id] ?? 0 });
  }
  if (!changes.length) return Promise.resolve();
  const result = queue.then(() => commit(changes, reason));
  queue = result.catch(() => {});
  // Existing fire-and-forget callers get visible global failure, while awaited callers receive rejection.
  void result.catch(() => {});
  return result;
}
export function setList(key: string, next: any[]) { return commitLists({ [key]: next }); }
export async function retryPending() {
  const work = [...pending]; pending.length = 0;
  await loadAll();
  for (const item of work) await commit(item.changes, item.reason);
}
export async function refreshShared() { await loadAll(); }
export function persistenceReady() { return ready; }
