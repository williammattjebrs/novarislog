import { describe, it, expect } from "vitest";
import { writeFileSync } from "node:fs";
import { buildSnapshot, conteudoSnapshot, destinatariosOc, novaOcRascunho, ocAtivaDaNf, previewConversao, stageFromOc, isEmitida } from "./oc-model";
import { renderOcPdf } from "./oc-pdf";
import type { LocalOperacional, Motorista, Order, OrdemColeta, Veiculo } from "./mock-data";

const now = "2026-10-08T12:00:00.000Z";
const nf = (i: number, extra: Partial<Order> = {}): Order => ({
  id: `NF${i}`, clienteId: "C-EIXO", clienteNome: "EIXO", chaveNFe: String(i).padStart(44, "0"), numeroNFe: String(1000 + i), remetente: "EIXO SNETOR BRASIL COMÉRCIO INTERNACIONAL S.A.", remetenteCnpj: "1",
  cidadeColeta: "Navegantes", ufColeta: "SC", destinatario: "NOVATRIGO INDÚSTRIA DE ALIMENTOS LTDA", destinatarioCnpj: "2", cidadeEntrega: "São Bernardo do Campo", ufEntrega: "SP",
  peso: 1000 + i, volumes: 10, valorNF: 100, valorFrete: 50, origemValor: "tabela", transportType: "", stage: "valorizada", costs: { execMode: "" }, timeline: [], criadoEm: now, atualizadoEm: now, ...extra,
} as Order);
const alilog: LocalOperacional = { id: "L1", nome: "ALILOG", endereco: "Rodovia Jorge Lacerda", numero: "4500", bairro: "Volta Grande", cep: "88371-000", cidade: "Navegantes", uf: "SC", contatos: "Expedição · (47) 3300-0000", emails: ["expedicao@alilog.com.br", "EXPEDICAO@alilog.com.br"], clienteIds: ["C-EIXO", "C-OUTRO"], ativo: true, criadoEm: now };
const novatrigo: LocalOperacional = { id: "L2", nome: "Novatrigo", endereco: "Av. Pereira Barreto", numero: "1500", bairro: "Paraíso", cidade: "São Bernardo do Campo", uf: "SP", emails: ["recebimento@novatrigo.com.br"], clienteIds: [], ativo: true, criadoEm: now };
const mot: Motorista = { id: "M1", nome: "João da Conceição", cpf: "123.456.789-09", telefone: "(47) 99999-0000", email: "expedicao@alilog.com.br", ativo: true, criadoEm: now };
const vei: Veiculo = { id: "V1", placa: "ABC1D23", tipo: "Carreta", proprietario: "frota", capacidadeKg: 30000, ativo: true, criadoEm: now };

function ocEixo(nfs: Order[]): OrdemColeta {
  const oc = novaOcRascunho(nfs, { id: "OC-T1", numero: "OC-T1", autor: "teste", agora: now, clienteColetaNome: "EIXO", localColetaId: "L1", clienteDescargaNome: "Novatrigo", localDescargaId: "L2", contratanteNome: "EIXO", locais: [alilog, novatrigo] });
  return { ...oc, motoristaId: "M1", veiculoId: "V1", dataHoraColeta: "2026-10-09T11:00:00.000Z", dataHoraEntrega: "2026-10-10T14:00:00.000Z", instrucoes: "Conferir lacre. Atenção à descarga com agendamento prévio." };
}

describe("OC v2", () => {
  it("rascunho com várias NFs usa um único local de coleta e descarga e não é monitorado", () => {
    const oc = novaOcRascunho([nf(1), nf(2)], { id: "X", numero: "X", autor: "t", clienteColetaNome: "EIXO", localColetaId: "L1", clienteDescargaNome: "Novatrigo", localDescargaId: "L2", locais: [alilog, novatrigo] });
    expect(oc.status).toBe("rascunho"); expect(oc.orderIds).toEqual(["NF1", "NF2"]);
    expect(oc.localColeta).toBe("ALILOG"); expect(oc.localEntrega).toBe("Novatrigo");
    expect(isEmitida(oc)).toBe(false);
  });
  it("valida obrigatórios antes de emitir", () => {
    const oc = { ...ocEixo([nf(1)]), motoristaId: undefined, dataHoraColeta: "" };
    const r = buildSnapshot(oc, { nfs: [nf(1)], locais: [alilog, novatrigo], motoristas: [mot], veiculos: [vei], emitidoPor: "t" });
    expect(r.snapshot).toBeNull(); expect(r.erros).toContain("Informe o motorista."); expect(r.erros).toContain("Informe data e hora da coleta.");
  });
  it("destinatários deduplicados e pendência para local sem e-mail", () => {
    const r = destinatariosOc(alilog, { ...novatrigo, emails: [] }, mot);
    expect(r.destinatarios).toEqual([{ email: "expedicao@alilog.com.br", papeis: ["coleta", "motorista"] }]);
    expect(r.pendencias).toEqual(["Local de descarga Novatrigo sem e-mail cadastrado"]);
  });
  it("snapshot EIXO/ALILOG/Novatrigo e imutabilidade frente a cadastro alterado", async () => {
    const nfs = Array.from({ length: 60 }, (_, i) => nf(i + 1));
    const oc = ocEixo(nfs);
    const { snapshot } = buildSnapshot(oc, { nfs, locais: [alilog, novatrigo], motoristas: [mot], veiculos: [vei], emitidoPor: "Operador Ágil", agora: now });
    expect(snapshot!.clienteColeta.nome).toBe("EIXO"); expect(snapshot!.coleta.local.nome).toBe("ALILOG");
    expect(`${snapshot!.coleta.local.cidade}/${snapshot!.coleta.local.uf}`).toBe("Navegantes/SC");
    expect(snapshot!.clienteDescarga.nome).toBe("Novatrigo"); expect(snapshot!.descarga.local.nome).toBe("Novatrigo");
    expect(`${snapshot!.descarga.local.cidade}/${snapshot!.descarga.local.uf}`).toBe("São Bernardo do Campo/SP");
    const frozen = JSON.stringify(snapshot);
    alilog.endereco = "Endereço alterado depois"; // cadastro muda após emissão
    expect(JSON.stringify(snapshot)).toBe(frozen);
    const pdf = await renderOcPdf({ ...snapshot!, versao: 1 });
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
    writeFileSync("/tmp/oc-teste.pdf", pdf);
    alilog.endereco = "Rodovia Jorge Lacerda";
  });
  it("revisão sem mudança de conteúdo é detectada", () => {
    const { snapshot } = buildSnapshot(ocEixo([nf(1)]), { nfs: [nf(1)], locais: [alilog, novatrigo], motoristas: [mot], veiculos: [vei], emitidoPor: "a", agora: now });
    const again = { ...snapshot!, emitidoEm: "2027-01-01", emitidoPor: "b" };
    expect(conteudoSnapshot(again)).toBe(conteudoSnapshot(snapshot!));
    expect(conteudoSnapshot({ ...again, instrucoes: "nova" })).not.toBe(conteudoSnapshot(snapshot!));
  });
  it("cancelamento libera a NF e preserva o fiscal", () => {
    const oc = { ...ocEixo([nf(1)]), status: "cancelada" as const };
    expect(ocAtivaDaNf([oc], "NF1")).toBeUndefined();
    expect(stageFromOc("cancelada", nf(1, { stage: "coleta_agendada" }))).toBe("valorizada");
    expect(stageFromOc("cancelada", nf(1, { stage: "cte_ok", cteChave: "x" }))).toBe("cte_ok");
    expect(stageFromOc("coletada", nf(1, { stage: "cte_divergente", cteChave: "x" }))).toBe("cte_divergente");
  });
  it("prévia de conversão preserva número, vínculos e não inventa documento", () => {
    const legados: OrdemColeta[] = [
      { id: "OC-A", numero: "OC-00001", rotaId: "ROT-1", clienteNome: "EIXO", orderIds: ["NF1"], localColeta: "EIXO", cidadeColeta: "Navegantes", ufColeta: "SC", dataHoraColeta: "", localEntrega: "X", cidadeEntrega: "SBC", ufEntrega: "SP", dataHoraEntrega: "", status: "aguardando_programacao", criadoPor: "automacao", criadoEm: now, atualizadoEm: now },
      { id: "OC-B", numero: "OC-00002", rotaId: "ROT-2", clienteNome: "EIXO", orderIds: ["NF2"], localColeta: "EIXO", cidadeColeta: "Navegantes", ufColeta: "SC", dataHoraColeta: now, localEntrega: "X", cidadeEntrega: "SBC", ufEntrega: "SP", dataHoraEntrega: "", status: "emitida", criadoPor: "u", criadoEm: now, atualizadoEm: now },
      { id: "OC-C", numero: "OC-00003", rotaId: "ROT-3", clienteNome: "EIXO", orderIds: ["NF1"], localColeta: "EIXO", cidadeColeta: "Navegantes", ufColeta: "SC", dataHoraColeta: "", localEntrega: "X", cidadeEntrega: "SBC", ufEntrega: "SP", dataHoraEntrega: "", status: "aguardando_programacao", criadoPor: "u", criadoEm: now, atualizadoEm: now },
    ];
    const p = previewConversao(legados, [nf(1), nf(2)], [], "admin", now);
    expect(p[0].proposta!.status).toBe("rascunho"); expect(p[0].proposta!.numero).toBe("OC-00001"); expect(p[0].proposta!.orderIds).toEqual(["NF1"]);
    expect(p[1].proposta!.status).toBe("emitida"); expect(p[1].proposta!.documentoEstado).toBe("legado_sem_snapshot"); expect(p[1].proposta!.docVersion).toBeUndefined();
    expect(p[2].proposta).toBeNull(); // NF já ocupada: não converte
  });
});
