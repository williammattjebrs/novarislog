// Compartilhamento da OC com o motorista como ARQUIVO (PDF ou imagem), sem link. Somente navegador.
export async function baixarArquivoPdf(url: string, nome: string) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao obter o PDF (${r.status}).`);
  return new File([await r.blob()], `${nome}.pdf`, { type: "application/pdf" });
}

/** Converte cada página do PDF em uma imagem PNG legível no celular. */
export async function pdfParaImagens(pdf: File, nome: string) {
  const pdfjs = await import("pdfjs-dist");
  const worker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await pdf.arrayBuffer()) }).promise;
  const out: File[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const vp = page.getViewport({ scale: 2.2 });
    const canvas = document.createElement("canvas");
    canvas.width = vp.width; canvas.height = vp.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao gerar imagem."))), "image/png"));
    out.push(new File([blob], `${nome}${doc.numPages > 1 ? `-pag${i}` : ""}.png`, { type: "image/png" }));
  }
  return out;
}

export const podeCompartilharArquivos = (files: File[]) =>
  typeof navigator !== "undefined" && !!navigator.canShare && navigator.canShare({ files });

export function baixarArquivos(files: File[]) {
  for (const f of files) {
    const u = URL.createObjectURL(f);
    const a = document.createElement("a"); a.href = u; a.download = f.name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 3000);
  }
}
