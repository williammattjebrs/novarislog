// Modelo da Ordem de Coleta independente (v2). Código puro: usado no navegador, no servidor e nos testes.
import type { Empresa, LocalOperacional, Motorista, OCStatus, OrdemColeta, Order, OrderStage, Veiculo, Client } from "./mock-data";

export const OC_EMITIDAS: OCStatus[] = ["emitida", "em_coleta", "coletada", "em_viagem", "entregue", "ocorrencia"];
export const OC_EXECUCAO: { id: OCStatus; label: string }[] = [
  { id: "emitida", label: "Emitida · programada" },
  { id: "em_coleta", label: "Em coleta" },
  { id: "coletada", label: "Coletada" },
  { id: "em_viagem", label: "Em viagem" },
  { id: "entregue", label: "Entregue" },
  { id: "ocorrencia", label: "Ocorrência" },
];
export const isV2 = (oc: OrdemColeta) => oc.modelo === "v2";
export const isEmitida = (oc: OrdemColeta) => isV2(oc) && OC_EMITIDAS.includes(oc.status);
/** OC que ocupa a NF (qualquer OC não cancelada, inclusive legada). */
export function ocAtivaDaNf(ocs: OrdemColeta[], nfId: string) {
  return ocs.find((o) => o.status !== "cancelada" && o.orderIds.includes(nfId));
}
/** Andamento operacional da OC propagado às NFs (o fiscal/financeiro do CT-e permanece na NF). */
export function stageFromOc(status: OCStatus, nf: Order): OrderStage {
  const fiscal = nf.cteChave && ["cte_ok", "cte_divergente"].includes(nf.stage);
  switch (status) {
    case "emitida": return fiscal ? nf.stage : "coleta_agendada";
    case "em_coleta": return fiscal ? nf.stage : "em_coleta";
    case "coletada": return nf.cteChave ? nf.stage : "aguardando_cte";
    case "em_viagem": return "em_viagem";
    case "entregue": return "entregue";
    case "ocorrencia": return "ocorrencia";
    case "cancelada": return nf.cteChave ? nf.stage : nf.origemValor ? "valorizada" : "aguarda_vinculacao";
    default: return nf.stage;
  }
}

export const enderecoCompleto = (l?: Pick<LocalOperacional, "endereco" | "numero" | "complemento" | "bairro" | "cep" | "cidade" | "uf">) =>
  !l ? "" : [[l.endereco, l.numero].filter(Boolean).join(", "), l.complemento, l.bairro, `${l.cidade}/${l.uf}`, l.cep ? `CEP ${l.cep}` : ""].filter(Boolean).join(" · ");

const EMAIL = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/;
export type Destinatario = { email: string; papeis: string[] };
/** Local de coleta efetivo de uma NF dentro da OC (por NF; senão o padrão do cabeçalho). */
export const localColetaDaNf = (oc: Pick<OrdemColeta, "coletaPorNf" | "localColetaId">, nfId: string) => oc.coletaPorNf?.[nfId] || oc.localColetaId || "";
/** E-mail vai somente aos locais de coleta; papel "coleta:<id>" permite enviar a cada um só as NFs dele. */
export function destinatariosOc(coletas: (LocalOperacional | undefined)[]) {
  const map = new Map<string, Set<string>>();
  const pendencias: string[] = [];
  const vistos = new Set<string>();
  for (const l of coletas) {
    if (!l || vistos.has(l.id)) continue; vistos.add(l.id);
    const valid = (l.emails ?? []).map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e));
    if (!valid.length) pendencias.push(`Local de coleta ${l.nome} sem e-mail cadastrado`);
    valid.forEach((e) => (map.get(e) ?? map.set(e, new Set()).get(e)!).add(`coleta:${l.id}`));
  }
  const destinatarios: Destinatario[] = [...map.entries()].map(([email, p]) => ({ email, papeis: [...p] }));
  return { destinatarios, pendencias };
}

export type SnapEmpresa = { id: string; nome: string; razaoSocial: string; cnpj: string; endereco: string; telefone: string; email: string; logoDataUrl?: string };
export type OcSnapshot = {
  empresa?: SnapEmpresa;
  contratacao?: { tipo: "terceiro" | "frota"; custo: number };
  ocId: string; numero: string; emitidoEm: string; emitidoPor: string;
  clienteColeta: { nome: string }; clienteDescarga: { nome: string }; contratante: { nome: string };
  coleta: { local: SnapLocal; dataHora: string }; descarga: { local: SnapLocal; dataHora: string };
  motorista: { nome: string; cpf: string; telefone: string }; veiculo: { placa: string; placaCarreta?: string; tipo: string };
  nfs: { id: string; numero: string; chave: string; remetente: string; destinatario: string; peso: number; volumes: number; coletaLocalId?: string }[];
  /** Todos os locais de coleta da OC (a OC pode coletar em vários armazéns). */
  coletas?: SnapLocal[];
  totais: { peso: number; volumes: number }; instrucoes: string;
  destinatarios: Destinatario[]; pendenciasEnvio: string[];
};
export type SnapLocal = { id: string; nome: string; endereco: string; cidade: string; uf: string; contatos: string; emails: string[] };
const snapLocal = (l: LocalOperacional): SnapLocal => ({ id: l.id, nome: l.nome, endereco: enderecoCompleto(l), cidade: l.cidade, uf: l.uf, contatos: l.contatos ?? "", emails: l.emails ?? [] });

export function validarEmissao(oc: OrdemColeta, ctx: { nfs: Order[]; locais: LocalOperacional[]; motoristas: Motorista[]; veiculos: Veiculo[]; empresas?: Empresa[] }) {
  const erros: string[] = [];
  const empresa = ctx.empresas?.find((e) => e.id === oc.empresaId);
  if (ctx.empresas && !empresa) erros.push("Escolha a empresa emissora da OC.");
  if (!oc.contratacao) erros.push("Informe a contratação: terceiro ou frota própria.");
  else if (!(Number(oc.custoMotorista) > 0)) erros.push(oc.contratacao === "terceiro" ? "Informe o valor fechado com o motorista." : "Informe o custo da frota própria.");
  if (!isV2(oc)) erros.push("OC legada: converta antes de emitir.");
  if (["cancelada", "entregue"].includes(oc.status)) erros.push("OC cancelada ou entregue não pode ser emitida.");
  if (!oc.orderIds.length) erros.push("Selecione ao menos uma NF.");
  const faltando = oc.orderIds.filter((id) => !ctx.nfs.some((n) => n.id === id));
  if (faltando.length) erros.push(`NF não encontrada: ${faltando.join(", ")}`);
  const m = ctx.motoristas.find((x) => x.id === oc.motoristaId);
  const v = ctx.veiculos.find((x) => x.id === oc.veiculoId);
  const idsColeta = [...new Set(oc.orderIds.map((id) => localColetaDaNf(oc, id)))];
  const lcs = idsColeta.map((id) => ctx.locais.find((x) => x.id === id)).filter(Boolean) as LocalOperacional[];
  const lc = lcs[0];
  const ld = ctx.locais.find((x) => x.id === oc.localDescargaId);
  if (!m) erros.push("Informe o motorista."); else if (!m.telefone) erros.push("Motorista sem telefone.");
  if (!v) erros.push("Informe o veículo.");
  if (!oc.clienteColetaNome?.trim()) erros.push("Informe o cliente da coleta (dono da carga).");
  if (!oc.clienteDescargaNome?.trim()) erros.push("Informe o cliente da descarga.");
  const semLocal = oc.orderIds.filter((id) => !ctx.locais.some((x) => x.id === localColetaDaNf(oc, id)));
  if (semLocal.length) erros.push(`Informe o local de coleta de ${semLocal.length} NF(s).`);
  lcs.filter((l) => !l.endereco?.trim() || !l.cidade).forEach((l) => erros.push(`Local de coleta ${l.nome} sem endereço completo.`));
  // Local de entrega é opcional; se informado, precisa de endereço completo.
  if (ld && (!ld.endereco?.trim() || !ld.cidade)) erros.push(`Local de descarga ${ld.nome} sem endereço completo.`);
  if (!oc.dataHoraColeta) erros.push("Informe data e hora da coleta.");
  return { erros, m, v, lc, ld, lcs, empresa };
}

export function buildSnapshot(oc: OrdemColeta, ctx: { nfs: Order[]; locais: LocalOperacional[]; motoristas: Motorista[]; veiculos: Veiculo[]; empresas?: Empresa[]; emitidoPor: string; agora?: string }) {
  const { erros, m, v, lc, ld, lcs, empresa } = validarEmissao(oc, ctx);
  if (erros.length || !m || !v || !lc) return { erros, snapshot: null };
  const nfs = oc.orderIds.map((id) => ctx.nfs.find((n) => n.id === id)!).map((n) => ({
    id: n.id, numero: String(n.numeroNFe), chave: n.chaveNFe ?? "", remetente: n.remetente, destinatario: n.destinatario, peso: Number(n.peso) || 0, volumes: Number(n.volumes) || 0, coletaLocalId: localColetaDaNf(oc, n.id),
  }));
  const { destinatarios, pendencias } = destinatariosOc(lcs);
  const snapshot: OcSnapshot = {
    ...(empresa ? { empresa: { id: empresa.id, nome: empresa.nome, razaoSocial: empresa.razaoSocial ?? "", cnpj: empresa.cnpj ?? "", endereco: [empresa.endereco, empresa.cidade && `${empresa.cidade}/${empresa.uf ?? ""}`].filter(Boolean).join(" · "), telefone: empresa.telefone ?? "", email: empresa.email ?? "", logoDataUrl: empresa.logoDataUrl } } : {}),
    ...(oc.contratacao ? { contratacao: { tipo: oc.contratacao, custo: Number(oc.custoMotorista) || 0 } } : {}),
    ocId: oc.id, numero: oc.numero, emitidoEm: ctx.agora ?? new Date().toISOString(), emitidoPor: ctx.emitidoPor,
    clienteColeta: { nome: oc.clienteColetaNome ?? "" }, clienteDescarga: { nome: oc.clienteDescargaNome ?? "" }, contratante: { nome: oc.contratanteNome || oc.clienteColetaNome || "" },
    coleta: { local: snapLocal(lc), dataHora: oc.dataHoraColeta }, coletas: lcs.map(snapLocal), descarga: { local: ld ? snapLocal(ld) : { id: "", nome: oc.localEntrega?.trim() || "A definir", endereco: "", cidade: oc.cidadeEntrega || "A definir", uf: oc.ufEntrega || "-", contatos: "", emails: [] }, dataHora: oc.dataHoraEntrega ?? "" },
    motorista: { nome: m.nome, cpf: m.cpf, telefone: m.telefone }, veiculo: { placa: v.placa, placaCarreta: v.placaCarreta, tipo: v.tipo },
    nfs, totais: { peso: nfs.reduce((s, n) => s + n.peso, 0), volumes: nfs.reduce((s, n) => s + n.volumes, 0) },
    instrucoes: oc.instrucoes ?? oc.observacao ?? "", destinatarios, pendenciasEnvio: pendencias,
  };
  return { erros: [], snapshot };
}

/** Conteúdo comparável (ignora carimbo de emissão) para decidir se há revisão real. */
export const conteudoSnapshot = (s: Partial<OcSnapshot> & Record<string, unknown>) => {
  const { emitidoEm: _a, emitidoPor: _b, versao: _c, ...rest } = s as Record<string, unknown>;
  return JSON.stringify(rest);
};

export function novaOcRascunho(nfs: Order[], dados: { numero: string; id: string; autor: string; agora?: string; clienteColetaId?: string; clienteColetaNome: string; localColetaId?: string; clienteDescargaId?: string; clienteDescargaNome: string; localDescargaId?: string; contratanteId?: string; contratanteNome?: string; locais: LocalOperacional[] }): OrdemColeta {
  const now = dados.agora ?? new Date().toISOString();
  const lc = dados.locais.find((l) => l.id === dados.localColetaId); const ld = dados.locais.find((l) => l.id === dados.localDescargaId);
  const n0 = nfs[0];
  return {
    id: dados.id, numero: dados.numero, modelo: "v2", rotaId: "", clienteNome: dados.clienteColetaNome, orderIds: nfs.map((n) => n.id),
    clienteColetaId: dados.clienteColetaId, clienteColetaNome: dados.clienteColetaNome, localColetaId: dados.localColetaId,
    clienteDescargaId: dados.clienteDescargaId, clienteDescargaNome: dados.clienteDescargaNome, localDescargaId: dados.localDescargaId,
    contratanteId: dados.contratanteId, contratanteNome: dados.contratanteNome || dados.clienteColetaNome,
    localColeta: lc?.nome ?? "", cidadeColeta: lc?.cidade ?? n0?.cidadeColeta ?? "", ufColeta: lc?.uf ?? n0?.ufColeta ?? "", dataHoraColeta: "",
    localEntrega: ld?.nome ?? "", cidadeEntrega: ld?.cidade ?? n0?.cidadeEntrega ?? "", ufEntrega: ld?.uf ?? n0?.ufEntrega ?? "", dataHoraEntrega: "",
    status: "rascunho", documentoEstado: "sem_documento", criadoPor: dados.autor, criadoEm: now, atualizadoEm: now,
    historico: [{ quando: now, autor: dados.autor, tipo: "sistema", texto: `Rascunho criado com ${nfs.length} NF(s)` }],
  };
}

// ---------- Transição dos registros legados ----------
const LEGADO_STATUS: Partial<Record<OCStatus, OCStatus>> = {
  aguardando_programacao: "rascunho", emitida: "emitida", enviada_motorista: "emitida", em_coleta: "em_coleta",
  coletada: "coletada", em_viagem: "em_viagem", entregue: "entregue", cancelada: "cancelada",
};
export type ConversaoItem = { oc: OrdemColeta; proposta: OrdemColeta | null; avisos: string[] };
export function previewConversao(ocs: OrdemColeta[], orders: Order[], clients: Client[], autor: string, agora = new Date().toISOString()): ConversaoItem[] {
  const ocupadas = new Map<string, string>();
  for (const o of ocs) if (isV2(o) && o.status !== "cancelada") o.orderIds.forEach((id) => ocupadas.set(id, o.id));
  return ocs.filter((o) => !isV2(o)).map((oc) => {
    const avisos: string[] = [];
    const status = LEGADO_STATUS[oc.status] ?? "rascunho";
    const conflitos = oc.orderIds.filter((id) => ocupadas.has(id) && ocupadas.get(id) !== oc.id);
    if (conflitos.length && status !== "cancelada") return { oc, proposta: null, avisos: [`NF já em outra OC ativa: ${conflitos.join(", ")} — não convertida`] };
    if (status !== "cancelada") oc.orderIds.forEach((id) => ocupadas.set(id, oc.id));
    const faltam = oc.orderIds.filter((id) => !orders.some((n) => n.id === id));
    if (faltam.length) avisos.push(`NF não encontrada: ${faltam.join(", ")} (vínculo mantido)`);
    if (status === "rascunho") avisos.push("Programação incompleta: continua como rascunho");
    if (status !== "rascunho" && status !== "cancelada") avisos.push("Sem documento histórico: marcado como legado sem PDF; nenhum e-mail retroativo");
    const nf0 = orders.find((n) => oc.orderIds.includes(n.id));
    const cliente = clients.find((c) => c.id === nf0?.clienteId);
    const proposta: OrdemColeta = {
      ...oc, modelo: "v2", status,
      clienteColetaId: cliente?.id, clienteColetaNome: oc.clienteNome,
      clienteDescargaNome: nf0?.destinatario ?? oc.localEntrega, contratanteNome: oc.clienteNome,
      instrucoes: oc.observacao, documentoEstado: status === "rascunho" || status === "cancelada" ? "sem_documento" : "legado_sem_snapshot",
      legado: { statusOriginal: oc.status, rotaId: oc.rotaId, convertidoEm: agora, convertidoPor: autor },
      historico: [{ quando: oc.criadoEm, autor: oc.criadoPor, tipo: "sistema", texto: `Registro legado criado (status original: ${oc.status})` }, { quando: agora, autor, tipo: "sistema", texto: "Convertida para o novo modelo de OC após prévia confirmada" }],
      atualizadoEm: agora,
    };
    return { oc, proposta, avisos };
  });
}
