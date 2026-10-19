import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { nfsDoDestinatario, ocEmailHtml } from "./oc.server";
import type { OcSnapshot } from "./oc-model";

const local = { id: "L1", nome: "Armazém", endereco: "Rua A", cidade: "Navegantes", uf: "SC", contatos: "", emails: [] };
const snapshot: OcSnapshot = {
  ocId: "TEST", numero: "OC-TEST", emitidoEm: "2026-10-13T19:00:00Z", emitidoPor: "Operador",
  clienteColeta: { nome: "Cliente" }, clienteDescarga: { nome: "Destino" }, contratante: { nome: "Cliente" },
  coleta: { local, dataHora: "2026-10-14T17:00:00Z" }, descarga: { local, dataHora: "" },
  motorista: { nome: "João & José", cpf: "123.456.789-09", telefone: "" },
  veiculo: { placa: "ABC1D23", placaCarreta: "DEF4G56", tipo: "Carreta" },
  nfs: ["8393", "8394", "8395"].map((numero, i) => ({ id: numero, numero, chave: "", remetente: "Cliente", destinatario: "Destino", peso: 1000, volumes: 1, coletaLocalId: i === 2 ? "L2" : "L1" })),
  totais: { peso: 3000, volumes: 3 }, instrucoes: "Atenção <lacre>", destinatarios: [], pendenciasEnvio: [],
};

describe("E-mail de agendamento ao armazém", () => {
  it("mantém as NFs individuais e mescla seis colunas apenas nas linhas do armazém", () => {
    const html = ocEmailHtml(snapshot, nfsDoDestinatario(snapshot, ["coleta:L1"]));
    expect(html.match(/rowspan="2"/g)).toHaveLength(5);
    expect(html.match(/ABC1D23 \/ DEF4G56/g)).toHaveLength(1);
    expect(html.match(/João &amp; José/g)).toHaveLength(1);
    expect(html).toContain("Atenção &lt;lacre&gt;");
    expect(html).toContain(">8393</td>");
    expect(html).toMatch(/>8394<\/td><td[^>]*>[^<]+<\/td><\/tr>/);
    expect(html).not.toContain("8395");
    expect(html).toContain("Entregas: 2");
    expect(html).toContain('colspan="5"');
    writeFileSync("/tmp/oc-email-merged.html", html);
  });
  it("funciona com uma NF e veículo sem carreta", () => {
    const html = ocEmailHtml({ ...snapshot, veiculo: { placa: "ABC1D23", tipo: "Truck" } }, snapshot.nfs.slice(0, 1));
    expect(html.match(/rowspan="1"/g)).toHaveLength(5);
    expect(html).not.toContain(" / ");
    expect(html).toContain("Entregas: 1");
  });
  it("não gera células mescladas sem notas", () => {
    expect(ocEmailHtml(snapshot, [])).not.toContain("rowspan=");
  });
});