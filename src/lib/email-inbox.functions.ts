// Captação de XML (NF-e / CT-e) por e-mail via IMAP.
// Configuração e XMLs ficam no banco, acessados só pelo servidor.
// Deduplicação: a chave de acesso do XML é única — o mesmo documento nunca entra duas vezes.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function getRoleInfo(supabase: SupabaseClient, userId: string) {
  const { data: active } = await supabase.rpc("tms_active");
  if (!active) throw new Error("Usuário inativo ou sem acesso.");
  const [{ data: roles }, { data: mods }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId),
    supabase.from("user_modules").select("module").eq("user_id", userId),
  ]);
  const r = (roles ?? []).map((x) => x.role as string);
  const m = (mods ?? []).map((x) => x.module as string);
  return { isAdmin: r.includes("admin"), roles: r, modules: m };
}

async function assertAdmin(supabase: SupabaseClient, userId: string) {
  const info = await getRoleInfo(supabase, userId);
  if (!info.isAdmin) throw new Error("Apenas administradores podem alterar a caixa de e-mail.");
}

async function assertColetas(supabase: SupabaseClient, userId: string) {
  const info = await getRoleInfo(supabase, userId);
  if (info.isAdmin || info.roles.includes("operacao") || info.modules.includes("/coletas")) return;
  throw new Error("Sem permissão para o módulo de coletas.");
}

type ConfigRow = {
  host: string; port: number; secure: boolean; usuario: string; senha: string; pasta: string;
  dias_retroativos: number; filtro_remetente: string; ativo: boolean; intervalo_min: number;
  ultima_sync: string | null; ultimo_status: string | null;
};

async function loadConfig(): Promise<ConfigRow | null> {
  const db = await adminClient();
  const { data } = await db.from("email_inbox_config" as never).select("*").eq("id", 1).maybeSingle();
  return (data as ConfigRow | null) ?? null;
}

function publicConfig(c: ConfigRow | null) {
  return {
    microsoftConectado: !!process.env.MICROSOFT_OUTLOOK_API_KEY,
    host: c?.host ?? "",
    port: c?.port ?? 993,
    secure: c?.secure ?? true,
    usuario: c?.usuario ?? "",
    temSenha: !!c?.senha,
    pasta: c?.pasta ?? "INBOX",
    diasRetroativos: c?.dias_retroativos ?? 7,
    filtroRemetente: c?.filtro_remetente ?? "",
    ativo: c?.ativo ?? false,
    intervaloMin: c?.intervalo_min ?? 15,
    ultimaSync: c?.ultima_sync ?? null,
    ultimoStatus: c?.ultimo_status ?? null,
  };
}

export type InboxConfigPublic = ReturnType<typeof publicConfig>;

export const getInboxConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertColetas(context.supabase, context.userId);
    return publicConfig(await loadConfig());
  });

const ConfigInput = z.object({
  host: z.string().trim().max(255),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  usuario: z.string().trim().max(255),
  senha: z.string().max(500).optional(), // vazio/ausente = manter a atual
  pasta: z.string().trim().min(1).max(255),
  diasRetroativos: z.number().int().min(1).max(365),
  filtroRemetente: z.string().trim().max(500),
  ativo: z.boolean(),
  intervaloMin: z.number().int().min(5).max(1440),
});

export const saveInboxConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => ConfigInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await adminClient();
    const row: Record<string, unknown> = {
      id: 1,
      host: data.host,
      port: data.port,
      secure: data.secure,
      usuario: data.usuario,
      pasta: data.pasta,
      dias_retroativos: data.diasRetroativos,
      filtro_remetente: data.filtroRemetente,
      ativo: data.ativo,
      intervalo_min: data.intervaloMin,
      atualizado_em: new Date().toISOString(),
    };
    if (data.senha) row.senha = data.senha;
    const { error } = await db.from("email_inbox_config" as never).upsert(row as never);
    if (error) throw new Error(error.message);
    return publicConfig(await loadConfig());
  });

function traduzImap(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/auth|login failed|invalid credentials/i.test(msg)) {
    return "Usuário ou senha recusados pelo servidor de e-mail. No Microsoft 365, o TI precisa liberar o acesso IMAP com senha nesta caixa.";
  }
  if (/ENOTFOUND|getaddrinfo|resolve|DNS/i.test(msg)) return "Servidor IMAP não encontrado. Confira o endereço.";
  if (/timeout|ETIMEDOUT/i.test(msg)) return "O servidor de e-mail não respondeu (tempo esgotado). Confira servidor e porta.";
  if (/ECONNREFUSED|refused/i.test(msg)) return "Conexão recusada. Confira a porta e a opção de conexão segura.";
  return msg;
}

async function openClient(c: ConfigRow) {
  const { ImapLite } = await import("./imap-lite.server");
  const client = await ImapLite.open(c.host, c.port, c.secure);
  try {
    await client.login(c.usuario, c.senha);
  } catch (e) {
    await client.logout();
    throw e;
  }
  return client;
}

async function usaMicrosoft(c: ConfigRow | null) {
  const { microsoftDisponivel } = await import("./graph-mail.server");
  return !!c && microsoftDisponivel(c.host);
}

async function traduz(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  const { traduzGraph } = await import("./graph-mail.server");
  return traduzGraph(msg) ?? traduzImap(e);
}

export const testInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const c = await loadConfig();
    if (c && (await usaMicrosoft(c))) {
      try {
        const { graphTest } = await import("./graph-mail.server");
        const r = await graphTest(c.pasta);
        return { ok: true, mensagem: `Conectado pela conta Microsoft! Pasta "${r.nome}" com ${r.total} mensagem(ns).` };
      } catch (e) {
        return { ok: false, mensagem: await traduz(e) };
      }
    }
    if (!c?.host || !c.usuario || !c.senha) return { ok: false, mensagem: "Preencha servidor, usuário e senha e salve antes de testar." };
    try {
      const client = await openClient(c);
      const total = await client.select(c.pasta);
      await client.logout();
      return { ok: true, mensagem: `Conectado! Pasta "${c.pasta}" com ${total} mensagem(ns).` };
    } catch (e) {
      return { ok: false, mensagem: await traduz(e) };
    }
  });

function extractChave(xml: string): { chave: string; tipo: "nfe" | "cte" } | null {
  const nfe = xml.match(/Id="NFe(\d{44})"/) || xml.match(/<chNFe>(\d{44})<\/chNFe>/);
  if (nfe && /<infNFe/i.test(xml)) return { chave: nfe[1], tipo: "nfe" };
  const cte = xml.match(/Id="CTe(\d{44})"/) || xml.match(/<chCTe>(\d{44})<\/chCTe>/);
  if (cte) return { chave: cte[1], tipo: "cte" };
  if (nfe) return { chave: nfe[1], tipo: "nfe" };
  return null;
}

type Anexo = { filename: string; xml: string; remetente: string; assunto: string; recebidoEm: string | null };

async function coletarImap(c: ConfigRow, since: Date) {
  const { default: PostalMime } = await import("postal-mime");
  const client = await openClient(c);
  const anexos: Anexo[] = [];
  let mensagens = 0;
  try {
    await client.select(c.pasta);
    const uids = (await client.searchSince(since, c.filtro_remetente || undefined)).slice(-500);
    mensagens = uids.length;
    const alvo = await client.uidsWithXml(uids);
    for (const uid of alvo) {
      const raw = await client.fetchRaw(uid);
      if (!raw) continue;
      const email = await PostalMime.parse(raw);
      for (const a of email.attachments ?? []) {
        if (!/\.xml$/i.test(a.filename ?? "") && !/xml/i.test(a.mimeType ?? "")) continue;
        anexos.push({
          filename: a.filename || "anexo.xml",
          xml: typeof a.content === "string" ? a.content : new TextDecoder("utf-8").decode(a.content),
          remetente: email.from?.address ?? "",
          assunto: email.subject ?? "",
          recebidoEm: email.date ? new Date(email.date).toISOString() : null,
        });
      }
    }
  } finally {
    await client.logout();
  }
  return { mensagens, anexos };
}

export const syncInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertColetas(context.supabase, context.userId);
    return performInboxSync();
  });

// Internal worker helper; imported only inside a verified server boundary.
export async function performInboxSync() {
    const c = await loadConfig();
    const db = await adminClient();
    const microsoft = await usaMicrosoft(c);
    if (!c || (!microsoft && (!c.host || !c.usuario || !c.senha))) {
      return { ok: false, mensagem: "Caixa de e-mail não configurada.", novos: 0, duplicados: 0, mensagens: 0 };
    }
    let novos = 0, duplicados = 0, mensagens = 0, ignorados = 0;
    try {
      const since = new Date(Date.now() - c.dias_retroativos * 86400000);
      let anexos: Anexo[];
      if (microsoft) {
        const { graphFetchXml } = await import("./graph-mail.server");
        const r = await graphFetchXml(c.pasta, since, c.filtro_remetente || "");
        mensagens = r.mensagens;
        anexos = r.xmls;
      } else {
        const r = await coletarImap(c, since);
        mensagens = r.mensagens;
        anexos = r.anexos;
      }
      const { data: existentes } = await db.from("email_xml_inbox" as never).select("chave");
      const conhecidas = new Set(((existentes ?? []) as { chave: string }[]).map((x) => x.chave));
      for (const a of anexos) {
        const info = extractChave(a.xml);
        if (!info) { ignorados++; continue; }
        if (conhecidas.has(info.chave)) { duplicados++; continue; }
        const { error } = await db.from("email_xml_inbox" as never).insert({
          chave: info.chave, tipo: info.tipo, arquivo: a.filename,
          remetente: a.remetente, assunto: a.assunto, recebido_em: a.recebidoEm, xml: a.xml,
        } as never);
        if (error) { if (/duplicate/i.test(error.message)) duplicados++; else throw new Error(error.message); }
        else { novos++; conhecidas.add(info.chave); }
      }
      const mensagem = `${mensagens} e-mail(s) lido(s) · ${novos} XML novo(s) · ${duplicados} já importado(s)${ignorados ? ` · ${ignorados} XML não reconhecido(s)` : ""}`;
      await db.from("email_inbox_config" as never).update({ ultima_sync: new Date().toISOString(), ultimo_status: mensagem } as never).eq("id", 1);
      return { ok: true, mensagem, novos, duplicados, mensagens };
    } catch (e) {
      const mensagem = await traduz(e);
      await db.from("email_inbox_config" as never).update({ ultima_sync: new Date().toISOString(), ultimo_status: `Erro: ${mensagem}` } as never).eq("id", 1);
      return { ok: false, mensagem, novos, duplicados, mensagens };
    }
}

export const listPendingXml = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertColetas(context.supabase, context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("email_xml_inbox" as never)
      .select("chave, tipo, xml, arquivo, motivo_pendencia")
      .eq("status", "novo")
      .order("recebido_em", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []) as { chave: string; tipo: "nfe" | "cte"; xml: string; arquivo: string }[];
  });

export const markXmlImported = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ chaves: z.array(z.string().regex(/^\d{44}$/)).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertColetas(context.supabase, context.userId);
    if (!data.chaves.length) return { ok: true };
    const db = await adminClient();
    for (const chave of data.chaves) {
      const [{data:nfs},{data:ctes}] = await Promise.all([
        db.from('app_records').select('id').eq('collection','orders').eq('data->>chaveNFe',chave).limit(1),
        db.from('app_records').select('id').eq('collection','cteDocuments').eq('data->>chave',chave).limit(1),
      ]);
      if (!nfs?.length && !ctes?.length) throw new Error('XML ainda não possui gravação operacional confirmada.');
    }
    const { error } = await db
      .from("email_xml_inbox" as never)
      .update({ status: "importado", importado_em: new Date().toISOString() } as never)
      .in("chave", data.chaves);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
