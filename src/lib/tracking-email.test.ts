import { describe, expect, it } from "vitest";
import { buildTrackingEmail, enrichTrackingOrders, latestTrackingObservation, TRACKING_COLUMNS } from "./tracking-email";
import type { Order, OrdemColeta } from "./mock-data";

const nf = { id: "NF-TEST", numeroNFe: "45696", destinatario: "São Bernardo & Filhos", peso: 1500, stage: "cte_ok", timeline: [], previsaoEntrega: "2026-10-09T19:00:00Z" } as unknown as Order;
const oc = { id: "OC-TEST", numero: "1531", status: "em_viagem", orderIds: [nf.id], historico: [{ quando: "2026-10-08T12:00:00Z", tipo: "status", texto: "Coletada · aguardando CT-e" }] } as unknown as OrdemColeta;
describe("Follow-up de monitoramento", () => {
  it("usa as seis colunas, data real da coleta e status operacional da OC", () => {
    const email = buildTrackingEmail(enrichTrackingOrders([nf], [oc]), "Cliente");
    expect(TRACKING_COLUMNS).toEqual(["Nº da NF", "Cliente Destino", "Data da coleta", "Data/Hora prevista de entrega", "Status Atual", "Última Observação apontada"]);
    expect(email.rows[0]).toEqual(["45696", "São Bernardo & Filhos", "08/10/2026, 09:00", "09/10/2026, 16:00", "Em viagem", "—"]);
    expect(email.html).toContain("São Bernardo &amp; Filhos"); expect(email.html).toContain("1.500 kg");
  });
  it("seleciona a última observação ou ocorrência sem pegar log de envio", () => {
    const order = { ...nf, timeline: [
      { quando: "2026-10-08T12:00:00Z", tipo: "ocorrencia" as const, texto: "Atraso", autor: "Teste" },
      { quando: "2026-10-09T12:00:00Z", tipo: "observacao" as const, texto: "Recebimento <confirmado>", autor: "Teste" },
      { quando: "2026-10-09T13:00:00Z", tipo: "sistema" as const, texto: "Envio aceito", autor: "Teste" },
    ] };
    expect(latestTrackingObservation(order)).toBe("Recebimento <confirmado>");
    expect(buildTrackingEmail(enrichTrackingOrders([order], [oc]), "Cliente").html).toContain("Recebimento &lt;confirmado&gt;");
  });
  it("não inventa data de coleta usando a programação", () => {
    const o = { ...oc, historico: [], dataHoraColeta: "2026-10-08T12:00:00Z" };
    expect(buildTrackingEmail(enrichTrackingOrders([nf], [o]), "Cliente").rows[0][2]).toBe("Não registrada");
  });
});