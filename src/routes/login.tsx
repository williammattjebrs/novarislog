import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth, ROLE_LABEL, type Role } from "@/lib/auth";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar | Novaris" },
      { name: "description", content: "Acesso à plataforma de gestão logística Novaris." },
    ],
  }),
  component: LoginPage,
});

const ROLES: Role[] = ["admin", "comercial", "operacao", "financeiro"];

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(user?.email ?? "");
  const [nome, setNome] = useState(user?.nome ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "admin");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !nome.trim()) return;
    login({ email: email.trim(), nome: nome.trim(), role });
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="h-11 w-11 rounded-md bg-primary/10 border border-primary/30 grid place-items-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="font-display text-xl font-semibold">NOVARIS</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">hub logístico integrado</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="input" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className="input" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Perfil de acesso</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="input">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90">
            Entrar
          </button>
          <p className="text-[11px] text-muted-foreground text-center">
            Autenticação simulada · substituir por Lovable Cloud quando ativar backend.
          </p>
        </form>
      </div>
    </div>
  );
}
