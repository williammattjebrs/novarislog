import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Building2, Wallet, TrendingUp, AlertCircle } from "lucide-react";
import { clients, invoices, statusTone } from "@/lib/mock-data";

export const Route = createFileRoute("/comercial")({
  head: () => ({
    meta: [
      { title: "Comercial & Financeiro | CargoHub" },
      { name: "description", content: "Clientes, contratos, faturamento e conciliação financeira do operador logístico." },
    ],
  }),
  component: ComercialPage,
});

function toneClass(tone: ReturnType<typeof statusTone>) {
  switch (tone) {
    case "cyan": return "text-primary bg-primary/10 border-primary/30";
    case "amber": return "text-accent bg-accent/10 border-accent/30";
    case "success": return "text-success bg-success/10 border-success/30";
    case "danger": return "text-danger bg-danger/10 border-danger/30";
    case "info": return "text-info bg-info/10 border-info/30";
    default: return "text-muted-foreground bg-muted/40 border-border";
  }
}

function ComercialPage() {
  const [tab, setTab] = useState<"clientes" | "financeiro">("clientes");

  const totalFaturamento = clients.reduce((s, c) => s + c.faturamentoMes, 0);
  const aReceber = invoices.filter(i => i.status === "aberta" || i.status === "emitida").reduce((s, i) => s + i.valor, 0);
  const vencidas = invoices.filter(i => i.status === "vencida").reduce((s, i) => s + i.valor, 0);

  const brl = (n: number) => `R$ ${(n / 1000).toFixed(0)}k`;
  const brlFull = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Comercial</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">Clientes & Financeiro</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { l: "Faturamento do mês", v: brl(totalFaturamento), icon: TrendingUp, tone: "success" as const, sub: "+8.2% vs. mês anterior" },
            { l: "A receber", v: brl(aReceber), icon: Wallet, tone: "cyan" as const, sub: `${invoices.filter(i => i.status !== "paga" && i.status !== "vencida").length} títulos abertos` },
            { l: "Vencidas", v: brl(vencidas), icon: AlertCircle, tone: "danger" as const, sub: "cobrança prioritária" },
            { l: "Clientes ativos", v: String(clients.filter(c => c.status === "ativo").length), icon: Building2, tone: "amber" as const, sub: `${clients.filter(c => c.status === "renovacao").length} em renovação` },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.l} className="panel p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{m.l}</div>
                  <Icon className={`h-4 w-4 ${m.tone === "danger" ? "text-danger" : m.tone === "success" ? "text-success" : m.tone === "amber" ? "text-accent" : "text-primary"}`} />
                </div>
                <div className={`num text-3xl mt-2 ${m.tone === "danger" ? "text-danger" : ""}`}>{m.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 border-b border-border">
          {(["clientes", "financeiro"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "clientes" ? "Clientes & Contratos" : "Faturamento"}
            </button>
          ))}
        </div>

        {tab === "clientes" ? (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Cliente</th>
                  <th className="text-left font-normal">Segmento</th>
                  <th className="text-left font-normal">Contrato</th>
                  <th className="text-right font-normal">Vol. mensal</th>
                  <th className="text-right font-normal">Faturamento</th>
                  <th className="text-right font-normal">SLA</th>
                  <th className="text-left font-normal pl-4 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.contrato} className="border-t border-border hover:bg-elevated/50">
                    <td className="px-4 py-3 font-medium">{c.nome}</td>
                    <td className="text-muted-foreground text-xs">{c.segmento}</td>
                    <td className="num text-xs">{c.contrato}</td>
                    <td className="text-right num">{c.volMensal.toLocaleString("pt-BR")}</td>
                    <td className="text-right num">R$ {c.faturamentoMes.toLocaleString("pt-BR")}</td>
                    <td className={`text-right num ${c.sla < 95 ? "text-accent" : "text-success"}`}>{c.sla.toFixed(1)}%</td>
                    <td className="pl-4 pr-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(c.status))}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">Documento</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-left font-normal">Tipo</th>
                  <th className="text-left font-normal">Emissão</th>
                  <th className="text-left font-normal">Vencimento</th>
                  <th className="text-right font-normal">Valor</th>
                  <th className="text-left font-normal pl-4 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.numero} className="border-t border-border hover:bg-elevated/50">
                    <td className="px-4 py-3 num text-primary text-xs">{i.numero}</td>
                    <td>{i.cliente}</td>
                    <td className="text-xs text-muted-foreground">{i.tipo}</td>
                    <td className="num text-xs">{i.emissao}</td>
                    <td className={`num text-xs ${i.status === "vencida" ? "text-danger" : ""}`}>{i.vencimento}</td>
                    <td className="text-right num">{brlFull(i.valor)}</td>
                    <td className="pl-4 pr-4">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(i.status))}`}>
                        {i.status}
                      </span>
                    </td>
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
