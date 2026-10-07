import type { ReactNode } from "react";
import { useAuth, canAccess } from "@/lib/auth";
import { Navigate } from "@tanstack/react-router";

export function RoleGate({ path, children }: { path: string; children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" search={{ redirect: path }} replace />;
  if (!user.ativo) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div className="max-w-md panel p-8">
          <h1 className="text-xl font-semibold text-danger">Acesso Desativado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sua conta foi desativada por um administrador.</p>
        </div>
      </div>
    );
  }
  if (!canAccess(user.role, path, user.modulos)) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center panel p-8">
          <div className="text-xs uppercase tracking-widest text-danger">Acesso negado</div>
          <h1 className="mt-2 text-xl font-semibold">Sem permissão</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu perfil ({user.role}) não tem acesso a este módulo. Fale com um administrador.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
