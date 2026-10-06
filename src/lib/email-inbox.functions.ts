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
  const any = e as { authenticationFailed?: boolean; responseText?: string; code?: string };
  if (any?.authenticationFailed || /auth/i.test(msg)) return "Usuário ou senha recusados pelo servidor de e-mail.";
  if (any?.code === "ENOTFOUND" || /getaddrinfo|ENOTFOUND/i.test(msg)) return "Servidor IMAP não encontrado. Confira o endereço.";
  if (/timeout|ETIMEDOUT/i.test(msg)) return "O servidor de e-mail não respondeu (tempo esgotado). Confira servidor e porta.";
  if (/ECONNREFUSED/i.test(msg)) return "Conexão recusada. Confira a porta e a opção de conexão segura.";
  return any?.responseText || msg;
}

async function openClient(c: ConfigRow) {
  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.usuario, pass: c.senha },
    logger: false,
    socketTimeout: 30000,
  });
  await client.connect();
  return client;
}

export const testInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const c = await loadConfig();
    if (!c?.host || !c.usuario || !c.senha) return { ok: false, mensagem: "Preencha servidor, usuário e senha e salve antes de testar." };
    try {
      const client = await openClient(c);
      const box = await client.mailboxOpen(c.pasta);
      await client.logout();
      return { ok: true, mensagem: `Conectado! Pasta "${c.pasta}" com ${box.exists} mensagem(ns).` };
    } catch (e) {
      return { ok: false, mensagem: traduzImap(e) };
    }
  });

type Part = { part?: string; type?: string; disposition?: string; dispositionParameters?: Record<string, string>; parameters?: Record<string, string>; childNodes?: Part[] };

function findXmlParts(node: Part | undefined, out: { part: string; nome: string }[] = []) {
  if (!node) return out;
  const nome = node.dispositionParameters?.filename || node.parameters?.name || "";
  const isXml = /\.xml$/i.test(nome) || /xml/i.test(node.type ?? "");
  if (node.part && isXml && !node.childNodes?.length) out.push({ part: node.part, nome: nome || "anexo.xml" });
  node.childNodes?.forEach((n) => findXmlParts(n, out));
  return out;
}

function extractChave(xml: string): { chave: string; tipo: "nfe" | "cte" } | null {
  const nfe = xml.match(/Id="NFe(\d{44})"/) || xml.match(/<chNFe>(\d{44})<\/chNFe>/);
  if (nfe && /<infNFe/i.test(xml)) return { chave: nfe[1], tipo: "nfe" };
  const cte = xml.match(/Id="CTe(\d{44})"/) || xml.match(/<chCTe>(\d{44})<\/chCTe>/);
  if (cte) return { chave: cte[1], tipo: "cte" };
  if (nfe) return { chave: nfe[1], tipo: "nfe" };
  return null;
}

async function streamToString(s: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const ch of s as AsyncIterable<Buffer | string>) chunks.push(typeof ch === "string" ? Buffer.from(ch) : ch);
  return Buffer.concat(chunks).toString("utf8");
}

export const syncInbox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertColetas(context.supabase, context.userId);
    const c = await loadConfig();
    const db = await adminClient();
    if (!c?.host || !c.usuario || !c.senha) {
      return { ok: false, mensagem: "Caixa de e-mail não configurada.", novos: 0, duplicados: 0, mensagens: 0 };
    }
    let novos = 0, duplicados = 0, mensagens = 0, ignorados = 0;
    try {
      const client = await openClient(c);
      const lock = await client.getMailboxLock(c.pasta);
      try {
        const since = new Date(Date.now() - c.dias_retroativos * 86400000);
        const criterio: Record<string, unknown> = { since };
        if (c.filtro_remetente) criterio.from = c.filtro_remetente;
        const uids = ((await client.search(criterio, { uid: true })) || []) as number[];
        const { data: existentes } = await db.from("email_xml_inbox" as never).select("chave");
        const conhecidas = new Set(((existentes ?? []) as { chave: string }[]).map((x) => x.chave));

        const alvo: { uid: number; parts: { part: string; nome: string }[]; remetente: string; assunto: string; data?: Date | string }[] = [];
        if (uids.length) {
          for await (const msg of client.fetch(uids.slice(-500), { uid: true, envelope: true, bodyStructure: true }, { uid: true })) {
            mensagens++;
            const parts = findXmlParts(msg.bodyStructure as Part);
            if (!parts.length) continue;
            alvo.push({
              uid: msg.uid,
              parts,
              remetente: msg.envelope?.from?.[0]?.address ?? "",
              assunto: msg.envelope?.subject ?? "",
              data: msg.envelope?.date,
            });
          }
        }
        for (const m of alvo) {
          for (const p of m.parts) {
            const { content } = await client.download(String(m.uid), p.part, { uid: true });
            if (!content) { ignorados++; continue; }
            const xml = await streamToString(content as unknown as NodeJS.ReadableStream);
            const info = extractChave(xml);
            if (!info) { ignorados++; continue; }
            if (conhecidas.has(info.chave)) { duplicados++; continue; }
            const { error } = await db.from("email_xml_inbox" as never).insert({
              chave: info.chave, tipo: info.tipo, arquivo: p.nome, remetente: m.remetente,
              assunto: m.assunto, recebido_em: m.data ? new Date(m.data).toISOString() : null, xml,
            } as never);
            if (error) { if (/duplicate/i.test(error.message)) duplicados++; else throw new Error(error.message); }
            else { novos++; conhecidas.add(info.chave); }
          }
        }
      } finally {
        lock.release();
      }
      await client.logout();
      const mensagem = `${mensagens} e-mail(s) lido(s) · ${novos} XML novo(s) · ${duplicados} já importado(s)${ignorados ? ` · ${ignorados} XML não reconhecido(s)` : ""}`;
      await db.from("email_inbox_config" as never).update({ ultima_sync: new Date().toISOString(), ultimo_status: mensagem } as never).eq("id", 1);
      return { ok: true, mensagem, novos, duplicados, mensagens };
    } catch (e) {
      const mensagem = traduzImap(e);
      await db.from("email_inbox_config" as never).update({ ultima_sync: new Date().toISOString(), ultimo_status: `Erro: ${mensagem}` } as never).eq("id", 1);
      return { ok: false, mensagem, novos, duplicados, mensagens };
    }
  });

export const listPendingXml = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertColetas(context.supabase, context.userId);
    const db = await adminClient();
    const { data, error } = await db
      .from("email_xml_inbox" as never)
      .select("chave, tipo, xml, arquivo")
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
    const { error } = await db
      .from("email_xml_inbox" as never)
      .update({ status: "importado", importado_em: new Date().toISOString() } as never)
      .in("chave", data.chaves);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
