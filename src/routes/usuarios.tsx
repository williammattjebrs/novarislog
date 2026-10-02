import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { UserCog, UserPlus, RefreshCw, Trash2, Mail } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { listUsers, inviteUser, setUserRole, deleteUser, type RoleData } from "@/lib/users.functions";
import { useAuth, ROLE_LABEL } from "@/lib/auth";

export const Route = createFileRoute("/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários & acessos | Novaris" },
      {
        name: "description",
        content: "Convide usuários da sua empresa, defina perfis de acesso e gerencie contas do TMS Novaris.",
      },
    ],
  }),
  component: () => (
    <RoleGate path="/usuarios">
      <AppShell>
        <UsuariosPage />
      </AppShell>
    </RoleGate>
  ),
});

const PERFIS: RoleData[] = ["admin", "comercial", "operacao", "financeiro"];

function UsuariosPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const changeRole = useServerFn(setUserRole);
  const remove = useServerFn(deleteUser);

  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["users"], queryFn: fetchUsers });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleData>("operacao");
  const [msg, setMsg] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErro(null);
    setBusy(true);
    try {
      await invite({ nome: nome.trim(), email: email.trim(), role });
      setMsg(`Convite enviado para ${email.trim()}. O usuário define a senha pelo link recebido no e-mail.`);
      setNome("");
      setEmail("");
      setRole("operacao");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao enviar o convite.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(userId: string, novoRole: RoleData) {
    setMsg(null);
    setErro(null);
    try {
      await changeRole({ userId, role: novoRole });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao alterar o perfil.");
    }
  }

  async function handleDelete(userId: string) {
    if (!window.confirm("Excluir este acesso? O usuário perderá o acesso ao sistema.")) return;
    setMsg(null);
    setErro(null);
    try {
      await remove({ userId });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao excluir o usuário.");
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" /> Usuários & acessos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Convide pessoas da sua empresa pelo e-mail e defina o perfil de cada uma.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-ghost inline-flex items-center gap-1.5 text-xs"
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </header>

      {msg && <div className="text-xs text-success border border-success/40 bg-success/10 rounded px-3 py-2">{msg}</div>}
      {erro && <div className="text-xs text-danger border border-danger/40 bg-danger/10 rounded px-3 py-2">{erro}</div>}

      <form onSubmit={handleInvite} className="panel p-4 grid md:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da pessoa" className="input" required />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pessoa@empresa.com"
            className="input"
            required
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 block">Perfil</label>
          <select value={role} onChange={(e) => setRole(e.target.value as RoleData)} className="input">
            {PERFIS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={busy} className="btn-primary inline-flex items-center gap-1.5 text-xs">
          <UserPlus className="h-3.5 w-3.5" /> {busy ? "Enviando…" : "Convidar"}
        </button>
      </form>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="text-left font-medium px-4 py-3">Usuário</th>
              <th className="text-left font-medium px-4 py-3">Perfil</th>
              <th className="text-left font-medium px-4 py-3">E-mail</th>
              <th className="text-left font-medium px-4 py-3">Situação</th>
              <th className="text-right font-medium px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs">
                  Carregando usuários…
                </td>
              </tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground text-xs">
                  Nenhum usuário cadastrado ainda. Envie o primeiro convite acima.
                </td>
              </tr>
            )}
            {(data ?? []).map((u) => (
              <tr key={u.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full bg-accent/20 border border-accent/40 grid place-items-center text-[11px] font-semibold text-accent shrink-0">
                      {(u.nome || u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="truncate">{u.nome || "—"}</div>
                      <div className="text-[11px] text-muted-foreground">{ROLE_LABEL[u.role]}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as RoleData)}
                    className="input py-1.5 text-xs"
                    disabled={u.id === user?.email && false}
                  >
                    {PERFIS.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <Mail className="h-3 w-3 text-muted-foreground" /> {u.email}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.confirmado ? (
                    <span className="text-[11px] text-success border border-success/40 bg-success/10 rounded px-2 py-0.5">ativo</span>
                  ) : (
                    <span className="text-[11px] text-warning border border-warning/40 bg-warning/10 rounded px-2 py-0.5">
                      convite pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="text-muted-foreground hover:text-danger p-1.5"
                    title="Excluir acesso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Perfis: <strong>Administrador</strong> acessa tudo, inclusive esta tela; <strong>Comercial</strong> acessa clientes;
        <strong> Operação</strong> acessa coletas e monitoramento; <strong>Financeiro</strong> acessa o financeiro e as
        configurações. Todos veem os indicadores da TV.
      </p>
    </div>
  );
}
