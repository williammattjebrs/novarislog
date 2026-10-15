// Simulador de frete: página própria, alcançada pelo botão fixo no topo do AppShell.
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { FreightSimulator } from "@/components/FreightSimulator";

export const Route = createFileRoute("/simulador")({
  head: () => ({ meta: [
    { title: "Simulador de frete | Novaris TMS" },
    { name: "description", content: "Calcule o preço do frete a partir dos custos da operação, impostos e margem desejada." },
    { property: "og:title", content: "Simulador de frete | Novaris TMS" },
    { property: "og:description", content: "Composição do preço de frete: contratação, mão de obra, despesas, seguro, impostos e margem." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/simulador"><AppShell><Page /></AppShell></RoleGate>,
});

function Page() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-display">Simulador de frete</h1>
          <p className="text-sm text-muted-foreground">Monte o preço a partir dos custos da operação e salve o resultado na tabela padrão.</p>
        </div>
        <Button variant="outline" size="sm" className="ml-auto" asChild>
          <Link to="/clientes"><ArrowLeft className="h-4 w-4" /> Voltar para clientes</Link>
        </Button>
      </div>
      <FreightSimulator />
    </div>
  );
}
