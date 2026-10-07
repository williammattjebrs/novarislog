import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildTrackingEmail } from "@/lib/tracking-email";
import type { Order } from "@/lib/mock-data";

const rowSchema = z.object({ numeroNFe: z.string().max(60), destinatario: z.string().max(300), cidadeColeta: z.string().max(150), ufColeta: z.string().max(2), cidadeEntrega: z.string().max(150), ufEntrega: z.string().max(2), previsaoEntrega: z.string().max(60).optional(), stage: z.enum(["aguarda_vinculacao", "valorizada", "coleta_agendada", "em_coleta", "coletado", "aguarda_cte", "cte_ok", "cte_divergente", "em_viagem", "entregue", "ocorrencia"]), rastreio: z.object({ situacao: z.string().max(200) }).optional() });

export const sendTrackingUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ cliente: z.string().min(1).max(300), destinatarios: z.array(z.string().trim().email().max(254)).min(1).max(30), ordens: z.array(rowSchema).min(1).max(200) }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: active } = await context.supabase.rpc("tms_active");
    if (!active) throw new Error("Usuário inativo ou sem acesso.");
    const [{ data: roles }, { data: modules }] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      context.supabase.from("user_modules").select("module").eq("user_id", context.userId),
    ]);
    if (!roles?.some((r) => ["admin", "operacao", "comercial"].includes(r.role)) && !modules?.some((m) => ["/monitoramento", "/clientes"].includes(m.module))) throw new Error("Sem permissão para enviar atualizações.");
    const mail = buildTrackingEmail(data.ordens as unknown as Order[], data.cliente);
    const { graphSendTracking } = await import("@/lib/graph-mail.server");
    await graphSendTracking(Array.from(new Set(data.destinatarios.map((r) => r.toLowerCase()))), mail.title, mail.html);
    return { accepted: true, mensagem: "Atualização aceita pela Microsoft para envio." };
  });