// Utilidades de exportação e backup: CSV (Excel), PDF (via impressão) e JSON.

const PREFIX = "novaris:";

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

// ===== Backup de todos os dados =====
export function backupAllData(): string {
  const dados: Record<string, string> = {};
  if (isBrowser()) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) dados[k] = localStorage.getItem(k) ?? "";
    }
  }
  return JSON.stringify(
    { app: "novaris-tms", versao: 1, exportadoEm: new Date().toISOString(), dados },
    null,
    2,
  );
}

export function downloadBackup() {
  const d = new Date().toISOString().slice(0, 10);
  downloadFile(`backup-novaris-${d}.json`, backupAllData(), "application/json");
}

export function restoreBackup(json: string): number {
  const parsed = JSON.parse(json) as { dados?: Record<string, string> };
  const dados = parsed.dados ?? {};
  let n = 0;
  if (isBrowser()) {
    const chavesBackup = new Set(Object.keys(dados));
    // remove chaves locais que não existem no backup (restauração fiel)
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && !chavesBackup.has(k)) {
        localStorage.removeItem(k);
        i--; // índices shiftam após removeItem
      }
    }
    for (const [k, v] of Object.entries(dados)) {
      if (k.startsWith(PREFIX)) {
        localStorage.setItem(k, v);
        n++;
      }
    }
  }
  return n;
}
