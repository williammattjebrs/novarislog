import logo from "@/assets/novaris-logo.png.asset.json";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Truck } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar | Novaris" },
      { name: "description", content: "Acesso à plataforma de gestão logística Novaris." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, sendReset, user, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [modo, setModo] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: search.redirect || "/", replace: true });
  }, [loading, user, navigate, search.redirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setInfo(null);
    setBusy(true);
    try {
      if (modo === "login") {
        const err = await signIn(email.trim(), senha);
        if (err) {
          setErro(err);
          return;
        }
        navigate({ to: search.redirect || "/", replace: true });
      } else {
        const r = await signUp(nome.trim(), email.trim(), senha);
        if (r.erro) {
          setErro(r.erro);
          return;
        }
        setInfo(r.info ?? "Acesso criado!");
        setModo("login");
        setSenha("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setErro(null);
    setInfo(null);
    if (!email.trim()) {
      setErro("Informe o e-mail para receber o link de recuperação.");
      return;
    }
    setBusy(true);
    try {
      const r = await sendReset(email.trim());
      if (r) setInfo(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center mb-6 justify-center">
          <img src={logo.url} alt="Novaris — Operador Logístico Integrado" className="h-20 w-auto" />
        </div>

        <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
          {modo === "signup" && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="input" required />
            </div>
          )}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              className="input"
              required
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="input"
              minLength={6}
              required
            />
          </div>

          {erro && <div className="text-xs text-danger border border-danger/40 bg-danger/10 rounded px-3 py-2">{erro}</div>}
          {info && <div className="text-xs text-success border border-success/40 bg-success/10 rounded px-3 py-2">{info}</div>}

          <button type="submit" disabled={busy} className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Aguarde…" : modo === "login" ? "Entrar" : "Criar acesso"}
          </button>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <button
              type="button"
              onClick={() => {
                setModo(modo === "login" ? "signup" : "login");
                setErro(null);
                setInfo(null);
              }}
              className="text-primary hover:underline"
            >
              {modo === "login" ? "Criar novo acesso" : "Já tenho acesso"}
            </button>
            {modo === "login" && (
              <button type="button" onClick={handleReset} className="hover:text-foreground">
                Esqueci minha senha
              </button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
            <Truck className="h-3 w-3" /> Acesso com o e-mail da empresa · perfis definidos pelo administrador.
          </p>
        </form>
      </div>
    </div>
  );
}
