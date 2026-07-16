import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  PackageCheck,
  AlertTriangle,
  Timer,
  MapPin,
  Radio,
} from "lucide-react";
import { orders, routes, throughputSeries, slaSeries, statusLabel, statusTone } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Novaris — Torre de Controle Integrado" },
      {
        name: "description",
        content:
          "Hub de gestão para operador logístico: pedidos, rotas, frota, armazém e financeiro em uma única torre de controle.",
      },
      { property: "og:title", content: "Novaris — Torre de Controle Integrado" },
      {
        property: "og:description",
        content: "Hub de gestão para operador logístico: pedidos, rotas, frota, armazém e financeiro em uma única torre de controle.",
      },
    ],
  }),
  component: Dashboard,
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

function Sparkline({ data, color = "cyan" }: { data: number[]; color?: "cyan" | "amber" | "success" }) {
  const w = 220, h = 56, pad = 4;
  const min = Math.min(...data), max = Math.max(...data);
  const range = Math.max(1, max - min);
  const pts = data
    .map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1);
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  const stroke = color === "amber" ? "var(--amber)" : color === "success" ? "var(--success)" : "var(--cyan)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-14">
      <defs>
        <linearGradient id={`g-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={`${pad},${h - pad} ${pts} ${w - pad},${h - pad}`}
        fill={`url(#g-${color})`}
        stroke="none"
      />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({
  label,
  value,
  delta,
  positive,
  icon: Icon,
  suffix,
  spark,
  sparkColor,
}: {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: typeof Truck;
  suffix?: string;
  spark: number[];
  sparkColor?: "cyan" | "amber" | "success";
}) {
  return (
    <div className="panel p-5 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
            <Icon className="h-3.5 w-3.5" />
            {label}
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="num text-3xl">{value}</span>
            {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
          </div>
        </div>
        <div
          className={[
            "flex items-center gap-1 text-xs px-2 py-1 rounded-md border",
            positive ? "text-success bg-success/10 border-success/30" : "text-danger bg-danger/10 border-danger/30",
          ].join(" ")}
        >
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {delta}
        </div>
      </div>
      <div className="mt-2 -mx-2">
        <Sparkline data={spark} color={sparkColor} />
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <AppShell>
      <div className="relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative p-4 md:p-6 space-y-6">
          {/* Title strip */}
          <div className="flex items-end justify-between flex-wrap gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Torre de controle · tempo real
              </div>
              <h1 className="mt-1 text-2xl md:text-3xl font-semibold">
                Boa tarde, Marina.{" "}
                <span className="text-muted-foreground">42 veículos em operação agora.</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Radio className="h-3.5 w-3.5 text-success" /> feed telemetria</span>
              <span className="text-border">·</span>
              <span>última sync <span className="num text-foreground">00:04</span> atrás</span>
            </div>
          </div>

          {/* KPI grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi label="Entregas hoje" value="1.284" suffix="/ 1.510" delta="+12.4%" positive icon={PackageCheck} spark={throughputSeries} sparkColor="cyan" />
            <Kpi label="SLA D+0" value="97,4" suffix="%" delta="+1.2 pp" positive icon={Timer} spark={slaSeries} sparkColor="success" />
            <Kpi label="Frota ativa" value="42" suffix="/ 56 veíc." delta="-3 unid." positive={false} icon={Truck} spark={[30, 32, 34, 33, 35, 38, 40, 41, 42, 42, 41, 42]} sparkColor="cyan" />
            <Kpi label="Ocorrências abertas" value="7" delta="+2 hoje" positive={false} icon={AlertTriangle} spark={[2, 3, 3, 4, 5, 4, 5, 6, 6, 7, 7, 7]} sparkColor="amber" />
          </div>

          {/* Two-column strip */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Live routes map placeholder */}
            <div className="panel lg:col-span-2 p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Mapa operacional</div>
                  <div className="font-display text-lg">Rotas em execução</div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> em rota</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> parada</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" /> atraso</span>
                </div>
              </div>
              <div className="relative h-[320px] bg-[radial-gradient(ellipse_at_center,oklch(0.24_0.02_260)_0%,oklch(0.16_0.02_260)_70%)]">
                <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 800 320" preserveAspectRatio="none">
                  <defs>
                    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
                      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--grid-line)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="800" height="320" fill="url(#grid)" />
                  <path d="M40,260 C160,220 220,120 380,140 S620,240 760,80" stroke="var(--cyan)" strokeWidth="2" fill="none" strokeDasharray="4 6" />
                  <path d="M60,60 C180,120 280,80 420,200 S640,180 760,240" stroke="var(--amber)" strokeWidth="2" fill="none" strokeDasharray="4 6" />
                  <path d="M40,180 C200,160 340,260 520,220 S700,140 780,160" stroke="var(--danger)" strokeWidth="2" fill="none" strokeDasharray="4 6" />
                </svg>
                {[
                  { top: "22%", left: "18%", label: "RIO-2A81", tone: "cyan" },
                  { top: "40%", left: "48%", label: "SPX-9C22", tone: "cyan" },
                  { top: "68%", left: "34%", label: "PAR-7B90", tone: "amber" },
                  { top: "58%", left: "72%", label: "SPX-4E11", tone: "danger" },
                  { top: "30%", left: "82%", label: "SPX-1D45", tone: "cyan" },
                ].map((p) => (
                  <div key={p.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: p.top, left: p.left }}>
                    <div className={`h-3 w-3 rounded-full ${p.tone === "cyan" ? "bg-primary" : p.tone === "amber" ? "bg-accent" : "bg-danger"} shadow-[0_0_14px_currentColor]`} style={{ color: p.tone === "cyan" ? "var(--cyan)" : p.tone === "amber" ? "var(--amber)" : "var(--danger)" }} />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] num text-foreground/80 bg-panel/80 border border-border rounded px-1.5 py-0.5">
                      {p.label}
                    </div>
                  </div>
                ))}
                <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-border bg-panel/80 px-3 py-2 backdrop-blur">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs num">-23.5489, -46.6388 · SP</span>
                </div>
              </div>
            </div>

            {/* Ocorrências */}
            <div className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Ocorrências</div>
                  <div className="font-display text-lg">Precisam de ação</div>
                </div>
                <span className="num text-xs text-danger bg-danger/10 border border-danger/30 rounded px-2 py-0.5">7 abertas</span>
              </div>
              <ul className="mt-3 divide-y divide-border">
                {[
                  { t: "Atraso 3h — R-8804", d: "Casas Bahia · Rafael Costa", tone: "danger" },
                  { t: "CNH vence em 30d", d: "Sérgio Matos · categoria E", tone: "amber" },
                  { t: "Revisão vencida", d: "Placa SPX-4E11 · Actros", tone: "danger" },
                  { t: "Estoque abaixo do mínimo", d: "SKU-91130 · Renner", tone: "amber" },
                  { t: "Fatura vencida", d: "Casas Bahia · R$ 148.200", tone: "danger" },
                ].map((o) => (
                  <li key={o.t} className="py-2.5 flex items-start gap-3">
                    <span className={`mt-1 h-2 w-2 rounded-full ${o.tone === "danger" ? "bg-danger" : "bg-accent"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{o.t}</div>
                      <div className="text-xs text-muted-foreground truncate">{o.d}</div>
                    </div>
                    <button className="text-xs text-primary hover:underline">tratar</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom strip: pedidos + rotas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Últimos pedidos</div>
                  <div className="font-display text-lg">Fluxo de expedição</div>
                </div>
              </div>
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-normal py-2">Pedido</th>
                      <th className="text-left font-normal">Cliente</th>
                      <th className="text-left font-normal">Rota</th>
                      <th className="text-left font-normal">Status</th>
                      <th className="text-right font-normal">ETA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 6).map((o) => (
                      <tr key={o.id} className="border-t border-border">
                        <td className="py-2.5 num text-primary">{o.id}</td>
                        <td>{o.cliente}</td>
                        <td className="text-muted-foreground text-xs">{o.origem} → {o.destino}</td>
                        <td>
                          <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(o.status))}`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {statusLabel(o.status)}
                          </span>
                        </td>
                        <td className="text-right num text-xs">{o.eta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Rotas ativas</div>
                  <div className="font-display text-lg">Progresso em tempo real</div>
                </div>
              </div>
              <ul className="space-y-3">
                {routes.slice(0, 5).map((r) => (
                  <li key={r.id} className="rounded-md border border-border p-3 bg-elevated/40">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="num text-primary text-sm">{r.id}</span>
                        <span className="text-xs text-muted-foreground truncate">· {r.motorista} · <span className="num">{r.placa}</span></span>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${toneClass(statusTone(r.status))}`}>{r.status.replace("_", " ")}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${r.status === "atrasada" ? "bg-danger" : r.status === "concluida" ? "bg-success" : "bg-primary"}`}
                          style={{ width: `${r.progresso}%` }}
                        />
                      </div>
                      <span className="num text-xs w-10 text-right">{r.progresso}%</span>
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                      <span>{r.concluidas}/{r.paradas} paradas · {r.regiao}</span>
                      <span className="num">{r.distancia} km</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
