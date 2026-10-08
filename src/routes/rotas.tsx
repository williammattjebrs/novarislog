// Rotas: somente NFs coletadas (status a partir de "Coletado") ou com CT-e emitido. Importação/triagem fica em /importacao.
import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/RoleGate";
import { NfQueuePage } from "@/components/NfQueuePage";

export const Route = createFileRoute("/rotas")({
  validateSearch: (search: Record<string, unknown>): { registro?: string } => ({ registro: typeof search.registro === "string" ? search.registro : undefined }),
  head: () => ({
    meta: [
      { title: "Rotas · cargas coletadas e CT-e | Novaris" },
      { name: "description", content: "NFs já coletadas ou com CT-e emitido, prontas para saída de viagem e conferência de CT-e." },
      { property: "og:title", content: "Rotas · cargas coletadas e CT-e | Novaris" },
      { property: "og:description", content: "Acompanhe as NFs coletadas ou com CT-e emitido para dar saída de viagem." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RotasRoute,
});

function RotasRoute() {
  const { registro } = Route.useSearch();
  return <RoleGate path="/rotas"><NfQueuePage modo="rotas" registro={registro} /></RoleGate>;
}
