import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrdemColeta, Order } from "./mock-data";
const db = vi.hoisted(() => ({ getList: vi.fn(), commitLists: vi.fn() }));
vi.mock("./shared-db", () => db);
import { aplicarStatusOc } from "./oc-actions";

describe("Status rápido do Monitoramento", () => {
  const oc = { id: "OC-TEST", numero: "OC-TEST", modelo: "v2", status: "emitida", orderIds: ["NF-TEST"], historico: [] } as unknown as OrdemColeta;
  const nf = { id: "NF-TEST", stage: "coleta_agendada", timeline: [] } as unknown as Order;
  beforeEach(() => {
    vi.clearAllMocks();
    db.getList.mockImplementation((key: string) => key === "ordensColeta" ? [oc] : [nf]);
    db.commitLists.mockResolvedValue(undefined);
  });
  it("grava OC e NF juntas com histórico e data real de coleta", async () => {
    await aplicarStatusOc(oc, "coletada", "Coletada", "Operador");
    const [lists] = db.commitLists.mock.calls[0] ?? [];
    expect(lists.ordensColeta[0].status).toBe("coletada");
    expect(lists.ordensColeta[0].historico[0]).toMatchObject({ autor: "Operador", tipo: "status", texto: "Coletada" });
    expect(lists.orders[0].stage).toBe("aguardando_cte");
    expect(lists.orders[0].coletadoEm).toBeTruthy();
    expect(oc.status).toBe("emitida");
  });
  it("propaga falha de gravação sem alterar a OC original", async () => {
    db.commitLists.mockRejectedValue(new Error("CONFLICT"));
    await expect(aplicarStatusOc(oc, "em_viagem", "Em viagem", "Operador")).rejects.toThrow("CONFLICT");
    expect(oc.status).toBe("emitida");
  });
});