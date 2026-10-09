// Cadastros base: Motoristas e Veículos — alimentam rotas e ordens de coleta.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, UserPlus, Truck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { useMotoristas, useVeiculos, newId } from "@/lib/mock-store";
import { TIPOS_CAMINHAO } from "@/lib/mock-data";

export const Route = createFileRoute("/motoristas")({
  head: () => ({ meta: [
    { title: "Motoristas & Veículos | Novaris TMS" },
    { name: "description", content: "Cadastro de motoristas (nome, CPF, telefone) e veículos (placa, tipo) para ordens de coleta." },
    { property: "og:title", content: "Motoristas & Veículos | Novaris TMS" },
    { property: "og:description", content: "Base de motoristas e veículos para montar rotas e ordens de coleta." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: () => <RoleGate path="/motoristas"><AppShell><Page /></AppShell></RoleGate>,
});

export const fmtCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => `${a}.${b}.${c}${d ? "-" + d : ""}`);
const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";

function Page() {
  const [tab, setTab] = useState<"m" | "v">("m");
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-display">Motoristas & Veículos</h1>
      <div className="flex gap-2">
        <Button variant={tab === "m" ? "default" : "outline"} onClick={() => setTab("m")}><UserPlus className="h-4 w-4" /> Motoristas</Button>
        <Button variant={tab === "v" ? "default" : "outline"} onClick={() => setTab("v")}><Truck className="h-4 w-4" /> Veículos</Button>
      </div>
      {tab === "m" ? <Motoristas /> : <Veiculos />}
    </div>
  );
}

function Motoristas() {
  const m = useMotoristas();
  const [f, setF] = useState({ nome: "", cpf: "", telefone: "", cnh: "", email: "" });
  const [err, setErr] = useState("");
  async function salvar() {
    const cpf = f.cpf.replace(/\D/g, "");
    if (!f.nome.trim() || cpf.length !== 11 || f.telefone.replace(/\D/g, "").length < 10) return setErr("Informe nome, CPF (11 dígitos) e telefone com DDD.");
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setErr("E-mail inválido.");
    if (m.list.some((x) => x.cpf.replace(/\D/g, "") === cpf)) return setErr("CPF já cadastrado.");
    try { await m.add({ id: newId("MOT"), nome: f.nome.trim(), cpf: fmtCpf(cpf), telefone: f.telefone.trim(), email: f.email.trim() || undefined, cnh: f.cnh.trim(), ativo: true, criadoEm: new Date().toISOString() }); }
    catch (e) { return setErr(e instanceof Error ? e.message : "Falha ao salvar."); }
    setF({ nome: "", cpf: "", telefone: "", cnh: "", email: "" }); setErr("");
  }
  return (
    <div className="panel p-4 space-y-3">
      <div className="grid md:grid-cols-6 gap-2">
        <input className={inp} placeholder="Nome completo" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        <input className={inp} placeholder="CPF" value={f.cpf} onChange={(e) => setF({ ...f, cpf: fmtCpf(e.target.value) })} />
        <input className={inp} placeholder="Telefone (DDD)" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
        <input className={inp} type="email" placeholder="E-mail (opcional)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={inp} placeholder="CNH (opcional)" value={f.cnh} onChange={(e) => setF({ ...f, cnh: e.target.value })} />
        <Button onClick={salvar}>Adicionar</Button>
      </div>
      {err && <div className="text-xs text-danger">{err}</div>}
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground text-left"><tr><th className="py-1">Nome</th><th>CPF</th><th>Telefone</th><th>E-mail</th><th>CNH</th><th>Ativo</th><th /></tr></thead>
        <tbody>
          {m.list.map((x) => (
            <tr key={x.id} className="border-t border-border">
              <td className="py-1.5">{x.nome}</td><td className="num">{x.cpf}</td><td className="num">{x.telefone}</td><td className="text-xs">{x.email || "—"}</td><td>{x.cnh || "—"}</td>
              <td><input type="checkbox" checked={x.ativo} onChange={(e) => m.update(x.id, { ativo: e.target.checked })} /></td>
              <td className="text-right"><button onClick={() => confirm(`Excluir ${x.nome}?`) && m.remove(x.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
          {!m.list.length && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground text-xs">Nenhum motorista cadastrado.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Veiculos() {
  const v = useVeiculos();
  const [f, setF] = useState({ placa: "", placaCarreta: "", tipo: "Truck", modelo: "", proprietario: "frota" as "frota" | "terceiro", capacidadeKg: "" });
  const [err, setErr] = useState("");
  const fmtPlaca = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
  function salvar() {
    const placa = fmtPlaca(f.placa);
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) return setErr("Placa inválida (ex.: ABC1D23 ou ABC1234).");
    const carreta = fmtPlaca(f.placaCarreta);
    if (carreta && !/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(carreta)) return setErr("Placa da carreta inválida (ex.: ABC1D23 ou ABC1234).");
    if (v.list.some((x) => x.placa === placa)) return setErr("Placa já cadastrada.");
    if (!Number(f.capacidadeKg)) return setErr("Informe a capacidade de carga (kg).");
    v.add({ id: newId("VEI"), placa, placaCarreta: carreta || undefined, tipo: f.tipo, modelo: f.modelo.trim(), proprietario: f.proprietario, capacidadeKg: Number(f.capacidadeKg) || undefined, ativo: true, criadoEm: new Date().toISOString() });
    setF({ ...f, placa: "", placaCarreta: "", modelo: "", capacidadeKg: "" }); setErr("");
  }
  return (
    <div className="panel p-4 space-y-3">
      <div className="grid md:grid-cols-6 gap-2">
        <input className={inp} placeholder="Placa (cavalo)" value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value.toUpperCase() })} />
        <input className={inp} placeholder="Placa da carreta (opcional)" value={f.placaCarreta} onChange={(e) => setF({ ...f, placaCarreta: e.target.value.toUpperCase() })} />
        <select className={inp} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_CAMINHAO.map((t) => <option key={t}>{t}</option>)}</select>
        <input className={inp} placeholder="Modelo" value={f.modelo} onChange={(e) => setF({ ...f, modelo: e.target.value })} />
        <select className={inp} value={f.proprietario} onChange={(e) => setF({ ...f, proprietario: e.target.value as "frota" | "terceiro" })}><option value="frota">Frota própria</option><option value="terceiro">Terceiro</option></select>
        <input className={inp} inputMode="numeric" placeholder="Capacidade de carga (kg)" value={f.capacidadeKg} onChange={(e) => setF({ ...f, capacidadeKg: e.target.value.replace(/\D/g, "") })} />
        <Button onClick={salvar}>Adicionar</Button>
      </div>
      {err && <div className="text-xs text-danger">{err}</div>}
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground text-left"><tr><th className="py-1">Placa</th><th>Carreta</th><th>Tipo</th><th>Modelo</th><th>Proprietário</th><th>Capacidade</th><th>Ativo</th><th /></tr></thead>
        <tbody>
          {v.list.map((x) => (
            <tr key={x.id} className="border-t border-border">
              <td className="py-1.5 num">{x.placa}</td><td className="num"><input className={`${inp} w-28`} placeholder="Carreta" defaultValue={x.placaCarreta ?? ""} key={x.placaCarreta ?? "none"} onBlur={(e) => { const p = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); if (p && !/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(p)) { e.target.value = x.placaCarreta ?? ""; return; } if ((p || undefined) !== x.placaCarreta) v.update(x.id, { placaCarreta: p || undefined }); }} /></td><td>{x.tipo}</td><td>{x.modelo || "—"}</td><td>{x.proprietario === "frota" ? "Frota" : "Terceiro"}</td>
              <td className="num"><input className={`${inp} w-28`} inputMode="numeric" placeholder="kg" defaultValue={x.capacidadeKg ?? ""} key={x.capacidadeKg ?? "none"} onBlur={(e) => { const n = Number(e.target.value.replace(/\D/g, "")) || undefined; if (n !== x.capacidadeKg) v.update(x.id, { capacidadeKg: n }); }} /></td>
              <td><input type="checkbox" checked={x.ativo} onChange={(e) => v.update(x.id, { ativo: e.target.checked })} /></td>
              <td className="text-right"><button onClick={() => confirm(`Excluir ${x.placa}?`) && v.remove(x.id)} className="text-danger"><Trash2 className="h-4 w-4" /></button></td>
            </tr>
          ))}
          {!v.list.length && <tr><td colSpan={8} className="py-4 text-center text-muted-foreground text-xs">Nenhum veículo cadastrado.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
