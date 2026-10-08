// Compatibilidade: a fila de NF-e e a importação de XML agora ficam em Rotas.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/coletas")({
  validateSearch: (s: Record<string, unknown>): { registro?: string } => ({ registro: typeof s.registro === "string" ? s.registro : undefined }),
  beforeLoad: ({ search }) => { throw redirect({ to: "/importacao", search, replace: true }); },
  head: () => ({ meta: [
    { title: "Coletas mudou para Rotas | Novaris" },
    { name: "description", content: "A importação de XML e a fila de NF-e agora ficam em Rotas." },
    { property: "og:title", content: "Coletas mudou para Rotas | Novaris" },
    { property: "og:description", content: "A importação de XML e a fila de NF-e agora ficam em Rotas." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});
