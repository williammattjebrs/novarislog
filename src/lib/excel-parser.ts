// Parser de tabelas de frete a partir de arquivos Excel/CSV.
// Formato esperado:
//   faixa_min | faixa_max | valor_kg | minimo
// (linhas adicionais opcionais)
// Aceita variações de nome de coluna (case-insensitive).

import * as XLSX from "xlsx";
import type { FreightRow } from "./mock-data";

export interface ExcelParseResult {
  rows: FreightRow[];
  raw: Record<string, unknown>[];
}

const COL_MAP: Record<string, string[]> = {
  faixaMin: ["faixa_min", "de", "peso_min", "min", "faixamin"],
  faixaMax: ["faixa_max", "ate", "até", "peso_max", "max", "faixamax"],
  valorKg: ["valor_kg", "r$/kg", "rs/kg", "valorkg", "preco_kg", "preço_kg"],
  minimo: ["minimo", "mínimo", "min_frete", "frete_min", "piso"],
};

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of Object.keys(row)) {
    if (keys.includes(k.trim().toLowerCase())) return row[k];
  }
  return undefined;
}

export async function parseFreightExcel(file: File): Promise<ExcelParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  const sheet = wb.Sheets[first];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: FreightRow[] = raw
    .map((r) => {
      const faixaMin = Number(pick(r, COL_MAP.faixaMin) ?? 0);
      const faixaMax = Number(pick(r, COL_MAP.faixaMax) ?? 0);
      const valorKg = Number(pick(r, COL_MAP.valorKg) ?? 0);
      const minimo = Number(pick(r, COL_MAP.minimo) ?? 0);
      return { faixaMin, faixaMax, valorKg, minimo };
    })
    .filter((r) => r.faixaMax > 0 || r.valorKg > 0);

  return { rows, raw };
}
