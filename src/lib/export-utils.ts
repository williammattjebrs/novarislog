// Utilidades de exportação e backup: CSV (Excel), PDF (via impressão) e JSON.

import { commitLists, getList, refreshShared, SHARED_KEYS } from "./shared-db";

import { supabase } from "@/integrations/supabase/client";

function isBrowser() {
  return typeof window !== "undefined";
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvEscape).join(";"));
  // BOM para o Excel reconhecer acentos e o separador ";"
  downloadFile(filename, "\uFEFF" + lines.join("\r\n"), "text/csv;charset=utf-8");
}

function htmlEscape(s: string | number): string {
  return String(s ?? "")
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

// Gera o PDF via impressão do navegador (Salvar como PDF) — sem dependências.
export function printReport(title: string, subtitle: string, headers: string[], rows: (string | number)[][]) {
  if (!isBrowser()) return;
  const w = window.open("", "_blank", "width=1000,height=700");
  if (!w) {
    alert("Permita janelas pop-up para gerar o PDF.");
    return;
  }
  const head = headers.map((h) => `<th>${htmlEscape(h)}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${htmlEscape(c)}</td>`).join("")}</tr>`)
    .join("");
  w.document.write(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>${htmlEscape(title)}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; color: #0B1325; padding: 32px; }
  h1 { font-size: 20px; margin: 0; }
  p { color: #667085; font-size: 12px; margin: 4px 0 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #0B1325; color: #fff; padding: 8px 10px; }
  td { border-bottom: 1px solid #E4E7EC; padding: 7px 10px; }
  tr:nth-child(even) td { background: #F9FAFB; }
  @page { margin: 14mm; }
</style></head><body>
<h1>${htmlEscape(title)}</h1><p>${htmlEscape(subtitle)}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };<\/script>
</body></html>`);
  w.document.close();
}

// Backup reads persisted authorized records, never browser storage.
export type BackupPreview = { exportadoEm: string; dados: Record<string, any[]>; impact: { collection:string; incoming:number; existing:number; updates:number; additions:number }[] };
export async function backupAllData(): Promise<string> {
  const { data, error } = await supabase.rpc("tms_records_read");
  if (error) throw new Error("Não foi possível ler o backup confirmado no servidor.");
  const dados: Record<string, any[]> = {};
  for (const row of data as unknown as {collection:string; data:any}[]) (dados[row.collection] ??= []).push(row.data);
  return JSON.stringify({app:"novaris-tms",versao:2,exportadoEm:new Date().toISOString(),abrangencia:Object.keys(dados),dados},null,2);
}
export async function downloadBackup() {
  try { downloadFile(`backup-novaris-${new Date().toISOString().slice(0,10)}.json`,await backupAllData(),"application/json"); }
  catch(e) { alert(e instanceof Error ? e.message : "Falha no backup."); }
}
export function validateBackup(json:string): BackupPreview {
  const parsed = JSON.parse(json);
  if (parsed.app!=="novaris-tms" || parsed.versao!==2 || typeof parsed.dados!=="object" || !parsed.exportadoEm) throw new Error("Backup inválido. Utilize uma cópia confirmada versão 2.");
  const dados: Record<string,any[]> = {};
  for (const [key,value] of Object.entries(parsed.dados)) {
    if (!SHARED_KEYS.has(key) || !Array.isArray(value) || value.some(x => !x || typeof x!=="object" || typeof x.id!=="string" || !x.id)) throw new Error("Coleção ou registro inválido.");
    if (new Set(value.map(x=>x.id)).size!==value.length) throw new Error("Identificadores duplicados no backup.");
    if (/"(senha|password|access_token|refresh_token|secret|api_key)"\s*:/i.test(JSON.stringify(value))) throw new Error("Backup contém campos confidenciais.");
    dados[key]=value;
  }
  return {exportadoEm:parsed.exportadoEm,dados,impact:Object.entries(dados).map(([collection,items])=>{ const existing=getList<any>(collection)??[]; const updates=items.filter(x=>existing.some(e=>e.id===x.id)).length; return {collection,incoming:items.length,existing:existing.length,updates,additions:items.length-updates}; })};
}
export async function restoreBackup(preview: BackupPreview): Promise<number> {
  await refreshShared();
  const lists:Record<string,any[]> = {};
  for (const [key,items] of Object.entries(preview.dados)) { const byId=new Map((getList<any>(key)??[]).map(x=>[x.id,x])); for(const item of items) byId.set(item.id,item); lists[key]=[...byId.values()]; }
  await commitLists(lists,`Restauração confirmada, cópia de ${preview.exportadoEm}; sem exclusões`);
  return Object.keys(lists).length;
}
