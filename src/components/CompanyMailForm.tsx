import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getCompanyMail, saveCompanyMail } from "@/lib/company-mail.functions";

const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
const PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  HostGator: { host: "mail.SEUDOMINIO.com.br", port: 465, secure: true },
  Hostinger: { host: "smtp.hostinger.com", port: 465, secure: true },
  Locaweb: { host: "email-ssl.com.br", port: 465, secure: true },
  Gmail: { host: "smtp.gmail.com", port: 465, secure: true },
};

/** E-mail de envio da empresa: Microsoft 365 conectado ou servidor SMTP próprio. */
export function CompanyMailForm({ empresaId }: { empresaId: string }) {
  const get = useServerFn(getCompanyMail); const save = useServerFn(saveCompanyMail);
  const [f, setF] = useState({ provedor: "smtp" as "smtp" | "microsoft", emailEnvio: "", nomeRemetente: "", host: "", port: 465, secure: true, usuario: "", senha: "" });
  const [temSenha, setTemSenha] = useState(false); const [status, setStatus] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { get({ data: { empresaId } }).then((c) => { setF({ ...c, provedor: c.provedor as "smtp" | "microsoft", senha: "" }); setTemSenha(c.temSenha); setStatus(c.ultimoStatus ?? ""); }).catch((e) => setStatus(e instanceof Error ? e.message : "Falha ao carregar.")); }, [empresaId]);
  async function salvar(testar: boolean) {
    setBusy(true); setStatus("");
    try { const r = await save({ data: { empresaId, ...f, senha: f.senha || undefined, testar } }); setStatus(r.status); if (f.senha) setTemSenha(true); setF({ ...f, senha: "" }); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Falha ao salvar."); } finally { setBusy(false); }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return <div className="border border-border rounded p-3 space-y-2">
    <div className="font-display text-sm">E-mail de envio desta empresa</div>
    <p className="text-xs text-muted-foreground">As OCs aos armazéns e as atualizações aos clientes desta empresa saem deste e-mail. Sem cadastro, os envios ficam bloqueados.</p>
    <div className="flex gap-3 text-sm">
      <label className="flex items-center gap-1"><input type="radio" checked={f.provedor === "smtp"} onChange={() => setF({ ...f, provedor: "smtp" })} /> Servidor de e-mail (HostGator, Hostinger, etc.)</label>
      <label className="flex items-center gap-1"><input type="radio" checked={f.provedor === "microsoft"} onChange={() => setF({ ...f, provedor: "microsoft" })} /> Microsoft 365 conectado</label>
    </div>
    <div className="grid md:grid-cols-3 gap-2">
      <input aria-label="E-mail de envio" type="email" className={inp} placeholder="E-mail de envio *" value={f.emailEnvio} onChange={set("emailEnvio")} />
      <input aria-label="Nome do remetente" className={inp} placeholder="Nome exibido (opcional)" value={f.nomeRemetente} onChange={set("nomeRemetente")} />
    </div>
    {f.provedor === "smtp" && <>
      <div className="flex flex-wrap gap-1 items-center text-xs"><span className="text-muted-foreground">Preencher servidor:</span>{Object.entries(PRESETS).map(([n, p]) => <button key={n} type="button" className="border border-border rounded px-2 py-0.5" onClick={() => setF({ ...f, ...p, host: n === "HostGator" && f.emailEnvio.includes("@") ? `mail.${f.emailEnvio.split("@")[1]}` : p.host })}>{n}</button>)}</div>
      <div className="grid md:grid-cols-3 gap-2">
        <input aria-label="Servidor SMTP" className={inp} placeholder="Servidor SMTP (ex.: mail.empresa.com.br)" value={f.host} onChange={set("host")} />
        <input aria-label="Porta" type="number" className={inp} value={f.port} onChange={(e) => setF({ ...f, port: Number(e.target.value) })} />
        <select aria-label="Conexão" className={inp} value={f.secure ? "1" : "0"} onChange={(e) => setF({ ...f, secure: e.target.value === "1" })}><option value="1">Segura (SSL/TLS)</option><option value="0">Sem criptografia</option></select>
        <input aria-label="Usuário" className={inp} placeholder="Usuário (normalmente o próprio e-mail)" value={f.usuario} onChange={set("usuario")} />
        <input aria-label="Senha" type="password" className={inp} placeholder={temSenha ? "Senha (deixe vazio para manter)" : "Senha"} value={f.senha} onChange={set("senha")} />
      </div>
      <p className="text-xs text-muted-foreground">Use a porta 465 com conexão segura. A porta 587 (STARTTLS) ainda não é suportada.</p>
    </>}
    {f.provedor === "microsoft" && <p className="text-xs text-muted-foreground">A conta Microsoft com este e-mail precisa estar conectada ao sistema.</p>}
    {status && <div role="status" className="text-xs">{status}</div>}
    <div className="flex gap-2 justify-end"><Button variant="outline" disabled={busy} onClick={() => salvar(false)}>Salvar e-mail</Button><Button disabled={busy} onClick={() => salvar(true)}>{busy ? "Testando…" : "Salvar e testar"}</Button></div>
  </div>;
}
