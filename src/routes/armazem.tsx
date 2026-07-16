import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { PackagePlus, PackageMinus, Warehouse, ClipboardList, FileUp, ArrowLeftRight } from "lucide-react";
import { stock, warehouseInbound, warehouseOutbound, stockMovements, statusTone, toneClass } from "@/lib/mock-data";

export const Route = createFileRoute("/armazem")({
  head: () => ({
    meta: [
      { title: "Armazém & WMS | CargoHub" },
      { name: "description", content: "Gestão de armazém: recebimento por NF de remessa, endereçamento, separação, retorno simbólico e baixa de estoque." },
    ],
  }),
  component: ArmazemPage,
});

type Tab = "entradas" | "estoque" | "saidas" | "movs";

function ArmazemPage() {
  const [tab, setTab] = useState<Tab>("estoque");

  const totalQtd = stock.reduce((s, i) => s + i.qtd, 0);
  const baixoMin = stock.filter(i => i.qtd < i.minimo).length;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Módulo 4</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold flex items-center gap-2">
              <Warehouse className="h-6 w-6 text-primary" /> Armazém (WMS)
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Remessa → Estoque → Separação → Retorno simbólico → Baixa</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 text-primary px-3 py-2 text-sm hover:bg-primary/20">
            <FileUp className="h-4 w-4" /> Importar XML remessa
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi l="Volumes estocados" v={totalQtd.toLocaleString("pt-BR")} icon={Warehouse} />
          <Kpi l="Entradas hoje" v={warehouseInbound.length} icon={PackagePlus} tone="cyan" />
          <Kpi l="Separações abertas" v={warehouseOutbound.filter(o => o.status !== "baixado").length} icon={ClipboardList} tone="amber" />
          <Kpi l="Itens abaixo mín." v={baixoMin} icon={PackageMinus} tone="danger" />
        </div>

        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {([
            ["entradas","Entradas / Recebimento"],
            ["estoque","Estoque"],
            ["saidas","Saídas & Separação"],
            ["movs","Movimentações"],
          ] as [Tab,string][]).map(([t,l]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px whitespace-nowrap ${tab===t?"border-primary text-primary":"border-transparent text-muted-foreground hover:text-foreground"}`}>
              {l}
            </button>
          ))}
        </div>

        {tab === "entradas" && (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Recebimento</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">NF Remessa</th>
                  <th className="text-left font-normal">Data</th>
                  <th className="text-right font-normal">Volumes</th>
                  <th className="text-right font-normal">Peso</th>
                  <th className="text-left font-normal">Endereço</th>
                  <th className="text-left font-normal pl-4 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {warehouseInbound.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-elevated/50">
                    <td className="px-4 py-3 num text-primary">{r.id}</td>
                    <td className="font-medium">{r.cliente}</td>
                    <td className="num text-xs">{r.nfRemessa}</td>
                    <td className="num text-xs">{r.data}</td>
                    <td className="text-right num">{r.volumes}</td>
                    <td className="text-right num">{r.peso.toLocaleString("pt-BR")} kg</td>
                    <td className="num text-xs">{r.endereco ?? "—"}</td>
                    <td className="pl-4 pr-4"><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(r.status))}`}>{r.status.replace("_"," ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "estoque" && (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">SKU</th>
                  <th className="text-left font-normal">Descrição</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">Endereço</th>
                  <th className="text-right font-normal">Qtd</th>
                  <th className="text-right font-normal">Mínimo</th>
                  <th className="text-left font-normal">Giro</th>
                  <th className="text-left font-normal pl-4 pr-4">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((i) => {
                  const abaixo = i.qtd < i.minimo;
                  return (
                    <tr key={i.sku} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-3 num text-primary">{i.sku}</td>
                      <td>{i.descricao}</td>
                      <td className="text-xs">{i.cliente}</td>
                      <td className="num text-xs">{i.endereco}</td>
                      <td className={`text-right num ${abaixo ? "text-danger" : ""}`}>{i.qtd.toLocaleString("pt-BR")}</td>
                      <td className="text-right num text-xs text-muted-foreground">{i.minimo.toLocaleString("pt-BR")}</td>
                      <td className="text-xs capitalize">{i.giro}</td>
                      <td className="pl-4 pr-4">{abaixo && <span className="text-[11px] text-danger">↓ abaixo do mínimo</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "saidas" && (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Ordem</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">NF Venda</th>
                  <th className="text-left font-normal">Destinatário</th>
                  <th className="text-left font-normal">Cidade</th>
                  <th className="text-right font-normal">Itens</th>
                  <th className="text-left font-normal">Separador</th>
                  <th className="text-left font-normal">NF Retorno</th>
                  <th className="text-left font-normal pl-4 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {warehouseOutbound.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-elevated/50">
                    <td className="px-4 py-3 num text-primary">{o.id}</td>
                    <td className="font-medium">{o.cliente}</td>
                    <td className="num text-xs">{o.nfVenda}</td>
                    <td className="text-xs">{o.destinatario}</td>
                    <td className="text-xs">{o.cidade}</td>
                    <td className="text-right num">{o.itens}</td>
                    <td className="text-xs">{o.separador ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="num text-xs">{o.nfRetorno ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="pl-4 pr-4"><span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.status))}`}>{o.status.replace(/_/g," ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "movs" && (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Movimento</th>
                  <th className="text-left font-normal">Tipo</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">SKU</th>
                  <th className="text-right font-normal">Qtd</th>
                  <th className="text-left font-normal">Origem</th>
                  <th className="text-left font-normal">Destino</th>
                  <th className="text-left font-normal">Quando</th>
                  <th className="text-left font-normal pr-4">Responsável</th>
                </tr>
              </thead>
              <tbody>
                {stockMovements.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-elevated/50">
                    <td className="px-4 py-3 num text-primary text-xs">{m.id}</td>
                    <td className="text-xs">
                      <span className="inline-flex items-center gap-1 capitalize">
                        {m.tipo === "entrada" && <PackagePlus className="h-3 w-3 text-success" />}
                        {m.tipo === "saida" && <PackageMinus className="h-3 w-3 text-primary" />}
                        {m.tipo === "transferencia" && <ArrowLeftRight className="h-3 w-3 text-accent" />}
                        {m.tipo === "ajuste" && <ClipboardList className="h-3 w-3 text-danger" />}
                        {m.tipo}
                      </span>
                    </td>
                    <td className="text-xs">{m.cliente}</td>
                    <td className="num text-xs">{m.sku}</td>
                    <td className={`text-right num ${m.qtd < 0 ? "text-danger" : ""}`}>{m.qtd}</td>
                    <td className="num text-xs">{m.origem}</td>
                    <td className="num text-xs">{m.destino}</td>
                    <td className="num text-xs">{m.quando}</td>
                    <td className="text-xs pr-4">{m.responsavel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({ l, v, icon: Icon, tone }: { l: string; v: string | number; icon: typeof Warehouse; tone?: "cyan" | "amber" | "danger" | "success" }) {
  const color = tone === "danger" ? "text-danger" : tone === "amber" ? "text-accent" : tone === "success" ? "text-success" : "text-primary";
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`num text-3xl mt-2 ${tone === "danger" ? "text-danger" : ""}`}>{v}</div>
    </div>
  );
}
