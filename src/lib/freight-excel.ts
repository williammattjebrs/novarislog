// Importação em massa de tabelas de frete via Excel modelo.
// Uma linha = uma combinação rota + tipo de caminhão (+ faixa de peso quando fracionada).
// Cidades são validadas/corrigidas contra a base oficial do IBGE.

import * as XLSX from "xlsx";
import { correctCity, loadCities, sameCityName } from "@/components/CityPicker";
import { TIPOS_CAMINHAO, type FreightRow, type FreightTable, type Modalidade } from "./mock-data";

export interface BulkRow {
  nome: string;
  modalidade: Modalidade;
  tipoCaminhao: string;
  origemCidade: string;
  origemUf: string;
  destinoCidade: string;
  destinoUf: string;
  faixaMin: number;
  faixaMax: number;
  valorKg: number;
  minimo: number;
  valorLotacao: number;
  adValorem: number;
  gris: number;
  pedagio: number;
  prazoDias: number;
  vigenciaInicio: string;
  vigenciaFim: string;
}

export interface BulkResult {
  tables: Omit<FreightTable, "id" | "clienteId" | "criadoEm">[];
  erros: string[];
  avisos: string[];
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

const COL: Record<keyof BulkRow, string[]> = {
  nome: ["tabela", "nome", "nome_tabela"],
  modalidade: ["modalidade", "modo"],
  tipoCaminhao: ["tipo_caminhao", "caminhao", "veiculo", "tipo"],
  origemCidade: ["origem_cidade", "cidade_origem", "origem"],
  origemUf: ["origem_uf", "uf_origem"],
  destinoCidade: ["destino_cidade", "cidade_destino", "destino"],
  destinoUf: ["destino_uf", "uf_destino"],
  faixaMin: ["faixa_min", "peso_min", "de"],
  faixaMax: ["faixa_max", "peso_max", "ate", "até"],
  valorKg: ["valor_kg", "r$/kg", "rs/kg", "valorkg"],
  minimo: ["minimo", "mínimo", "frete_min"],
  valorLotacao: ["valor_lotacao", "lotacao", "lotação", "valor_fechado"],
  adValorem: ["ad_valorem", "advalorem", "adv"],
  gris: ["gris"],
  pedagio: ["pedagio", "pedágio"],
  prazoDias: ["prazo_dias", "prazo"],
  vigenciaInicio: ["vigencia_inicio", "vigência_início", "vig_inicio"],
  vigenciaFim: ["vigencia_fim", "vigência_fim", "vig_fim"],
};

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of Object.keys(row)) {
    if (keys.includes(norm(k))) return row[k];
  }
  return undefined;
}
const num = (v: unknown) => (v === undefined || v === "" || v === null ? 0 : Number(String(v).replace(",", ".")) || 0);
const txt = (v: unknown) => String(v ?? "").trim();

function normModalidade(v: string): Modalidade {
  const n = norm(v);
  return n.startsWith("lot") ? "lotacao" : "fracionada";
}

function normTipo(v: string): string | null {
  const n = norm(v);
  if (!n) return null;
  return TIPOS_CAMINHAO.find((t) => norm(t) === n) ?? null;
}

// Lê o Excel modelo e agrupa as linhas em tabelas (rota + tipo de caminhão).
export async function parseFreightBulkExcel(file: File): Promise<BulkResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const erros: string[] = [];
  const avisos: string[] = [];
  const groups = new Map<string, { base: BulkRow; rows: FreightRow[] }>();

  // Carrega base IBGE uma vez para validar/corrigir cidades.
  const ibge = await loadCities();
  const ibgeOk = ibge.length > 0;
  if (!ibgeOk) avisos.push("Base IBGE indisponível — cidades importadas sem validação.");

  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const linha = i + 2; // linha no Excel (cabeçalho = 1)
    const oc = txt(pick(r, COL.origemCidade));
    const ou = txt(pick(r, COL.origemUf)).toUpperCase();
    const dc = txt(pick(r, COL.destinoCidade));
    const du = txt(pick(r, COL.destinoUf)).toUpperCase();
    if (!oc && !ou && !dc && !du) continue; // linha vazia

    if (!oc || !ou || !dc || !du) { erros.push(`Linha ${linha}: informe origem (cidade/UF) e destino (cidade/UF).`); continue; }

    // Validação IBGE: corrige grafia; rejeita quando não encontra a cidade na UF.
    let origemCidade = oc, destinoCidade = dc;
    if (ibgeOk) {
      const cO = await correctCity(oc, ou);
      const cD = await correctCity(dc, du);
      if (!ibge.some((c) => c.uf === ou && sameCityName(c.nome, cO))) { erros.push(`Linha ${linha}: cidade de origem "${oc}/${ou}" não encontrada no IBGE.`); continue; }
      if (!ibge.some((c) => c.uf === du && sameCityName(c.nome, cD))) { erros.push(`Linha ${linha}: cidade de destino "${dc}/${du}" não encontrada no IBGE.`); continue; }
      if (cO !== oc) avisos.push(`Linha ${linha}: origem ajustada para "${cO}/${ou}" (IBGE).`);
      if (cD !== dc) avisos.push(`Linha ${linha}: destino ajustado para "${cD}/${du}" (IBGE).`);
      origemCidade = cO; destinoCidade = cD;
    }

    const tipoRaw = txt(pick(r, COL.tipoCaminhao));
    const tipo = normTipo(tipoRaw);
    if (tipoRaw && !tipo) { erros.push(`Linha ${linha}: tipo de caminhão "${tipoRaw}" inválido. Use: ${TIPOS_CAMINHAO.join(", ")}.`); continue; }

    const modalidade = normModalidade(txt(pick(r, COL.modalidade)));
    const base: BulkRow = {
      nome: txt(pick(r, COL.nome)) || `${origemCidade}→${destinoCidade}${tipo ? ` · ${tipo}` : ""}`,
      modalidade,
      tipoCaminhao: tipo ?? "",
      origemCidade, origemUf: ou, destinoCidade, destinoUf: du,
      faixaMin: num(pick(r, COL.faixaMin)),
      faixaMax: num(pick(r, COL.faixaMax)),
      valorKg: num(pick(r, COL.valorKg)),
      minimo: num(pick(r, COL.minimo)),
      valorLotacao: num(pick(r, COL.valorLotacao)),
      adValorem: num(pick(r, COL.adValorem)),
      gris: num(pick(r, COL.gris)),
      pedagio: num(pick(r, COL.pedagio)),
      prazoDias: num(pick(r, COL.prazoDias)),
      vigenciaInicio: txt(pick(r, COL.vigenciaInicio)) || new Date().toISOString().slice(0, 10),
      vigenciaFim: txt(pick(r, COL.vigenciaFim)) || "",
    };

    const key = [base.nome, base.modalidade, base.tipoCaminhao, ou, origemCidade, du, destinoCidade].join("|").toLowerCase();
    if (modalidade === "fracionada") {
      if (base.faixaMax <= 0 || base.valorKg <= 0) { erros.push(`Linha ${linha}: fracionada precisa de faixa_max e valor_kg.`); continue; }
      const g = groups.get(key) ?? { base, rows: [] };
      g.rows.push({ faixaMin: base.faixaMin, faixaMax: base.faixaMax, valorKg: base.valorKg, minimo: base.minimo });
      groups.set(key, g);
    } else {
      if (base.valorLotacao <= 0) { erros.push(`Linha ${linha}: lotação precisa de valor_lotacao.`); continue; }
      groups.set(key, { base, rows: [] });
    }
  }

  const tables: BulkResult["tables"] = [...groups.values()].map(({ base, rows }) => ({
    nome: base.nome,
    modalidade: base.modalidade,
    tipoCaminhao: base.tipoCaminhao || undefined,
    origemUf: base.origemUf,
    origemCidade: base.origemCidade,
    destinoUf: base.destinoUf,
    destinoCidade: base.destinoCidade,
    rows: rows.sort((a, b) => a.faixaMin - b.faixaMin),
    adValorem: base.adValorem,
    gris: base.gris,
    pedagio: base.pedagio,
    prazoDias: base.prazoDias,
    vigenciaInicio: base.vigenciaInicio,
    vigenciaFim: base.vigenciaFim,
    ativa: true,
    valorLotacao: base.modalidade === "lotacao" ? base.valorLotacao : undefined,
  }));

  return { tables, erros, avisos };
}

// Gera o Excel modelo para download.
export function downloadFreightTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["tabela", "modalidade", "tipo_caminhao", "origem_cidade", "origem_uf", "destino_cidade", "destino_uf", "faixa_min", "faixa_max", "valor_kg", "minimo", "valor_lotacao", "ad_valorem", "gris", "pedagio", "prazo_dias", "vigencia_inicio", "vigencia_fim"],
    ["Navegantes→São Bernardo", "fracionada", "Truck", "Navegantes", "SC", "São Bernardo do Campo", "SP", 0, 5000, 0.85, 350, "", 0.30, 0.20, 180, 3, "2026-01-01", "2026-12-31"],
    ["Navegantes→São Bernardo", "fracionada", "Truck", "Navegantes", "SC", "São Bernardo do Campo", "SP", 5001, 12000, 0.62, 350, "", 0.30, 0.20, 180, 3, "2026-01-01", "2026-12-31"],
    ["Navegantes→São Bernardo", "lotacao", "Carreta", "Navegantes", "SC", "São Bernardo do Campo", "SP", "", "", "", "", 9500, 0, 0, 0, 2, "2026-01-01", "2026-12-31"],
    ["Navegantes→São Bernardo", "lotacao", "Bitrem", "Navegantes", "SC", "São Bernardo do Campo", "SP", "", "", "", "", 11800, 0, 0, 0, 2, "2026-01-01", "2026-12-31"],
  ]);
  ws["!cols"] = [{ wch: 26 }, { wch: 11 }, { wch: 14 }, { wch: 18 }, { wch: 9 }, { wch: 22 }, { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 8 }, { wch: 13 }, { wch: 10 }, { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws, "Tabelas");
  const info = XLSX.utils.aoa_to_sheet([
    ["Como preencher"],
    [""],
    ["Uma linha = uma rota + tipo de caminhão. Fracionada: repita a linha para cada faixa de peso (faixa_min, faixa_max, valor_kg, minimo)."],
    ["Lotação: preencha apenas valor_lotacao (deixe as faixas vazias)."],
    ["tipo_caminhao aceita: " + TIPOS_CAMINHAO.join(", ") + ". Deixe vazio se a tabela vale para qualquer veículo."],
    ["Cidades são validadas pela base oficial do IBGE — use o nome oficial (ex.: 'São Bernardo do Campo', não 'São Bernardo')."],
    ["ad_valorem e gris em %; pedagio em R$; prazo_dias em dias; vigências no formato AAAA-MM-DD."],
    ["Linhas com a mesma tabela + rota + tipo viram UMA tabela com várias faixas."],
  ]);
  info["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(wb, info, "Instruções");
  XLSX.writeFile(wb, "modelo-tabelas-frete.xlsx");
}
