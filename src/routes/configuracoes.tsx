// Configurações: tolerância CT-e, custos de frota, reset de dados.
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { useConfig, resetAllData } from "@/lib/mock-store";
import { DEFAULT_CONFIG, DEFAULT_EMAIL_TEMPLATE, ORDER_STAGES } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getInboxConfig, saveInboxConfig, testInbox, syncInbox } from "@/lib/email-inbox.functions";
import { useAuth } from "@/lib/auth";
import { Settings, RotateCcw, Trash2, DatabaseBackup, Upload } from "lucide-react";
import { downloadBackup, restoreBackup, validateBackup, type BackupPreview } from "@/lib/export-utils";
import { SchedulerStatus } from '@/components/SchedulerStatus';

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Novaris" },
      { name: "description", content: "Parâmetros globais: tolerância de divergência CT-e, custos de frota (diesel, arla, pedágio, comissão) e reset de dados." },
      { property: "og:title", content: "Configurações | Novaris" },
      { property: "og:description", content: "Parâmetros globais: tolerância de divergência CT-e, custos de frota (diesel, arla, pedágio, comissão) e reset de dados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RoleGate path="/configuracoes">
      <ConfigPage />
    </RoleGate>
  ),
});

function ConfigPage() {
  const [cfg, setCfg] = useConfig();

  function u<K extends keyof typeof cfg.frota>(k: K, v: number) {
    setCfg({ ...cfg, frota: { ...cfg.frota, [k]: v } });
  }

  const tpl = cfg.emailTemplate ?? DEFAULT_EMAIL_TEMPLATE;
  const setTpl = (p: Partial<typeof tpl>) => setCfg({ ...cfg, emailTemplate: { ...tpl, ...p } });

  const [restore, setRestore] = useState<BackupPreview|null>(null);
  const [restoreError,setRestoreError] = useState("");
  const [restoring,setRestoring] = useState(false);
  async function onRestoreFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; e.target.value=""; if(!f)return;
    try { setRestore(validateBackup(await f.text())); setRestoreError(""); }
    catch(e) { setRestoreError(e instanceof Error ? e.message : "Backup inválido."); }
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        {restoreError && <p role="alert" className="text-danger">{restoreError}</p>}
        {restore && <section className="border border-border p-4 space-y-3"><h2 className="font-semibold">Prévia da restauração</h2><p className="text-sm">Cópia de {new Date(restore.exportadoEm).toLocaleString("pt-BR")} · nenhum registro será excluído</p>{restore.impact.map(x=><p key={x.collection} className="text-xs">{x.collection}: {x.additions} novos · {x.updates} existentes serão atualizados</p>)}<Button variant="outline" onClick={()=>setRestore(null)}>Cancelar</Button><Button disabled={restoring} onClick={async()=>{setRestoring(true);try{const n=await restoreBackup(restore);setRestore(null);alert(`Restauração confirmada: ${n} coleções.`);}catch(e){setRestoreError(e instanceof Error?e.message:"Falha na restauração");}finally{setRestoring(false);}}}>Confirmar restauração</Button></section>}
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sistema</div>
          <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Configurações</h1>
        </div>

        <section className="panel p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <div className="font-display text-lg">Divergência CT-e</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Tolerância entre o valor da ordem de coleta e o valor do CT-e. Diferenças acima disso marcam a ordem como <b>divergente</b>.
          </p>
          <div className="max-w-xs">
            <label className="block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tolerância (%)</div>
              <input
                type="number" step="0.1"
                value={cfg.toleranciaDivergenciaPercent}
                onChange={(e) => setCfg({ ...cfg, toleranciaDivergenciaPercent: Number(e.target.value) })}
                className="input num"
              />
            </label>
          </div>
        </section>

        <section className="panel p-5 space-y-3">
          <div className="font-display text-lg">Custos de frota própria</div>
          <p className="text-sm text-muted-foreground">
            Valores default usados no cálculo automático de custo por entrega quando a execução é <b>frota</b>.
            Cada entrega pode sobrescrever esses valores.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <F label="Diesel (R$/L)"><input type="number" step="0.01" value={cfg.frota.precoDiesel} onChange={(e) => u("precoDiesel", Number(e.target.value))} className="input num" /></F>
            <F label="Consumo (km/L)"><input type="number" step="0.1" value={cfg.frota.kmPorLitro} onChange={(e) => u("kmPorLitro", Number(e.target.value))} className="input num" /></F>
            <F label="Arla (R$/L)"><input type="number" step="0.01" value={cfg.frota.precoArla} onChange={(e) => u("precoArla", Number(e.target.value))} className="input num" /></F>
            <F label="Arla (L / 100km)"><input type="number" step="0.1" value={cfg.frota.consumoArlaLitrosPor100km} onChange={(e) => u("consumoArlaLitrosPor100km", Number(e.target.value))} className="input num" /></F>
            <F label="Pedágio médio (R$/km)"><input type="number" step="0.01" value={cfg.frota.pedagioMedioPorKm} onChange={(e) => u("pedagioMedioPorKm", Number(e.target.value))} className="input num" /></F>
            <F label="Comissão motorista (%)"><input type="number" step="0.1" value={cfg.frota.comissaoMotoristaPercent} onChange={(e) => u("comissaoMotoristaPercent", Number(e.target.value))} className="input num" /></F>
            <F label="Depreciação (R$/km)"><input type="number" step="0.01" value={cfg.frota.depreciacaoPorKm} onChange={(e) => u("depreciacaoPorKm", Number(e.target.value))} className="input num" /></F>
            <F label="Outros (R$/km)"><input type="number" step="0.01" value={cfg.frota.outrosPorKm} onChange={(e) => u("outrosPorKm", Number(e.target.value))} className="input num" /></F>
          </div>
          <button
            onClick={() => setCfg({ ...cfg, frota: DEFAULT_CONFIG.frota })}
            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          ><RotateCcw className="h-3 w-3" /> restaurar padrões</button>
        </section>

        <InboxSection />
        <SchedulerStatus />

        <section className="panel p-5 space-y-3">
          <div className="font-display text-lg">Layout do e-mail de rastreio ao cliente</div>
          <p className="text-sm text-muted-foreground">
            Variáveis: {"{{cliente}} {{nf}} {{ordem}} {{origem}} {{destino}} {{status}} {{situacao}} {{local}} {{previsao}} {{destinatario}}"}
          </p>
          <F label="Assunto"><input value={tpl.assunto} onChange={(e) => setTpl({ assunto: e.target.value })} className="input" /></F>
          <F label="Corpo"><textarea value={tpl.corpo} onChange={(e) => setTpl({ corpo: e.target.value })} className="input min-h-[180px]" /></F>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tpl.autoEnvio} onChange={(e) => setTpl({ autoEnvio: e.target.checked })} /> Envio automático ao atualizar o rastreio
          </label>
          <div className="flex flex-wrap gap-2">
            {ORDER_STAGES.map((s) => {
              const on = tpl.estagiosAuto.includes(s.id);
              return (
                <button key={s.id} onClick={() => setTpl({ estagiosAuto: on ? tpl.estagiosAuto.filter((x) => x !== s.id) : [...tpl.estagiosAuto, s.id] })}
                  className={`text-xs px-2 py-1 rounded border ${on ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{s.label}</button>
              );
            })}
          </div>
          <button onClick={() => setCfg({ ...cfg, emailTemplate: DEFAULT_EMAIL_TEMPLATE })} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><RotateCcw className="h-3 w-3" /> restaurar modelo</button>
        </section>

        <section className="panel p-5 space-y-3">
          <div className="flex items-center gap-2">
            <DatabaseBackup className="h-4 w-4 text-primary" />
            <div className="font-display text-lg">Backup dos dados</div>
          </div>
          <p className="text-sm text-muted-foreground">
            Baixa tudo o que está cadastrado (clientes, tabelas, ordens, financeiro e configurações) em um arquivo <b>.json</b>.
            Guarde-o e use-o para restaurar, inclusive em outro navegador ou computador.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={downloadBackup}
              className="text-sm px-3 py-1.5 rounded border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
            >Baixar backup</button>
            <label className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated cursor-pointer">
              <Upload className="h-4 w-4" /> Restaurar backup
              <input type="file" accept=".json,application/json" className="hidden" onChange={onRestoreFile} />
            </label>
          </div>
        </section>
        <ResetImportsSection />



      </div>
    </AppShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

const PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: "imap.gmail.com", port: 993, secure: true },
  outlook: { host: "outlook.office365.com", port: 993, secure: true },
  hostinger: { host: "imap.hostinger.com", port: 993, secure: true },
  locaweb: { host: "imap.email-ssl.com.br", port: 993, secure: true },
};

function InboxSection() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const qc = useQueryClient();
  const fetchCfg = useServerFn(getInboxConfig);
  const save = useServerFn(saveInboxConfig);
  const test = useServerFn(testInbox);
  const sync = useServerFn(syncInbox);
  const { data, isLoading, error } = useQuery({ queryKey: ["inbox-config"], queryFn: () => fetchCfg(), retry: false });

  const [f, setF] = useState({
    host: "", port: 993, secure: true, usuario: "", senha: "", pasta: "INBOX",
    diasRetroativos: 7, filtroRemetente: "", ativo: false, intervaloMin: 15,
  });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (data) setF((x) => ({ ...x, ...data, senha: "" }));
  }, [data]);

  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  async function run(kind: "save" | "test" | "sync") {
    setBusy(kind);
    setMsg(null);
    try {
      if (kind === "save" || kind === "test") {
        await save({ data: { ...f, senha: f.senha || undefined } });
        set({ senha: "" });
      }
      if (kind === "save") setMsg({ ok: true, t: "Configuração salva." });
      if (kind === "test") {
        const r = await test();
        setMsg({ ok: r.ok, t: r.mensagem });
      }
      if (kind === "sync") {
        const r = await sync();
        setMsg({ ok: r.ok, t: r.ok ? `${r.mensagem}. Abra Coletas para lançar os XML novos.` : r.mensagem });
      }
      qc.invalidateQueries({ queryKey: ["inbox-config"] });
    } catch (e) {
      setMsg({ ok: false, t: e instanceof Error ? e.message : "Falha na operação." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <div className="font-display text-lg">Captação de XML por e-mail (IMAP)</div>
      </div>
      <p className="text-sm text-muted-foreground">
        Informe os dados de acesso da caixa que recebe os XML de NF-e/CT-e. O sistema lê os anexos .xml do período escolhido e
        ignora qualquer XML que já tenha sido importado (pela chave de acesso), então nada é duplicado.
      </p>
      {error && <div className="text-xs text-danger">{error instanceof Error ? error.message : "Sem acesso."}</div>}
      {isLoading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : (
        <fieldset disabled={!isAdmin} className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground self-center">Preencher servidor:</span>
            {Object.entries({ gmail: "Gmail / Workspace", outlook: "Microsoft 365", hostinger: "Hostinger", locaweb: "Locaweb" }).map(([k, l]) => (
              <button key={k} type="button" onClick={() => set(PRESETS[k])} className="px-2 py-0.5 rounded border border-border hover:bg-elevated">{l}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <F label="Servidor IMAP"><input value={f.host} onChange={(e) => set({ host: e.target.value })} placeholder="imap.seudominio.com.br" className="input" /></F>
            <F label="Porta"><input type="number" value={f.port} onChange={(e) => set({ port: Number(e.target.value) })} className="input num" /></F>
            <F label="Conexão">
              <select value={String(f.secure)} onChange={(e) => set({ secure: e.target.value === "true" })} className="input">
                <option value="true">Segura (SSL/TLS)</option>
                <option value="false">Sem SSL / STARTTLS</option>
              </select>
            </F>
            <F label="Usuário (e-mail)"><input value={f.usuario} onChange={(e) => set({ usuario: e.target.value })} placeholder="xml@novarislog.com.br" className="input" autoComplete="off" /></F>
            <F label={data?.temSenha ? "Senha (deixe vazio para manter)" : "Senha"}>
              <input type="password" value={f.senha} onChange={(e) => set({ senha: e.target.value })} placeholder={data?.temSenha ? "••••••••" : ""} className="input" autoComplete="new-password" />
            </F>
            <F label="Pasta"><input value={f.pasta} onChange={(e) => set({ pasta: e.target.value })} className="input" /></F>
            <F label="Buscar XML dos últimos (dias)"><input type="number" min={1} max={365} value={f.diasRetroativos} onChange={(e) => set({ diasRetroativos: Number(e.target.value) })} className="input num" /></F>
            <F label="Somente do remetente (opcional)"><input value={f.filtroRemetente} onChange={(e) => set({ filtroRemetente: e.target.value })} placeholder="nfe@cliente.com.br" className="input" /></F>
            <F label="Verificar a cada (min)"><input type="number" min={5} value={f.intervaloMin} onChange={(e) => set({ intervaloMin: Number(e.target.value) })} className="input num" /></F>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.ativo} onChange={(e) => set({ ativo: e.target.checked })} /> Ativar leitura automática
          </label>
          {data?.microsoftConectado ? (
            <p className="text-[11px] text-success">
              Conta Microsoft conectada: para servidores Microsoft 365 (outlook.office365.com) a leitura usa o login oficial da Microsoft e a senha não é necessária.
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Gmail exige uma <b>senha de app</b> e o IMAP habilitado na caixa.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => run("save")} disabled={!!busy} className="text-sm px-3 py-1.5 rounded bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25">{busy === "save" ? "Salvando…" : "Salvar"}</button>
            <button type="button" onClick={() => run("test")} disabled={!!busy} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">{busy === "test" ? "Testando…" : "Salvar e testar conexão"}</button>
            <button type="button" onClick={() => run("sync")} disabled={!!busy || !data?.host} className="text-sm px-3 py-1.5 rounded border border-border hover:bg-elevated">{busy === "sync" ? "Buscando…" : "Buscar XML agora"}</button>
          </div>
        </fieldset>
      )}
      {!isAdmin && <div className="text-[11px] text-muted-foreground">Somente administradores alteram estes dados.</div>}
      {msg && <div className={`text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.t}</div>}
      {data?.ultimaSync && (
        <div className="text-[11px] text-muted-foreground">Última leitura: {new Date(data.ultimaSync).toLocaleString("pt-BR")} — {data.ultimoStatus}</div>
      )}
    </section>
  );
}

function ResetImportsSection() {
  const { user } = useAuth();
  const [txt, setTxt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (user?.email?.toLowerCase() !== "wtmattje@gmail.com") return null;
  async function zerar() {
    if (!window.confirm("Apagar TODOS os XMLs importados, notas, CT-e, ordens de coleta, rotas, PDFs, envios e TODO o financeiro (receitas e despesas)? Esta ação não pode ser desfeita.")) return;
    setBusy(true); setMsg("");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.rpc("tms_reset_imports", { confirmacao: txt });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    try { Object.keys(localStorage).filter((k) => /orders|cteDocuments|ordensColeta|rotas|invoices|expenses|shared/i.test(k)).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
    alert(`Importações apagadas: ${JSON.stringify(data)}`);
    window.location.reload();
  }
  return (
    <section className="panel p-5 space-y-3 border border-danger/40">
      <div className="flex items-center gap-2"><Trash2 className="h-4 w-4 text-danger" /><div className="font-display text-lg text-danger">Zerar importações</div></div>
      <p className="text-sm text-muted-foreground">Apaga XMLs importados, notas, CT-e, ordens de coleta, rotas, PDFs, envios de e-mail e todo o financeiro (receitas, despesas e baixas). Clientes, tabelas, motoristas, veículos, locais, grupos de despesa e usuários são mantidos.</p>
      <F label='Digite "ZERAR" para confirmar'><input value={txt} onChange={(e) => setTxt(e.target.value)} className="input max-w-xs" /></F>
      <Button variant="destructive" disabled={busy || txt !== "ZERAR"} onClick={zerar}>{busy ? "Apagando…" : "Zerar importações"}</Button>
      {msg && <p className="text-xs text-danger">{msg}</p>}
    </section>
  );
}
