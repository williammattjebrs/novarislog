import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Warehouse, PackageCheck, PackageX, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { stock } from "@/lib/mock-data";

export const Route = createFileRoute("/armazem")({
  head: () => ({
    meta: [
      { title: "Armazém & Estoque | CargoHub" },
      { name: "description", content: "Endereçamento, entrada/saída e inventário do centro de distribuição." },
    ],
  }),
  component: ArmazemPage,
});

const movements = [
  { hora: "14:22", tipo: "saida", ref: "LG-24086", desc: "Expedição · Ana Souza", qtd: 22 },
  { hora: "13:58", tipo: "entrada", ref: "REC-4412", desc: "Recebimento Natura", qtd: 148 },
  { hora: "13:41", tipo: "saida", ref: "LG-24085", desc: "Expedição · Marcos Lima", qtd: 41 },
  { hora: "12:20", tipo: "entrada", ref: "REC-4411", desc: "Recebimento Ambev", qtd: 320 },
  { hora: "11:15", tipo: "saida", ref: "LG-24084", desc: "Coleta · Petrobras", qtd: 12 },
  { hora: "10:04", tipo: "entrada", ref: "REC-4410", desc: "Recebimento Renner", qtd: 260 },
] as const;

function ArmazemPage() {
  const abaixoMin = stock.filter((s) => s.qtd < s.minimo);
  const totalSku = stock.length;
  const ocupacao = 72; // %

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Armazém</div>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold">CD Guarulhos · Estoque</h1>
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="panel p-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Ocupação do CD</div>
                <div className="mt-2 num text-4xl">{ocupacao}<span className="text-lg text-muted-foreground">%</span></div>
                <div className="text-xs text-muted-foreground mt-1">14.820 posições · 4.680 livres</div>
              </div>
              <Warehouse className="h-8 w-8 text-primary/70" />
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-danger" style={{ width: `${ocupacao}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] uppercase text-muted-foreground">
              <span>Bloco A · 88%</span>
              <span>B · 74%</span>
              <span>C · 61%</span>
              <span>D · 65%</span>
            </div>
          </div>
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">SKUs ativos</div>
              <PackageCheck className="h-4 w-4 text-success" />
            </div>
            <div className="num text-3xl mt-2">{totalSku * 216}</div>
            <div className="text-xs text-muted-foreground">{totalSku} categorias-mestre</div>
          </div>
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Abaixo do mínimo</div>
              <PackageX className="h-4 w-4 text-danger" />
            </div>
            <div className="num text-3xl mt-2 text-danger">{abaixoMin.length}</div>
            <div className="text-xs text-muted-foreground">itens a repor hoje</div>
          </div>
        </div>

        {/* Stock table + movements */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="panel lg:col-span-2 overflow-x-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Inventário</div>
                <div className="font-display text-lg">Posições e saldos</div>
              </div>
              <span className="text-xs text-muted-foreground">atualizado agora · WMS</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-normal px-4 py-2.5">SKU</th>
                  <th className="text-left font-normal">Descrição</th>
                  <th className="text-left font-normal">Endereço</th>
                  <th className="text-left font-normal">Cliente</th>
                  <th className="text-right font-normal">Qtd</th>
                  <th className="text-right font-normal pr-4">Mín.</th>
                  <th className="text-left font-normal pl-4">Giro</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => {
                  const alerta = s.qtd < s.minimo;
                  return (
                    <tr key={s.sku} className="border-t border-border hover:bg-elevated/50">
                      <td className="px-4 py-3 num text-primary text-xs">{s.sku}</td>
                      <td className="text-sm">{s.descricao}</td>
                      <td className="num text-xs">{s.endereco}</td>
                      <td className="text-xs text-muted-foreground">{s.cliente}</td>
                      <td className={`text-right num ${alerta ? "text-danger" : ""}`}>{s.qtd.toLocaleString("pt-BR")}</td>
                      <td className="text-right num text-xs pr-4 text-muted-foreground">{s.minimo}</td>
                      <td className="pl-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded border ${
                          s.giro === "alto" ? "text-success bg-success/10 border-success/30" :
                          s.giro === "medio" ? "text-accent bg-accent/10 border-accent/30" :
                          "text-muted-foreground bg-muted/40 border-border"
                        }`}>
                          {s.giro}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="panel p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Movimentações</div>
            <div className="font-display text-lg mb-3">Últimas 24h</div>
            <ul className="space-y-2">
              {movements.map((m) => (
                <li key={m.hora + m.ref} className="flex items-center gap-3 rounded-md border border-border bg-elevated/40 p-2.5">
                  <div className={`h-8 w-8 rounded grid place-items-center border ${
                    m.tipo === "entrada" ? "bg-success/10 border-success/30 text-success" : "bg-primary/10 border-primary/30 text-primary"
                  }`}>
                    {m.tipo === "entrada" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{m.desc}</div>
                    <div className="text-xs text-muted-foreground num">{m.hora} · {m.ref}</div>
                  </div>
                  <div className="num text-sm">{m.qtd}<span className="text-xs text-muted-foreground"> un.</span></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
