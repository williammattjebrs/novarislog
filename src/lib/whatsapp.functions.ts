// Configuração da API WhatsApp Business (Meta Cloud API).
// Credenciais ficam no banco, acessadas só pelo servidor; o token nunca volta ao navegador.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data: active } = await supabase.rpc("tms_active");
  if (!active) throw new Error("Usuário inativo ou sem acesso.");
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((x) => x.role === "admin")) {
    throw new Error("Apenas administradores podem alterar a integração do WhatsApp.");
  }
}

type ConfigRow = {
  phone_number_id: string; waba_id: string; access_token: string; ativo: boolean;
  ultima_verificacao: string | null; ultimo_status: string | null;
};

async function loadConfig(): Promise<ConfigRow | null> {
  const db = await adminClient();
  const { data } = await db.from("whatsapp_config" as never).select("*").eq("id", 1).maybeSingle();
  return (data as ConfigRow | null) ?? null;
}

function publicConfig(c: ConfigRow | null) {
  return {
    phoneNumberId: c?.phone_number_id ?? "",
    wabaId: c?.waba_id ?? "",
    temToken: !!c?.access_token,
    ativo: c?.ativo ?? false,
    ultimaVerificacao: c?.ultima_verificacao ?? null,
    ultimoStatus: c?.ultimo_status ?? null,
  };
}

export const getWhatsappConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return publicConfig(await loadConfig());
  });

const ConfigInput = z.object({
  phoneNumberId: z.string().trim().max(100),
  wabaId: z.string().trim().max(100),
  accessToken: z.string().max(2000).optional(), // vazio/ausente = manter o atual
  ativo: z.boolean(),
});

export const saveWhatsappConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ConfigInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const row: Record<string, unknown> = {
      id: 1,
      phone_number_id: data.phoneNumberId,
      waba_id: data.wabaId,
      ativo: data.ativo,
      atualizado_em: new Date().toISOString(),
    };
    if (data.accessToken) row.access_token = data.accessToken;
    const { error } = await db.from("whatsapp_config" as never).upsert(row as never);
    if (error) throw new Error(error.message);
    return publicConfig(await loadConfig());
  });

async function verificarNaMeta(c: ConfigRow): Promise<{ ok: boolean; mensagem: string }> {
  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(c.phone_number_id)}?fields=display_phone_number,verified_name,quality_rating`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${c.access_token}` } });
  const body = await resp.text();
  if (!resp.ok) {
    let msg = body;
    try { msg = JSON.parse(body)?.error?.message ?? body; } catch { /* mantém texto */ }
    return { ok: false, mensagem: `Meta recusou a conexão [${resp.status}]: ${msg}` };
  }
  const info = JSON.parse(body) as { display_phone_number?: string; verified_name?: string; quality_rating?: string };
  return {
    ok: true,
    mensagem: `Conectado! Número ${info.display_phone_number ?? "?"} (${info.verified_name ?? "sem nome verificado"}) · qualidade: ${info.quality_rating ?? "?"}`,
  };
}

export const testWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const c = await loadConfig();
    if (!c?.phone_number_id || !c.access_token) {
      return { ok: false, mensagem: "Preencha o ID do número e o token de acesso e salve antes de testar." };
    }
    const r = await verificarNaMeta(c);
    const db = await adminClient();
    await db.from("whatsapp_config" as never).update({
      ultima_verificacao: new Date().toISOString(),
      ultimo_status: r.ok ? r.mensagem : `Erro: ${r.mensagem}`,
    } as never).eq("id", 1);
    return r;
  });
