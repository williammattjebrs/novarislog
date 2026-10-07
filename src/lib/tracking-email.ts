import { stageLabel, type Order } from "@/lib/mock-data";

export const TRACKING_COLUMNS = ["NF", "Cliente destino", "Cidade Origem", "Cidade Destino", "Data e hora prevista para a entrega", "Status atual"];

// Repair legacy UTF-8 text incorrectly interpreted as Windows-1252, without changing valid accents.
export function trackingText(value: string): string {
  let result = value;
  const extended = "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ";
  for (let attempt = 0; attempt < 2 && /Ã|Â|â[€\u0080-\u00bf]/.test(result); attempt++) {
    try {
      const bytes = Array.from(result, (char) => {
        const code = char.charCodeAt(0);
        const index = extended.indexOf(char);
        if (index >= 0) return index + 128;
        if (code <= 255) return code;
        throw new Error("Not legacy encoding");
      });
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes));
      if (decoded === result) break;
      result = decoded;
    } catch { break; }
  }
  return result.replace(/^\(sem cliente\)\s*/i, "").trim();
}

export function trackingForecast(value?: string): string {
  if (!value) return "A confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "A confirmar";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)} · horário a confirmar`;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function trackingRow(order: Order): string[] {
  return [order.numeroNFe, trackingText(order.destinatario || "Não informado"), trackingText(`${order.cidadeColeta}/${order.ufColeta}`), trackingText(`${order.cidadeEntrega}/${order.ufEntrega}`), trackingForecast(order.previsaoEntrega), trackingText(order.rastreio?.situacao || stageLabel(order.stage))];
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
const base64 = (text: string) => btoa(Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join(""));

export function buildTrackingEmail(orders: Order[], client: string, subject?: string, introduction?: string) {
  const title = trackingText(subject || `Atualização das suas entregas - ${orders.length} nota(s)`);
  const intro = trackingText(introduction || `Olá ${trackingText(client)},\n\nSegue a posição atualizada das suas entregas:`);
  const rows = orders.map(trackingRow);
  const cell = "border:1px solid currentColor;padding:10px;text-align:left;vertical-align:top;font-size:13px;";
  const table = `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;"><thead><tr>${TRACKING_COLUMNS.map((label) => `<th scope="col" style="${cell}">${escapeHtml(label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((text) => `<td style="${cell}">${escapeHtml(text)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  const html = `<div lang="pt-BR" style="font-family:Arial,sans-serif;line-height:1.5;"><p>${escapeHtml(intro).replace(/\r?\n/g, "<br>")}</p>${table}<p>Previsões no horário de Brasília. Horários não informados ficam a confirmar.</p><p>Atenciosamente,<br><strong>Novaris · Operador Logístico Integrado</strong></p></div>`;
  const text = `${intro}\n\n${TRACKING_COLUMNS.join(" | ")}\n${rows.map((row) => row.join(" | ")).join("\n")}\n\nPrevisões no horário de Brasília.\n\nAtenciosamente,\nNovaris · Operador Logístico Integrado`;
  return { title, intro, rows, html, text };
}

export function downloadTrackingEmail(email: ReturnType<typeof buildTrackingEmail>, recipient: string) {
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(recipient) || /[\r\n]/.test(recipient)) throw new Error("Informe um e-mail válido.");
  const boundary = `novaris_${crypto.randomUUID()}`;
  const wrap = (text: string) => base64(text).match(/.{1,76}/g)?.join("\r\n") ?? "";
  const eml = [`To: ${recipient}`, `Subject: =?UTF-8?B?${base64(email.title)}?=`, "X-Unsent: 1", "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${boundary}"`, "", `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", wrap(email.text), `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", wrap(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head><body>${email.html}</body></html>`), `--${boundary}--`, ""].join("\r\n");
  const url = URL.createObjectURL(new Blob([eml], { type: "message/rfc822" }));
  const link = document.createElement("a");
  link.href = url; link.download = "novaris-atualizacao-rastreio.eml"; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyTrackingEmail(email: ReturnType<typeof buildTrackingEmail>) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Este navegador não permite copiar tabelas. Baixe o e-mail para preservar a formatação.");
  await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([email.html], { type: "text/html" }), "text/plain": new Blob([email.text], { type: "text/plain" }) })]);
}