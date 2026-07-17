// Parser de NF-e e CT-e a partir do XML. Client-side, sem backend.

export interface ParsedNFe {
  chave: string;
  numero: string;
  emitente: { cnpj: string; nome: string; cidade: string; uf: string };
  destinatario: { cnpj: string; nome: string; cidade: string; uf: string };
  valorTotal: number;
  pesoBruto: number;
  volumes: number;
}

export interface ParsedCTe {
  chave: string;
  numero: string;
  chaveNFeReferenciada?: string;
  valorTotal: number;
  emitente: { cnpj: string; nome: string };
  tomador?: { cnpj: string; nome: string };
}

function text(el: Element | null | undefined, tag: string): string {
  if (!el) return "";
  const n = el.getElementsByTagName(tag)[0];
  return n?.textContent?.trim() ?? "";
}
function num(el: Element | null | undefined, tag: string): number {
  return parseFloat(text(el, tag) || "0") || 0;
}

export function parseNFe(xml: string): ParsedNFe | null {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length) return null;

    const infNFe = doc.getElementsByTagName("infNFe")[0];
    if (!infNFe) return null;

    const chave = (infNFe.getAttribute("Id") ?? "").replace(/^NFe/, "");

    const ide = infNFe.getElementsByTagName("ide")[0];
    const emit = infNFe.getElementsByTagName("emit")[0];
    const dest = infNFe.getElementsByTagName("dest")[0];
    const total = infNFe.getElementsByTagName("total")[0];
    const transp = infNFe.getElementsByTagName("transp")[0];

    const enderEmit = emit?.getElementsByTagName("enderEmit")[0];
    const enderDest = dest?.getElementsByTagName("enderDest")[0];
    const icmsTot = total?.getElementsByTagName("ICMSTot")[0];
    const vol = transp?.getElementsByTagName("vol")[0];

    return {
      chave,
      numero: text(ide, "nNF"),
      emitente: {
        cnpj: text(emit, "CNPJ") || text(emit, "CPF"),
        nome: text(emit, "xNome"),
        cidade: text(enderEmit, "xMun"),
        uf: text(enderEmit, "UF"),
      },
      destinatario: {
        cnpj: text(dest, "CNPJ") || text(dest, "CPF"),
        nome: text(dest, "xNome"),
        cidade: text(enderDest, "xMun"),
        uf: text(enderDest, "UF"),
      },
      valorTotal: num(icmsTot, "vNF"),
      pesoBruto: num(vol, "pesoB"),
      volumes: num(vol, "qVol"),
    };
  } catch (e) {
    console.error("parseNFe", e);
    return null;
  }
}

export function parseCTe(xml: string): ParsedCTe | null {
  try {
    const doc = new DOMParser().parseFromString(xml, "text/xml");
    if (doc.getElementsByTagName("parsererror").length) return null;

    const infCte = doc.getElementsByTagName("infCte")[0];
    if (!infCte) return null;

    const chave = (infCte.getAttribute("Id") ?? "").replace(/^CTe/, "");
    const ide = infCte.getElementsByTagName("ide")[0];
    const emit = infCte.getElementsByTagName("emit")[0];
    const vPrest = infCte.getElementsByTagName("vPrest")[0];
    // referência à NF-e
    const infNF = infCte.getElementsByTagName("infNFe")[0];

    return {
      chave,
      numero: text(ide, "nCT"),
      chaveNFeReferenciada: infNF ? text(infNF, "chave") : undefined,
      valorTotal: num(vPrest, "vTPrest"),
      emitente: {
        cnpj: text(emit, "CNPJ"),
        nome: text(emit, "xNome"),
      },
    };
  } catch (e) {
    console.error("parseCTe", e);
    return null;
  }
}

// Lê um File como texto
export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file);
  });
}
