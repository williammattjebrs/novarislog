import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireModule(ctx: { supabase: any; userId: string }, mod: string) {
  const { data, error } = await ctx.supabase.rpc("tms_module", { module_name: mod });
  if (error || !data) throw new Error("Sem permissão para esta ação.");
  const { data: p } = await ctx.supabase.from("profiles").select("nome").eq("id", ctx.userId).maybeSingle();
  return { id: ctx.userId, nome: (p?.nome as string) || "usuário" };
}

export const emitirOC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ocId: z.string().min(1).max(120), version: z.number().int().min(1), enviarRevisao: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }) => {
    const actor = await requireModule(context, "/ordens-coleta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { emitOc } = await import("./oc.server");
    try { return await emitOc(supabaseAdmin, actor, data.ocId, data.version, data.enviarRevisao); }
    catch (e) { return { ok: false as const, erros: [e instanceof Error ? e.message : "Falha na emissão"] }; }
  });

export const linkPdfOC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ocId: z.string().max(120), version: z.number().int().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: doc, error } = await context.supabase.from("tms_oc_documents").select("pdf_path").eq("oc_id", data.ocId).eq("version", data.version).maybeSingle();
    if (error || !doc) throw new Error("Documento não encontrado ou sem permissão.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error: e2 } = await supabaseAdmin.storage.from("oc-documentos").createSignedUrl(doc.pdf_path, 300, { download: `OC-${data.ocId}-v${data.version}.pdf` });
    if (e2 || !signed) throw new Error("Falha ao gerar link do PDF.");
    return { url: signed.signedUrl };
  });

export const reenfileirarEnvios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ocId: z.string().max(120), version: z.number().int().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModule(context, "/ordens-coleta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: n, error } = await supabaseAdmin.rpc("tms_oc_email_requeue", { p_oc_id: data.ocId, p_doc_version: data.version });
    if (error) throw new Error(error.message);
    return { reenfileirados: n as number };
  });

/** Ação explícita do operador: processa agora os envios pendentes desta OC (sem recriar a OC). */
export const enviarAgoraOC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ocId: z.string().max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireModule(context, "/ordens-coleta");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { processOcOutbox, graphSender } = await import("./oc.server");
    return await processOcOutbox(supabaseAdmin, data.ocId, graphSender);
  });
