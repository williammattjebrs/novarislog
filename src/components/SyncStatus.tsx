import { useSyncExternalStore } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { refreshShared, retryPending, subscribe, syncServerSnapshot, syncSnapshot } from "@/lib/shared-db";
export function SyncStatus() {
  const state = useSyncExternalStore(cb => subscribe("__sync", cb), syncSnapshot, syncServerSnapshot);
  return <div className="flex flex-wrap items-center gap-2 text-xs" role="status">
    <span className={state.status === "falha" || state.status === "conflito" ? "text-danger" : "text-muted-foreground"}>{state.message}</span>
    {state.lastSync && <time className="text-muted-foreground">{new Date(state.lastSync).toLocaleTimeString("pt-BR")}</time>}
    <Button variant="ghost" size="icon" title="Sincronizar novamente" aria-label="Sincronizar novamente" onClick={() => void refreshShared().catch(() => {})}><RefreshCw className="h-3 w-3" /></Button>
    {state.pending > 0 && <Button variant="outline" size="sm" onClick={() => void retryPending().catch(() => {})}>Tentar gravação novamente ({state.pending})</Button>}
  </div>;
}