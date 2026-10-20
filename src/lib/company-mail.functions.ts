// Cadastro do e-mail de envio de cada empresa (administradores). A senha nunca volta ao navegador.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data: active } = await supabase.rpc("tms_active");
  if (!active) throw new Error("Usuário inativo ou sem acesso.");
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((x) => x.role === "admin")) throw new Error("Apenas administradores podem alterar o e-mail de envio.");
}
const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;
const idSchema = z.object({ empresaId: z.string().min(1).max(100) });

export const getCompanyMail = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { loadMailCfg } = await import("./company-mail.server");
    const c = await loadMailCfg((await admin()) as never, data.empresaId);
    return { provedor: c?.provedor ?? "smtp", emailEnvio: c?.email_envio ?? "", nomeRemetente: c?.nome_remetente ?? "", host: c?.host ?? "", port: c?.port ?? 465, secure: c?.secure ?? true, usuario: c?.usuario ?? "", temSenha: !!c?.senha,
      ultimoTeste: (c as { ultimo_teste?: string } | null)?.ultimo_teste ?? null, ultimoStatus: (c as { ultimo_status?: string } | null)?.ultimo_status ?? null };
  });

const saveSchema = idSchema.extend({ provedor: z.enum(["smtp", "microsoft"]), emailEnvio: z.string().trim().email().max(254), nomeRemetente: z.string().max(120),
  host: z.string().trim().max(200), port: z.number().int().min(1).max(65535), secure: z.boolean(), usuario: z.string().trim().max(254), senha: z.string().max(500).optional(), testar: z.boolean() });

export const saveCompanyMail = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const db = await admin();
    const { loadMailCfg, smtpTest } = await import("./company-mail.server");
    const atual = await loadMailCfg(db as never, data.empresaId);
    const row = { empresa_id: data.empresaId, provedor: data.provedor, email_envio: data.emailEnvio, nome_remetente: data.nomeRemetente, host: data.host, port: data.port, secure: data.secure,
      usuario: data.usuario, senha: data.senha ? data.senha : atual?.senha ?? "", atualizado_em: new Date().toISOString() };
    let status = "Salvo sem teste.";
    let ok = true;
    if (data.testar) {
      try {
        if (data.provedor === "microsoft") {
          const { contasMicrosoft } = await import("./graph-mail.server");
          if (!(await contasMicrosoft()).some((c) => c.email === data.emailEnvio.toLowerCase())) throw new Error(`Nenhuma conta Microsoft conectada é ${data.emailEnvio}.`);
        } else { if (!row.host || !row.senha) throw new Error("Informe servidor e senha."); await smtpTest(row as never); }
        status = "Conexão testada com sucesso (login aceito).";
      } catch (e) { ok = false; status = `Falha no teste: ${e instanceof Error ? e.message : "erro"}`; }
    }
    const { error } = await db.from("tms_company_mail").upsert({ ...row, ultimo_teste: data.testar ? new Date().toISOString() : null, ultimo_status: status });
    if (error) throw new Error(error.message);
    return { ok, status };
  });
