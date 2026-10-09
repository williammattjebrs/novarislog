// Lê a foto de um comprovante de entrega com IA e devolve números de NF / chaves encontrados.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["numerosNf", "chaves", "confianca"],
  properties: {
    numerosNf: { type: "array", items: { type: "string" }, description: "Números de NF-e visíveis, só dígitos, sem zeros à esquerda" },
    chaves: { type: "array", items: { type: "string" }, description: "Chaves de acesso de 44 dígitos, só dígitos" },
    confianca: { type: "string", enum: ["alta", "media", "baixa"] },
  },
};

export const lerComprovanteFoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z.string().min(100).max(7_500_000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ok } = await context.supabase.rpc("tms_module", { module_name: "/monitoramento" });
    if (!ok) throw new Error("Sem permissão para ler comprovantes.");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Leitura por IA não configurada.");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "comprovante", strict: true, schema: SCHEMA } },
        input: [{ role: "user", content: [
          { type: "input_text", text: "Foto de comprovante de entrega (canhoto de NF-e/DANFE) de transportadora brasileira. Extraia o número da NF-e (campo 'Nº' / 'NF-e Nº', ignore série) e a chave de acesso de 44 dígitos se legível. Não invente: se não for legível, retorne listas vazias e confiança baixa." },
          { type: "input_image", image_url: `data:${data.mime};base64,${data.base64}` },
        ] }],
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error(`AI gateway [${res.status}]: ${body}`);
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
      if (res.status === 429) throw new Error("Muitas leituras ao mesmo tempo. Aguarde alguns segundos e tente de novo.");
      throw new Error(`Falha na leitura da foto (${res.status}).`);
    }
    // Consome o stream SSE e junta o texto final.
    const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "", out = "";
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        try { const ev = JSON.parse(line.slice(5)); if (ev.type === "response.output_text.delta") out += ev.delta; if (ev.type === "error" || ev.type === "response.failed") throw new Error("Leitura recusada."); }
        catch (e) { if (e instanceof Error && e.message === "Leitura recusada.") throw e; }
      }
    }
    try {
      const r = JSON.parse(out) as { numerosNf: string[]; chaves: string[]; confianca: string };
      const dig = (s: string) => s.replace(/\D/g, "");
      return { numerosNf: [...new Set(r.numerosNf.map((n) => dig(n).replace(/^0+/, "")).filter(Boolean))], chaves: [...new Set(r.chaves.map(dig).filter((c) => c.length === 44))], confianca: r.confianca };
    } catch { return { numerosNf: [], chaves: [], confianca: "baixa" }; }
  });
