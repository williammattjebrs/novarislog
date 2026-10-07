// Controle de acesso com login real (e-mail + senha) via Lovable Cloud.
// Perfis: admin, comercial, operacao, financeiro.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile } from "@/lib/users.functions";

export type Role = "admin" | "comercial" | "operacao" | "financeiro";

export interface AuthUser {
  email: string;
  nome: string;
  role: Role;
  modulos: string[];
}

interface AuthCtx {
  user: AuthUser | null;
  signIn: (email: string, senha: string) => Promise<string | null>;
  signUp: (nome: string, email: string, senha: string) => Promise<{ erro?: string; info?: string }>;
  sendReset: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  loading: boolean;
}

// Contexto estável entre recargas do módulo (evita "useAuth fora do AuthProvider" após atualização a quente).
const g = globalThis as unknown as { __novarisAuthCtx?: React.Context<AuthCtx | undefined> };
const Ctx = (g.__novarisAuthCtx ??= createContext<AuthCtx | undefined>(undefined));

function traduzErro(msg: string): string {
  if (msg.includes("Invalid login credentials")) return "E-mail ou senha inválidos.";
  if (msg.includes("Email not confirmed")) return "Confirme seu e-mail no link enviado antes de entrar.";
  if (msg.includes("User already registered")) return "Este e-mail já está cadastrado. Faça o login.";
  if (msg.includes("Password should be at least")) return "A senha deve ter no mínimo 6 caracteres.";
  if (msg.includes("rate limit")) return "Muitas tentativas em sequência. Aguarde alguns minutos.";
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile() {
    try {
      const p = await getMyProfile();
      setUser({ email: p.email, nome: p.nome, role: p.role as Role, modulos: p.modulos ?? [] });
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await loadProfile();
      if (mounted) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") setUser(null);
      else if (event === "SIGNED_IN" && session) loadProfile();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, senha: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return traduzErro(error.message);
    await loadProfile();
    return null;
  };

  const signUp = async (nome: string, email: string, senha: string): Promise<{ erro?: string; info?: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) return { erro: traduzErro(error.message) };
    if (!data.session) {
      return { info: "Acesso criado! Confirme seu e-mail no link enviado e depois faça o login." };
    }
    await loadProfile();
    return {};
  };

  const sendReset = async (email: string): Promise<string | null> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return traduzErro(error.message);
    return "E-mail de recuperação enviado. Verifique sua caixa de entrada.";
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const reload = async () => {
    await loadProfile();
  };

  return <Ctx.Provider value={{ user, signIn, signUp, sendReset, signOut, reload, loading }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}

// mapeamento perfil → módulos permitidos
export const ROLE_ACCESS: Record<Role, string[]> = {
  admin: ["/", "/clientes", "/coletas", "/rotas", "/motoristas", "/monitoramento", "/financeiro", "/tv", "/configuracoes", "/usuarios"],
  comercial: ["/", "/clientes", "/tv"],
  operacao: ["/", "/coletas", "/rotas", "/motoristas", "/monitoramento", "/tv"],
  financeiro: ["/", "/financeiro", "/tv", "/configuracoes"],
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  comercial: "Comercial",
  operacao: "Operação",
  financeiro: "Financeiro",
};

export const MODULE_OPTIONS: { path: string; label: string }[] = [
  { path: "/clientes", label: "Clientes & CRM" },
  { path: "/coletas", label: "Coletas & Ordens" },
  { path: "/rotas", label: "Rotas & Ordens de coleta" },
  { path: "/motoristas", label: "Motoristas & Veículos" },
  { path: "/monitoramento", label: "Monitoramento" },
  { path: "/financeiro", label: "Financeiro" },
  { path: "/configuracoes", label: "Configurações" },
  { path: "/usuarios", label: "Usuários & acessos" },
];

export function canAccess(role: Role, pathname: string, extras: string[] = []): boolean {
  if (pathname === "/manual") return true;
  const allowed = [...ROLE_ACCESS[role], ...extras];
  return allowed.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
}
