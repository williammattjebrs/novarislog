export const MODULE_PATHS = ["/clientes", "/importacao", "/rotas", "/ordens-coleta", "/locais-operacionais", "/motoristas", "/monitoramento", "/financeiro", "/configuracoes", "/usuarios", "/empresas", "/relatorios"] as const;
export type AccessRole = "admin" | "comercial" | "operacao" | "financeiro";
export const ROLE_MODULES: Record<AccessRole, string[]> = {
  admin: ["/", ...MODULE_PATHS, "/tv"],
  comercial: ["/", "/clientes", "/tv"],
  operacao: ["/", "/importacao", "/rotas", "/ordens-coleta", "/locais-operacionais", "/motoristas", "/monitoramento", "/tv"],
  financeiro: ["/", "/financeiro", "/relatorios", "/tv"],
};
export const COLLECTION_MODULE: Record<string, string> = {
  clients: "/clientes", clientGroups: "/clientes", freightTables: "/clientes", routeRates: "/clientes", quotations: "/clientes", crmDeals: "/clientes",
  orders: "/rotas", rotas: "/rotas", ordensColeta: "/ordens-coleta", locais: "/locais-operacionais", motoristas: "/motoristas", veiculos: "/motoristas", trackingGroups: "/monitoramento",
  cteDocuments: "/rotas", invoices: "/financeiro", expenses: "/financeiro", expenseGroups: "/financeiro", config: "/configuracoes", companies: "/empresas",
};
export function canUseModule(role: AccessRole, path: string, extras0: string[] = []) {
  if (path === "/manual") return true;
  // Concessão antiga "/coletas" equivale a Rotas (fila de NF-e); o link antigo redireciona.
  const extras = extras0.flatMap((m) => (m === "/coletas" ? ["/coletas", "/rotas"] : m === "/rotas" ? ["/rotas", "/coletas"] : [m]));
  if (path === "/coletas" || path === "/importacao") path = "/rotas";
  if (["/usuarios", "/configuracoes", "/empresas"].includes(path)) return role === "admin";
  return [...ROLE_MODULES[role], ...extras].some((p) => p === "/" ? path === p : path === p || path.startsWith(p + "/"));
}
export function financialAccess(user: { role: AccessRole; modulos: string[] } | null) {
  return !!user && (user.role === "admin" || user.role === "financeiro" || user.modulos.includes("/financeiro"));
}