// Serviços de usuários: lista, convite, alteração de perfil e exclusão.
// Apenas administradores executam estas funções (verificação server-side).

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RoleData = "admin" | "comercial" | "operacao" | "financeiro";

const ROLES = ["admin", "comercial", "operacao", "financeiro"] as const;

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Response("Forbidden", { status: 403 });
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

// Perfil do próprio usuário (usado pelo AuthProvider após o login).
export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: profile, error }, { data: roleRow }] = await Promise.all([
      context.supabase.from("profiles").select("id, nome, ativo").eq("id", context.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId).limit(1),
    ]);
    if (error) throw error;
    const email = ((context.claims ?? {}) as { email?: string }).email ?? "";
    const nome =
      profile?.nome ||
      ((context.claims ?? {}) as { nome?: string }).nome ||
      email.split("@")[0] ||
      "usuário";
    const role = (roleRow && roleRow.length > 0 ? roleRow[0].role : "operacao") as RoleData;
    return { email, nome, role };
  });

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await adminClient();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nome, ativo"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
    const roleByUser = new Map((roles ?? []).map((r) => [r.user_id, r.role as RoleData]));
    return (data.users ?? []).map((u) => {
      const p = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        nome: (p?.nome as string) || (u.user_metadata?.nome as string) || "",
        ativo: (p?.ativo as boolean) ?? true,
        role: (roleByUser.get(u.id) ?? "operacao") as RoleData,
        confirmado: !!u.email_confirmed_at,
        criadoEm: u.created_at ?? "",
      };
    });
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email: z.string().email(),
        nome: z.string().min(1),
        role: z.enum(ROLES),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await adminClient();
    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    const uid = created.user?.id;
    if (uid) {
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: uid, role: data.role },
        { onConflict: "user_id,role" },
      );
      await supabaseAdmin.from("profiles").upsert({ id: uid, nome: data.nome });
    }
    return { ok: true, id: uid ?? "" };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), role: z.enum(ROLES) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await adminClient();
    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (admins ?? []).map((r) => r.user_id);
    if (adminIds.includes(data.userId) && data.role !== "admin" && adminIds.length <= 1) {
      throw new Error("Não é possível remover o único administrador do sistema.");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("Você não pode excluir o seu próprio acesso.");
    await assertAdmin(context.supabase, context.userId);
    const supabaseAdmin = await adminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);
    return { ok: true };
  });
