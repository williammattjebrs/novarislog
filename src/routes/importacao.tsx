// Importação: XML manual, integração por e-mail, logs e sugestões de OC para NFs ainda não coletadas.
import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/RoleGate";
import { NfQueuePage } from "@/components/NfQueuePage";

export const Route = createFileRoute("/importacao")({
  validateSearch: (search: Record<string, unknown>): { registro?: string } => ({ registro: typeof search.registro === "string" ? search.registro : undefined }),
  head: () => ({
    meta: [
      { title: "Importação de XML · NF-e e CT-e | Novaris" },
      { name: "description", content: "Importe XML de NF-e e CT-e, acompanhe a integração por e-mail e monte ordens de coleta sugeridas." },
      { property: "og:title", content: "Importação de XML · NF-e e CT-e | Novaris" },
      { property: "og:description", content: "Integração de XML por e-mail, logs e sugestões de ordens de coleta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportacaoRoute,
});

function ImportacaoRoute() {
  const { registro } = Route.useSearch();
  return <RoleGate path="/importacao"><NfQueuePage modo="importacao" registro={registro} /></RoleGate>;
}
