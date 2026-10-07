import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useClients, useFreightTables, useRouteRates, newId } from "@/lib/mock-store";
import { fmtBRL, TIPOS_CAMINHAO, type Order, type FreightTable } from "@/lib/mock-data";
import { calcFreight } from "@/lib/cost-calc";

// Cadastro de tabela a partir da ordem: (1) aproveitando o cadastro do cliente, (2) do zero.
export function NovaTabelaPanel({ order, onUpdate }: { order: Order; onUpdate: (patch: Partial<Order>) => void }) {
  const clients = useClients();
  const tables = useFreightTables();
  const rates = useRouteRates();
  const [modo, setModo] = useState<"" | "existente" | "zero">("");
  const [clienteId, setClienteId] = useState(order.clienteId || "");
  const [base, setBase] = useState("rotas");
  const [frete, setFrete] = useState(0);
  const [caminhao, setCaminhao] = useState("Truck");
  const [nome, setNome] = useState(`Tabela ${order.ufColeta}→${order.ufEntrega}`);
  const [modal, setModal] = useState<"lotacao" | "fracionada">("lotacao");
  const [valorKg, setValorKg] = useState(0);
  const [minimo, setMinimo] = useState(0);
  const [adv, setAdv] = useState(0);
  const [gris, setGris] = useState(0);
  const [ped, setPed] = useState(0);

  const cli = clients.list.find((c) => c.id === clienteId);
  const tabsCli = tables.list.filter((t) => t.clienteId === clienteId);
  const rotasCli = rates.list.filter((r) => r.clienteId === clienteId);
  const rota = `${order.cidadeColeta}/${order.ufColeta} → ${order.cidadeEntrega}/${order.ufEntrega}`;

  function valorizar(valor: number, ref: string, origem: Order["origemValor"], txt: string) {
    onUpdate({
      clienteId: clienteId || order.clienteId,
      clienteNome: cli?.nome ?? order.clienteNome,
      valorFrete: valor, origemValor: origem, refValor: ref, stage: "valorizada",
      timeline: [...order.timeline, { quando: new Date().toISOString(), autor: "sistema", tipo: "sistema", texto: txt }],
    });
    setModo("");
  }

  function salvarExistente() {
    if (!clienteId) return alert("Selecione o cliente.");
    const now = new Date().toISOString();
    if (base === "rotas") {
      if (frete <= 0) return alert("Informe o valor do frete.");
      const id = newId("RT");
      rates.add({ id, clienteId, origemCidade: order.cidadeColeta, origemUf: order.ufColeta, destinoCidade: order.cidadeEntrega, destinoUf: order.ufEntrega, peso: order.peso, valorNF: order.valorNF, valorFrete: frete, tipoCaminhao: caminhao, criadoEm: now });
      return valorizar(frete, id, "rota_cliente", `Nova rota ${rota} adicionada às rotas do cliente · ${fmtBRL(frete)}`);
    }
    const t = tables.list.find((x) => x.id === base);
    if (!t) return;
    const nova: FreightTable = {
      ...t, id: newId("TAB"), nome: `${t.nome} · ${order.cidadeColeta}→${order.cidadeEntrega}`,
      origemUf: order.ufColeta, origemCidade: order.cidadeColeta, destinoUf: order.ufEntrega, destinoCidade: order.cidadeEntrega, criadoEm: now,
      ...(t.modalidade === "lotacao" && frete > 0 ? { valorLotacao: frete } : {}),
    };
    const v = calcFreight(nova, { peso: order.peso, valorNF: order.valorNF }).total;
    if (v <= 0) return alert("A tabela não gerou valor para esta carga. Informe o valor.");
    tables.add(nova);
    valorizar(v, nova.id, "tabela", `Nova rota ${rota} adicionada com base na tabela ${t.nome} · ${fmtBRL(v)}`);
  }

  function salvarZero() {
    if (!clienteId) return alert("Selecione o cliente.");
    const now = new Date().toISOString();
    const t: FreightTable = {
      id: newId("TAB"), clienteId, nome, modalidade: modal,
      origemUf: order.ufColeta, origemCidade: order.cidadeColeta, destinoUf: order.ufEntrega, destinoCidade: order.cidadeEntrega,
      rows: modal === "fracionada" ? [{ faixaMin: 0, faixaMax: 999999, valorKg, minimo }] : [],
      adValorem: adv, gris, pedagio: ped, prazoDias: 0,
      vigenciaInicio: now.slice(0, 10), vigenciaFim: "", ativa: true, criadoEm: now,
      valorLotacao: modal === "lotacao" ? frete : undefined,
    };
    const v = calcFreight(t, { peso: order.peso, valorNF: order.valorNF }).total;
    if (v <= 0) return alert("Preencha os valores da tabela.");
    tables.add(t);
    valorizar(v, t.id, "tabela", `Nova tabela "${nome}" criada para ${rota} · ${fmtBRL(v)}`);
  }

  const n = (v: number, set: (x: number) => void, ph: string) => (
    <input type="number" className="input h-8 num" placeholder={ph} value={v || ""} onChange={(e) => set(Number(e.target.value))} />
  );
  const btn = (on: boolean) => `text-xs px-2 py-1.5 rounded border ${on ? "border-primary bg-primary/15 text-primary" : "border-border hover:bg-elevated"}`;

  return (
    <div className="mt-2 space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Cadastrar tabela para esta rota:</div>
      <div className="grid grid-cols-2 gap-1">
        <button onClick={() => setModo(modo === "existente" ? "" : "existente")} className={btn(modo === "existente")}>Usar cadastro do cliente</button>
        <button onClick={() => setModo(modo === "zero" ? "" : "zero")} className={btn(modo === "zero")}>Nova tabela do zero</button>
      </div>
      {modo && (
        <div className="space-y-2 text-xs">
          <select className="input h-8 w-full" value={clienteId} onChange={(e) => { setClienteId(e.target.value); setBase("rotas"); }}>
            <option value="">Selecione o cliente…</option>
            {clients.list.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {clients.list.length === 0 && (
            <div className="text-muted-foreground">Nenhum cliente cadastrado. <Link to="/clientes" className="text-primary hover:underline">Cadastrar cliente</Link></div>
          )}
          <div className="text-muted-foreground">Rota: {rota} · {order.peso} kg · NF {fmtBRL(order.valorNF)}</div>
          {modo === "existente" && clienteId && (
            <>
              <select className="input h-8 w-full" value={base} onChange={(e) => setBase(e.target.value)}>
                <option value="rotas">Adicionar às rotas do cliente ({rotasCli.length})</option>
                {tabsCli.map((t) => <option key={t.id} value={t.id}>Copiar condições da tabela: {t.nome}</option>)}
              </select>
              {base === "rotas" ? (
                <div className="grid grid-cols-2 gap-1">
                  {n(frete, setFrete, "Valor do frete R$")}
                  <select className="input h-8" value={caminhao} onChange={(e) => setCaminhao(e.target.value)}>{TIPOS_CAMINHAO.map((t) => <option key={t}>{t}</option>)}</select>
                </div>
              ) : tabsCli.find((t) => t.id === base)?.modalidade === "lotacao" ? n(frete, setFrete, "Valor da lotação nesta rota R$") : (
                <div className="text-muted-foreground">Usa as faixas de peso, ad valorem, GRIS e pedágio da tabela escolhida.</div>
              )}
              <button onClick={salvarExistente} className="w-full px-2 py-1.5 rounded bg-primary text-primary-foreground">Salvar rota e valorizar ordem</button>
            </>
          )}
          {modo === "zero" && (
            <>
              <input className="input h-8 w-full" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da tabela" />
              <select className="input h-8 w-full" value={modal} onChange={(e) => setModal(e.target.value as "lotacao" | "fracionada")}>
                <option value="lotacao">Lotação (valor fechado)</option>
                <option value="fracionada">Fracionada (R$/kg)</option>
              </select>
              <div className="grid grid-cols-2 gap-1">
                {modal === "lotacao" ? n(frete, setFrete, "Valor lotação R$") : <>{n(valorKg, setValorKg, "R$/kg")}{n(minimo, setMinimo, "Frete mínimo R$")}</>}
                {n(adv, setAdv, "Ad valorem %")}
                {n(gris, setGris, "GRIS %")}
                {n(ped, setPed, "Pedágio R$")}
              </div>
              <button onClick={salvarZero} className="w-full px-2 py-1.5 rounded bg-primary text-primary-foreground">Criar tabela e valorizar ordem</button>
              {clienteId && <Link to="/clientes/$id" params={{ id: clienteId }} className="block text-primary hover:underline">Abrir cadastro completo do cliente</Link>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
