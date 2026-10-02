// Controle de acesso front-only. Perfis: admin, comercial, operacao, financeiro.
// Persistência em localStorage. Pronto para trocar por auth real depois.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "comercial" | "operacao" | "financeiro";

export interface AuthUser {
  email: string;
  nome: string;
  role: Role;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);
const KEY = "novaris:auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  const login = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem(KEY, JSON.stringify(u));
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem(KEY);
  };

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}

// mapeamento perfil → módulos permitidos
export const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ["/", "/clientes", "/coletas", "/monitoramento", "/financeiro", "/tv", "/configuracoes"],
  comercial: ["/", "/clientes", "/tv"],
  operacao: ["/", "/coletas", "/monitoramento", "/tv"],
  financeiro: ["/", "/financeiro", "/tv", "/configuracoes"],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  operacao: "Operação",
  financeiro: "Financeiro",
};

export function canAccess(role: Role, pathname: string): boolean {
  const allowed = ROLE_ACCESS[role];
  return allowed.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}
