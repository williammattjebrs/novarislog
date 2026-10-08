// Seletores de motorista/veículo com cadastro rápido e alerta de capacidade (usados na OC).
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMotoristas, useVeiculos, newId } from "@/lib/mock-store";
import { TIPOS_CAMINHAO } from "@/lib/mock-data";
const inp = "w-full bg-input/40 border border-border rounded px-2 py-1.5 text-sm";
const fmtCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, (_, a, b, c, d) => `${a}.${b}.${c}${d ? "-" + d : ""}`);
// Seletor de motorista/veículo com opção de cadastrar um novo na hora.
export function MotoristaSelect({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const mot = useMotoristas();
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ nome: "", cpf: "", telefone: "", email: "" });
  const [err, setErr] = useState("");
  async function salvar() {
    const cpf = f.cpf.replace(/\D/g, "");
    if (!f.nome.trim() || cpf.length !== 11 || f.telefone.replace(/\D/g, "").length < 10) return setErr("Nome, CPF (11 dígitos) e telefone com DDD são obrigatórios.");
    const existente = mot.list.find((x) => x.cpf.replace(/\D/g, "") === cpf);
    if (existente) { onChange(existente.id); setNovo(false); setErr(""); return; }
    const id = newId("MOT");
    try { await mot.add({ id, nome: f.nome.trim(), cpf: fmtCpf(cpf), telefone: f.telefone.trim(), email: f.email.trim() || undefined, cnh: "", ativo: true, criadoEm: new Date().toISOString() }); }
    catch(e){setErr(e instanceof Error?e.message:'Falha ao salvar motorista.');return;}
    onChange(id); setNovo(false); setF({ nome: "", cpf: "", telefone: "", email: "" }); setErr("");
  }
  if (novo) return (
    <div className="space-y-1 border border-primary/40 rounded p-2">
      <div className="text-xs font-semibold text-primary">Novo motorista</div>
      <input className={inp} placeholder="Nome completo" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <div className="flex gap-1">
        <input className={inp} placeholder="CPF" value={f.cpf} onChange={(e) => setF({ ...f, cpf: fmtCpf(e.target.value) })} />
        <input className={inp} placeholder="Telefone (DDD)" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
      </div>
      <input className={inp} type="email" placeholder="E-mail (opcional)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      {err && <div className="text-xs text-danger">{err}</div>}
      <div className="flex gap-1"><Button size="sm" onClick={salvar}>Salvar e vincular</Button><Button size="sm" variant="outline" onClick={() => setNovo(false)}>Voltar</Button></div>
    </div>
  );
  return (
    <select className={inp} value={value} disabled={disabled} onChange={(e) => e.target.value === "__novo__" ? setNovo(true) : onChange(e.target.value)}>
      <option value="">Motorista…</option>
      {mot.list.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome} · {m.cpf} · {m.telefone}</option>)}
      <option value="__novo__">+ Cadastrar novo motorista…</option>
    </select>
  );
}

export function CapacidadeAlerta({ veiculoId, pesoKg }: { veiculoId?: string; pesoKg: number }) {
  const vei = useVeiculos();
  const v = vei.list.find((x) => x.id === veiculoId);
  if (!v) return null;
  if (!v.capacidadeKg) return <div className="text-xs text-muted-foreground">Veículo {v.placa} sem capacidade cadastrada — informe em Motoristas & Veículos para validar o peso.</div>;
  const pct = (pesoKg / v.capacidadeKg) * 100;
  const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  if (pct > 100) return <div className="text-xs rounded border border-danger/50 bg-danger/10 text-danger px-2 py-1">⚠ Excesso de peso: {fmt(pesoKg)} kg para capacidade de {fmt(v.capacidadeKg)} kg ({v.placa}) — {fmt(pesoKg - v.capacidadeKg)} kg acima ({pct.toFixed(0)}%).</div>;
  if (pct >= 90) return <div className="text-xs rounded border border-warning/50 bg-warning/10 text-warning px-2 py-1">Atenção: carga em {pct.toFixed(0)}% da capacidade ({fmt(pesoKg)} / {fmt(v.capacidadeKg)} kg).</div>;
  return <div className="text-xs text-muted-foreground">Ocupação do veículo: {pct.toFixed(0)}% ({fmt(pesoKg)} / {fmt(v.capacidadeKg)} kg).</div>;
}

export function VeiculoSelect({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const vei = useVeiculos();
  const [novo, setNovo] = useState(false);
  const [f, setF] = useState({ placa: "", tipo: "Truck", proprietario: "frota" as "frota" | "terceiro", capacidadeKg: "" });
  const [err, setErr] = useState("");
  async function salvar() {
    const placa = f.placa.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) return setErr("Placa inválida (ex.: ABC1D23 ou ABC1234).");
    const cap = Number(String(f.capacidadeKg).replace(/\./g, "").replace(",", "."));
    if (!cap || cap <= 0) return setErr("Informe a capacidade de carga (kg).");
    const existente = vei.list.find((x) => x.placa === placa);
    if (existente) { try{if (!existente.capacidadeKg) await vei.update(existente.id, { capacidadeKg: cap }); onChange(existente.id); setNovo(false); setErr("");}catch(e){setErr(e instanceof Error?e.message:'Falha ao atualizar veículo.');} return; }
    const id = newId("VEI");
    try{await vei.add({ id, placa, tipo: f.tipo, modelo: "", proprietario: f.proprietario, capacidadeKg: cap, ativo: true, criadoEm: new Date().toISOString() });}catch(e){setErr(e instanceof Error?e.message:'Falha ao salvar veículo.');return;}
    onChange(id); setNovo(false); setF({ placa: "", tipo: "Truck", proprietario: "frota", capacidadeKg: "" }); setErr("");
  }
  if (novo) return (
    <div className="space-y-1 border border-primary/40 rounded p-2">
      <div className="text-xs font-semibold text-primary">Novo veículo</div>
      <div className="flex gap-1">
        <input className={inp} placeholder="Placa" value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value.toUpperCase() })} />
        <select className={inp} value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_CAMINHAO.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="flex gap-1">
        <select className={inp} value={f.proprietario} onChange={(e) => setF({ ...f, proprietario: e.target.value as "frota" | "terceiro" })}><option value="frota">Frota própria</option><option value="terceiro">Terceiro</option></select>
        <input className={inp} inputMode="decimal" placeholder="Capacidade (kg)" value={f.capacidadeKg} onChange={(e) => setF({ ...f, capacidadeKg: e.target.value })} />
      </div>
      {err && <div className="text-xs text-danger">{err}</div>}
      <div className="flex gap-1"><Button size="sm" onClick={salvar}>Salvar e vincular</Button><Button size="sm" variant="outline" onClick={() => setNovo(false)}>Voltar</Button></div>
    </div>
  );
  return (
    <select className={inp} value={value} disabled={disabled} onChange={(e) => e.target.value === "__novo__" ? setNovo(true) : onChange(e.target.value)}>
      <option value="">Veículo (placa)…</option>
      {vei.list.filter((v) => v.ativo).map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.tipo}{v.capacidadeKg ? ` · ${v.capacidadeKg.toLocaleString("pt-BR")} kg` : ""}</option>)}
      <option value="__novo__">+ Cadastrar novo veículo…</option>
    </select>
  );
}
