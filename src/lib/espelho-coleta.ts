// Espelho da Ordem de Coleta: HTML imprimível (salvar em PDF) e texto para WhatsApp.
import type { Motorista, Order, OrdemColeta, Veiculo } from "./mock-data";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
export const fmtDH = (iso?: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "a definir");

export function espelhoHtml(oc: OrdemColeta, nfs: Order[], m?: Motorista, v?: Veiculo) {
  const peso = nfs.reduce((s, n) => s + (n.peso || 0), 0);
  const vol = nfs.reduce((s, n) => s + (n.volumes || 0), 0);
  const valor = nfs.reduce((s, n) => s + (n.valorNF || 0), 0);
  const rows = nfs.map((n) => `<tr><td>${esc(n.numeroNFe)}</td><td>${esc(n.remetente)}</td><td>${esc(n.destinatario)}</td><td class="r">${n.volumes ?? 0}</td><td class="r">${(n.peso || 0).toLocaleString("pt-BR")}</td><td class="r">${(n.valorNF || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Espelho de Coleta ${esc(oc.numero)}</title>
<style>body{font-family:Arial,sans-serif;color:#111;margin:24px;font-size:12px}h1{font-size:18px;margin:0}.top{display:flex;justify-content:space-between;border-bottom:3px solid #FF6B00;padding-bottom:8px;margin-bottom:12px}
.g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}.b{border:1px solid #ccc;border-radius:4px;padding:8px}.b h3{margin:0 0 4px;font-size:11px;text-transform:uppercase;color:#FF6B00}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#0B1325;color:#fff}.r{text-align:right}
.sig{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin-top:40px}.sig div{border-top:1px solid #000;text-align:center;padding-top:4px}@media print{button{display:none}}</style></head><body>
<button onclick="print()" style="float:right;padding:6px 12px">Imprimir / salvar PDF</button>
<div class="top"><div><h1>ESPELHO DE COLETA</h1>Novaris · Operador Logístico Integrado</div><div style="text-align:right"><b>OC ${esc(oc.numero)}</b><br>Emitida em ${fmtDH(oc.criadoEm)}<br>Cliente: ${esc(oc.clienteNome)}</div></div>
<div class="g"><div class="b"><h3>Coleta</h3>${esc(oc.localColeta)}<br>${esc(oc.cidadeColeta)}/${esc(oc.ufColeta)}<br><b>Data/hora:</b> ${fmtDH(oc.dataHoraColeta)}</div>
<div class="b"><h3>Entrega</h3>${esc(oc.localEntrega)}<br>${esc(oc.cidadeEntrega)}/${esc(oc.ufEntrega)}<br><b>Previsão:</b> ${fmtDH(oc.dataHoraEntrega)}</div>
<div class="b"><h3>Motorista</h3>${esc(m?.nome ?? "—")}<br>CPF: ${esc(m?.cpf ?? "—")}<br>Tel.: ${esc(m?.telefone ?? "—")}</div>
<div class="b"><h3>Veículo</h3>Placa: <b>${esc(v?.placa ?? "—")}</b><br>${esc(v?.tipo ?? "")} ${esc(v?.modelo ?? "")}</div></div>
<table><thead><tr><th>NF-e</th><th>Remetente</th><th>Destinatário</th><th class="r">Vol.</th><th class="r">Peso (kg)</th><th class="r">Valor NF</th></tr></thead><tbody>${rows}</tbody>
<tfoot><tr><th colspan="3">${nfs.length} nota(s)</th><th class="r">${vol}</th><th class="r">${peso.toLocaleString("pt-BR")}</th><th class="r">${valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</th></tr></tfoot></table>
${oc.observacao ? `<div class="b" style="margin-top:12px"><h3>Observações</h3>${esc(oc.observacao)}</div>` : ""}
<div class="sig"><div>Expedição (remetente)</div><div>Motorista</div><div>Recebedor</div></div></body></html>`;
}

export function abrirEspelho(oc: OrdemColeta, nfs: Order[], m?: Motorista, v?: Veiculo) {
  const w = window.open("", "_blank");
  if (!w) return alert("Libere pop-ups para abrir o espelho.");
  w.document.write(espelhoHtml(oc, nfs, m, v)); w.document.close();
}

export function baixarEspelho(oc: OrdemColeta, nfs: Order[], m?: Motorista, v?: Veiculo) {
  const blob = new Blob([espelhoHtml(oc, nfs, m, v)], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `espelho-coleta-${oc.numero}.html`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function whatsappMotorista(oc: OrdemColeta, nfs: Order[], m?: Motorista, v?: Veiculo) {
  const txt = [`*ORDEM DE COLETA ${oc.numero}* — Novaris`, `Cliente: ${oc.clienteNome}`, ``,
    `*COLETA:* ${oc.localColeta} — ${oc.cidadeColeta}/${oc.ufColeta}`, `Data/hora: ${fmtDH(oc.dataHoraColeta)}`, ``,
    `*ENTREGA:* ${oc.localEntrega} — ${oc.cidadeEntrega}/${oc.ufEntrega}`, `Previsão: ${fmtDH(oc.dataHoraEntrega)}`, ``,
    `Veículo: ${v?.placa ?? "—"} (${v?.tipo ?? ""})`, `NFs: ${nfs.map((n) => n.numeroNFe).join(", ")}`,
    `Peso total: ${nfs.reduce((s, n) => s + (n.peso || 0), 0).toLocaleString("pt-BR")} kg · Volumes: ${nfs.reduce((s, n) => s + (n.volumes || 0), 0)}`,
    oc.observacao ? `Obs.: ${oc.observacao}` : ""].filter((l) => l !== undefined).join("\n");
  let tel = (m?.telefone ?? "").replace(/\D/g, "");
  if (tel && !tel.startsWith("55")) tel = "55" + tel;
  window.open(`https://wa.me/${tel}?text=${encodeURIComponent(txt)}`, "_blank");
}
