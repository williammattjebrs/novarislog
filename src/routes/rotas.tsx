// Rotas (agrupamento de NFs por remetente+destinatário) e Ordens de Coleta (geradas automaticamente, programadas pelo time).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileText, Download, MessageCircle, Route as RouteIcon, ClipboardList, X, Pencil } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { useOrders, useRotas, useOrdensColeta, useMotoristas, useVeiculos } from "@/lib/mock-store";
import { OC_STATUS, type OrdemColeta, type OCStatus, type Order } from "@/lib/mock-data";
import { useAutoRotas } from "@/lib/use-auto-rotas";
import { useAuth } from "@/lib/auth";
import { abrirEspelho, baixarEspelho, whatsappMotorista, fmtDH } from "@/lib/espelho-coleta";

export const Route = createFileRoute("/rotas")({
  head: () => ({ meta: [
    { title: "Rotas & Ordens de Coleta | Novaris TMS" },
    { name: "description", content: "Rotas geradas a partir das NF-e, vínculo de motorista e veículo e programação das ordens de coleta com espelho." },
    { property: "og:title", content: "Rotas & Ordens de Coleta | Novaris TMS" },
    { property: "og:description", content: "Agrupe NF-e em rotas, vincule motorista e veículo e programe a ordem de coleta." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/rotas"><AppShell><Page /></AppShell></RoleGate>,
});

const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
const ROTA_LABEL = { aberta: "Aberta", programada: "Em execução", encerrada: "Encerrada" } as const;
const toLocal = (iso?: string) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function Page() {
  useAutoRotas();
  const [tab, setTab] = useState<"r" | "oc">("r");
  const [editId, setEditId] = useState<string | null>(null);
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display">Rotas & Ordens de Coleta</h1>
        <p className="text-sm text-muted-foreground">Cada NF-e importada abre (ou entra em) uma rota com o mesmo remetente e destinatário, e a ordem de coleta é gerada automaticamente. Falta só programar: motorista, veículo, locais e horários.</p>
      </div>
      <div className="flex gap-2">
        <Button variant={tab === "r" ? "default" : "outline"} onClick={() => setTab("r")}><RouteIcon className="h-4 w-4" /> Rotas</Button>
        <Button variant={tab === "oc" ? "default" : "outline"} onClick={() => setTab("oc")}><ClipboardList className="h-4 w-4" /> Ordens de coleta</Button>
      </div>
      {tab === "r" ? <Rotas onEdit={setEditId} /> : <Ordens onEdit={setEditId} />}
      {editId && <EditOC ocId={editId} onClose={() => setEditId(null)} />}
    </div>
  );
}

function Rotas({ onEdit }: { onEdit: (ocId: string) => void }) {
  const rotas = useRotas(); const orders = useOrders(); const ocs = useOrdensColeta(); const mot = useMotoristas(); const vei = useVeiculos();
  const [filtro, setFiltro] = useState<"ativas" | "todas">("ativas");
  const lista = rotas.list.filter((r) => filtro === "todas" || r.status !== "encerrada");
  function setRota(rotaId: string, patch: { motoristaId?: string; veiculoId?: string }) {
    rotas.update(rotaId, patch);
    const oc = ocs.list.find((o) => o.rotaId === rotaId && ["aguardando_programacao", "emitida", "enviada_motorista"].includes(o.status));
    if (oc) ocs.update(oc.id, patch);
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <select className="bg-input/40 border border-border rounded px-2 py-1" value={filtro} onChange={(e) => setFiltro(e.target.value as "ativas" | "todas")}>
          <option value="ativas">Rotas ativas</option><option value="todas">Todas</option>
        </select>
        {(!mot.list.length || !vei.list.length) && <Link to="/motoristas" className="text-xs text-warning hover:underline">Cadastre motoristas e veículos para agilizar →</Link>}
      </div>
      {lista.map((r) => {
        const nfs = orders.list.filter((o) => r.orderIds.includes(o.id));
        const oc = ocs.list.find((o) => o.rotaId === r.id && o.status !== "cancelada");
        return (
          <div key={r.id} className="panel p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="num text-xs text-muted-foreground">{r.id}</span>
              <span className="font-display">{r.cidadeColeta}/{r.ufColeta} → {r.cidadeEntrega}/{r.ufEntrega}</span>
              <span className="text-xs px-2 py-0.5 rounded border border-primary/40 text-primary">{ROTA_LABEL[r.status]}</span>
              {oc && <span className="text-xs px-2 py-0.5 rounded border border-border">{oc.numero} · {OC_STATUS.find((s) => s.id === oc.status)?.label}</span>}
              <span className="ml-auto text-xs text-muted-foreground">{nfs.length} NF · {nfs.reduce((s, n) => s + (n.peso || 0), 0).toLocaleString("pt-BR")} kg</span>
            </div>
            <div className="text-xs text-muted-foreground">Cliente: <b className="text-foreground">{r.clienteNome}</b> · Remetente: <b className="text-foreground">{r.remetente}</b> · Destinatário: <b className="text-foreground">{r.destinatario}</b></div>
            <div className="text-xs">NFs: {nfs.map((n) => n.numeroNFe).join(", ") || "—"}</div>
            <div className="grid md:grid-cols-3 gap-2 items-center">
              <select className={inp} value={r.motoristaId ?? ""} disabled={r.status === "encerrada"} onChange={(e) => setRota(r.id, { motoristaId: e.target.value || undefined })}>
                <option value="">Motorista…</option>{mot.list.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.cpf} · {m.telefone}</option>)}
              </select>
              <select className={inp} value={r.veiculoId ?? ""} disabled={r.status === "encerrada"} onChange={(e) => setRota(r.id, { veiculoId: e.target.value || undefined })}>
                <option value="">Veículo (placa)…</option>{vei.list.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.tipo}</option>)}
              </select>
              {oc ? <Button onClick={() => onEdit(oc.id)}><Pencil className="h-4 w-4" /> Programar ordem de coleta</Button> : <span className="text-xs text-muted-foreground">Sem OC ativa</span>}
            </div>
          </div>
        );
      })}
      {!lista.length && <div className="panel p-6 text-center text-sm text-muted-foreground">Nenhuma rota. As rotas são criadas automaticamente quando chega uma NF-e (e-mail ou importação em Coletas).</div>}
    </div>
  );
}

// Seletor de motorista/veículo com opção de cadastrar um novo na hora.
function MotoristaSelect({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const mot = useMotoristas();
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", cpf: "", telefone: "" });
  const [err, setErr] = useState("");
  function salvar() {
    const cpf = f.cpf.replace(/\D/g, "");
    if (!f.nome.trim() || cpf.length !== 11 || f.telefone.replace(/\D/g, "").length < 10) return setErr("Nome, CPF (11 dígitos) e telefone com DDD são obrigatórios.");
    const existente = mot.list.find((x) => x.cpf.replace(/\D/g, "") === cpf);
    if (existente) { onChange(existente.id); setNovo(false); setErr(""); return; }
    const id = newId("MOT");
    mot.add({ id, nome: f.nome.trim(), cpf: fmtCpf(cpf), telefone: f.telefone.trim(), cnh: "", ativo: true, criadoEm: new Date().toISOString() });
    onChange(id); setNovo(false); setF({ nome: "", cpf: "", telefone: "" }); setErr("");
  }
  if (novo) return (
    <div className="space-y-1 border border-primary/40 rounded p-2">
      <div className="text-xs font-semibold text-primary">Novo motorista</div>
      <input className={inp} placeholder="Nome completo" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <div className="flex gap-1">
        <input className={inp} placeholder="CPF" value={f.cpf} onChange={(e) => setF({ ...f, cpf: fmtCpf(e.target.value) })} />
        <input className={inp} placeholder="Telefone (DDD)" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
      </div>
      {err && <div className="text-xs text-danger">{err}</div>}
      <div className="flex gap-1"><Button size="sm" onClick={salvar}>Salvar e vincular</Button><Button size="sm" variant="outline" onClick={() => setNovo(false)}>Voltar</Button></div>
    </div>
  );
  return (
    <select className={inp} value={value} disabled={disabled} onChange={(e) => e.target.value === "__novo__" ? setNovo(true) : onChange(e.target.value)}>
      <option value="">Motorista…</option>
      {mot.list.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.cpf} · {m.telefone}</option>)}
      <option value="__novo__">+ Cadastrar novo motorista…</option>
    </select>
  );
}

function VeiculoSelect({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const vei = useVeiculos();
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ placa: "", tipo: "Truck", proprietario: "frota" as "frota" | "terceiro" });
  const [err, setErr] = useState("");
  function salvar() {
    const placa = f.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) return setErr("Placa inválida (ex.: ABC1D23 ou ABC1234).");
    const existente = vei.list.find((x) => x.placa === placa);
    if (existente) { onChange(existente.id); setNovo(false); setErr(""); return; }
    const id = newId("VEI");
    vei.add({ id, placa, tipo: f.tipo, modelo: "", proprietario: f.proprietario, ativo: true, criadoEm: new Date().toISOString() });
    onChange(id); setNovo(false); setF({ placa: "", tipo: "Truck", proprietario: "frota" }); setErr("");
  }
  if (novo) return (
    <div className="space-y-1 border border-primary/40 rounded p-2">
      <div className="text-xs font-semibold text-primary">Novo veículo</div>
      <div className="flex gap-1">
        <input className={inp} placeholder="Placa" value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value.toUpperCase() })} />
        <select className={inp} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_CAMINHAO.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <select className={inp} value={f.proprietario} onChange={(e) => setF({ ...f, proprietario: e.target.value as "frota" | "terceiro" })}><option value="frota">Frota própria</option><option value="terceiro">Terceiro</option></select>
      {err && <div className="text-xs text-danger">{err}</div>}
      <div className="flex gap-1"><Button size="sm" onClick={salvar}>Salvar e vincular</Button><Button size="sm" variant="outline" onClick={() => setNovo(false)}>Voltar</Button></div>
    </div>
  );
  return (
    <select className={inp} value={value} disabled={disabled} onChange={(e) => e.target.value === "__novo__" ? setNovo(true) : onChange(e.target.value)}>
      <option value="">Veículo (placa)…</option>
      {vei.list.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.tipo}</option>)}
      <option value="__novo__">+ Cadastrar novo veículo…</option>
    </select>
  );
}

function EditOC({ ocId, onClose }: { ocId: string; onClose: () => void }) {
  const orders = useOrders(); const ocs = useOrdensColeta(); const rotas = useRotas(); const mot = useMotoristas(); const vei = useVeiculos();
  const { user } = useAuth();
  const oc = ocs.list.find((o) => o.id === ocId);
  const rota = rotas.list.find((r) => r.id === oc?.rotaId);
  const nfs = orders.list.filter((o) => rota?.orderIds.includes(o.id));
  const [sel, setSel] = useState<string[]>(oc?.orderIds ?? []);
  const [f, setF] = useState({
    motoristaId: oc?.motoristaId ?? "", veiculoId: oc?.veiculoId ?? "",
    localColeta: oc?.localColeta ?? "", cidadeColeta: oc?.cidadeColeta ?? "", ufColeta: oc?.ufColeta ?? "", dataHoraColeta: toLocal(oc?.dataHoraColeta),
    localEntrega: oc?.localEntrega ?? "", cidadeEntrega: oc?.cidadeEntrega ?? "", ufEntrega: oc?.ufEntrega ?? "", dataHoraEntrega: toLocal(oc?.dataHoraEntrega), observacao: oc?.observacao ?? "",
  });
  const [err, setErr] = useState("");
  if (!oc || !rota) return null;
  function salvar() {
    if (!oc || !rota) return;
    if (!sel.length || !f.localColeta.trim() || !f.localEntrega.trim()) return setErr("Selecione as NFs e informe os locais de coleta e entrega.");
    const now = new Date().toISOString();
    const completa = !!(f.motoristaId && f.veiculoId && f.dataHoraColeta);
    const status: OCStatus = oc.status === "aguardando_programacao" && completa ? "emitida" : oc.status;
    const patch: Partial<OrdemColeta> = {
      ...f, motoristaId: f.motoristaId || undefined, veiculoId: f.veiculoId || undefined, orderIds: sel, status,
      dataHoraColeta: f.dataHoraColeta ? new Date(f.dataHoraColeta).toISOString() : "",
      dataHoraEntrega: f.dataHoraEntrega ? new Date(f.dataHoraEntrega).toISOString() : "", atualizadoEm: now,
    };
    ocs.update(oc.id, patch);
    const m = mot.list.find((x) => x.id === f.motoristaId); const v = vei.list.find((x) => x.id === f.veiculoId);
    orders.set(orders.list.map((o) => sel.includes(o.id) ? {
      ...o, motorista: m ? `${m.nome} (${m.telefone})` : o.motorista, placa: v?.placa ?? o.placa,
      previsaoEntrega: patch.dataHoraEntrega || o.previsaoEntrega, atualizadoEm: now,
      ...(status === "emitida" && oc.status === "aguardando_programacao" ? {
        stage: ["valorizada", "aguarda_vinculacao"].includes(o.stage) ? "coleta_agendada" as const : o.stage,
        timeline: [...o.timeline, { quando: now, autor: user?.email ?? "sistema", tipo: "status" as const, texto: `${oc.numero} programada · coleta ${fmtDH(patch.dataHoraColeta)} · ${m?.nome ?? ""} ${v?.placa ?? ""}` }],
      } : {}),
    } : o));
    // Programada: a rota fecha para novas NFs; as não selecionadas voltam a ser agrupadas numa nova rota.
    rotas.update(rota.id, { orderIds: sel, motoristaId: f.motoristaId || undefined, veiculoId: f.veiculoId || undefined, status: status === "aguardando_programacao" ? "aberta" : "programada", atualizadoEm: now });
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 bg-background/80 grid place-items-center p-4">
      <div className="panel p-5 w-full max-w-3xl max-h-[90vh] overflow-auto space-y-3">
        <div className="flex items-center"><h2 className="font-display text-lg">Ordem de coleta {oc.numero}</h2><button className="ml-auto" onClick={onClose}><X className="h-4 w-4" /></button></div>
        <div className="grid md:grid-cols-2 gap-2">
          <select className={inp} value={f.motoristaId} onChange={(e) => setF({ ...f, motoristaId: e.target.value })}>
            <option value="">Motorista…</option>{mot.list.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.cpf} · {m.telefone}</option>)}
          </select>
          <select className={inp} value={f.veiculoId} onChange={(e) => setF({ ...f, veiculoId: e.target.value })}>
            <option value="">Veículo (placa)…</option>{vei.list.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.tipo}</option>)}
          </select>
        </div>
        <div className="text-xs font-semibold">Notas que irão carregar</div>
        <div className="grid md:grid-cols-2 gap-1 text-sm">
          {nfs.map((n) => (
            <label key={n.id} className="flex gap-2 items-center"><input type="checkbox" checked={sel.includes(n.id)} onChange={(e) => setSel(e.target.checked ? [...sel, n.id] : sel.filter((x) => x !== n.id))} />
              NF {n.numeroNFe} · {(n.peso || 0).toLocaleString("pt-BR")} kg · {n.volumes} vol</label>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <fieldset className="space-y-2"><legend className="text-xs font-semibold text-primary">Coleta</legend>
            <input className={inp} placeholder="Local / endereço de coleta" value={f.localColeta} onChange={(e) => setF({ ...f, localColeta: e.target.value })} />
            <div className="flex gap-2"><input className={inp} value={f.cidadeColeta} onChange={(e) => setF({ ...f, cidadeColeta: e.target.value })} /><input className={inp + " w-16"} value={f.ufColeta} onChange={(e) => setF({ ...f, ufColeta: e.target.value.toUpperCase() })} /></div>
            <label className="text-xs">Data e hora da coleta<input type="datetime-local" className={inp} value={f.dataHoraColeta} onChange={(e) => setF({ ...f, dataHoraColeta: e.target.value })} /></label>
          </fieldset>
          <fieldset className="space-y-2"><legend className="text-xs font-semibold text-primary">Entrega</legend>
            <input className={inp} placeholder="Local / endereço de entrega" value={f.localEntrega} onChange={(e) => setF({ ...f, localEntrega: e.target.value })} />
            <div className="flex gap-2"><input className={inp} value={f.cidadeEntrega} onChange={(e) => setF({ ...f, cidadeEntrega: e.target.value })} /><input className={inp + " w-16"} value={f.ufEntrega} onChange={(e) => setF({ ...f, ufEntrega: e.target.value.toUpperCase() })} /></div>
            <label className="text-xs">Previsão de entrega<input type="datetime-local" className={inp} value={f.dataHoraEntrega} onChange={(e) => setF({ ...f, dataHoraEntrega: e.target.value })} /></label>
          </fieldset>
        </div>
        <textarea className={inp} rows={2} placeholder="Observações para o motorista" value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} />
        <p className="text-xs text-muted-foreground">Com motorista, veículo e data da coleta preenchidos, a OC passa para "Programada".</p>
        {err && <div className="text-xs text-danger">{err}</div>}
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={salvar}>Salvar ordem de coleta</Button></div>
      </div>
    </div>
  );
}

function Ordens({ onEdit }: { onEdit: (id: string) => void }) {
  const ocs = useOrdensColeta(); const orders = useOrders(); const mot = useMotoristas(); const vei = useVeiculos(); const rotas = useRotas();
  const { user } = useAuth();
  const byId = useMemo(() => new Map(orders.list.map((o) => [o.id, o])), [orders.list]);
  function setStatus(oc: OrdemColeta, status: OCStatus) {
    const now = new Date().toISOString();
    ocs.update(oc.id, { status, atualizadoEm: now });
    const st = OC_STATUS.find((s) => s.id === status);
    // NFs com CT-e já vinculado não voltam para "aguardando CT-e"
    if (st?.stage) orders.set(orders.list.map((o) => oc.orderIds.includes(o.id) && !(st.stage === "aguardando_cte" && o.cteChave) ? { ...o, stage: st.stage!, atualizadoEm: now,
      timeline: [...o.timeline, { quando: now, autor: user?.email ?? "sistema", tipo: "status", texto: `${oc.numero}: ${st.label}` }] } : o));
    if (status === "entregue") rotas.update(oc.rotaId, { status: "encerrada" });
    else if (status === "cancelada") rotas.update(oc.rotaId, { status: "encerrada", orderIds: [] });
    else if (status !== "aguardando_programacao") rotas.update(oc.rotaId, { status: "programada" });
  }
  return (
    <div className="panel overflow-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground text-left"><tr className="border-b border-border"><th className="p-2">OC</th><th>Cliente</th><th>Coleta</th><th>Entrega</th><th>Motorista / Placa</th><th>NFs</th><th>Status</th><th className="text-right p-2">Ações</th></tr></thead>
        <tbody>
          {ocs.list.map((oc) => {
            const m = mot.list.find((x) => x.id === oc.motoristaId); const v = vei.list.find((x) => x.id === oc.veiculoId);
            const nfs = oc.orderIds.map((id) => byId.get(id)).filter(Boolean) as Order[];
            return (
              <tr key={oc.id} className="border-b border-border align-top">
                <td className="p-2 num">{oc.numero}</td><td>{oc.clienteNome}</td>
                <td>{oc.cidadeColeta}/{oc.ufColeta}<div className="text-xs text-muted-foreground">{fmtDH(oc.dataHoraColeta)}</div></td>
                <td>{oc.cidadeEntrega}/{oc.ufEntrega}<div className="text-xs text-muted-foreground">{fmtDH(oc.dataHoraEntrega)}</div></td>
                <td>{m?.nome ?? <span className="text-warning">definir</span>}<div className="text-xs num">{v?.placa ?? "—"}</div></td>
                <td className="text-xs">{nfs.map((n) => `${n.numeroNFe}${n.cteNumero ? ` (CT-e ${n.cteNumero})` : ""}`).join(", ")}</td>
                <td><select className="bg-input/40 border border-border rounded px-1 py-1 text-xs" value={oc.status} onChange={(e) => setStatus(oc, e.target.value as OCStatus)}>
                  {OC_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></td>
                <td className="p-2"><div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" title="Programar / editar" onClick={() => onEdit(oc.id)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" title="Espelho de coleta (imprimir / PDF)" onClick={() => abrirEspelho(oc, nfs, m, v)}><FileText className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" title="Baixar espelho" onClick={() => baixarEspelho(oc, nfs, m, v)}><Download className="h-4 w-4" /></Button>
                  <Button size="sm" variant="outline" title="Enviar ao motorista (WhatsApp)" disabled={!m} onClick={() => { whatsappMotorista(oc, nfs, m, v); if (oc.status === "emitida") setStatus(oc, "enviada_motorista"); }}><MessageCircle className="h-4 w-4" /></Button>
                </div></td>
              </tr>
            );
          })}
          {!ocs.list.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground text-xs">Nenhuma ordem de coleta. Elas são geradas automaticamente quando uma NF-e é importada.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
