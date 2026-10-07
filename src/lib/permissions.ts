export const MODULE_PATHS = ["/clientes", "/coletas", "/rotas", "/motoristas", "/monitoramento", "/financeiro", "/configuracoes", "/usuarios"] as const;
export type AccessRole = "admin" | "comercial" | "operacao" | "financeiro";
export const ROLE_MODULES: Record<AccessRole, string[]> = {
  admin: ["/", ...MODULE_PATHS, "/tv"],
  comercial: ["/", "/clientes", "/tv"],
  operacao: ["/", "/coletas", "/rotas", "/motoristas", "/monitoramento", "/tv"],
  financeiro: ["/", "/financeiro", "/tv"],
};
export const COLLECTION_MODULE: Record<string, string> = {
  clients: "/clientes", clientGroups: "/clientes", freightTables: "/clientes", routeRates: "/clientes", quotations: "/clientes", crmDeals: "/clientes",
  orders: "/coletas", rotas: "/rotas", ordensColeta: "/rotas", motoristas: "/motoristas", veiculos: "/motoristas", trackingGroups: "/monitoramento",
  cteDocuments: "/coletas", invoices: "/financeiro", expenses: "/financeiro", expenseGroups: "/financeiro", config: "/configuracoes",
};
export function canUseModule(role: AccessRole, path: string, extras: string[] = []) {
  if (path === "/manual") return true;
  if (["/usuarios", "/configuracoes"].includes(path)) return role === "admin";
  return [...ROLE_MODULES[role], ...extras].some((p) => p === "/" ? path === p : path === p || path.startsWith(p + "/"));
}
export function financialAccess(user: { role: AccessRole; modulos: string[] } | null) {
  return !!user && (user.role === "admin" || user.role === "financeiro" || user.modulos.includes("/financeiro"));
}