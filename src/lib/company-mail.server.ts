// Envio de e-mail em nome de cada empresa do grupo: Microsoft 365 (conexão) ou servidor SMTP próprio (ex.: HostGator).
// Credenciais SMTP ficam em tabela acessível só pelo servidor; a senha nunca volta ao navegador.
import { connectRaw } from "./imap-lite.server";

type Db = { from: (t: string) => any };
export type MailCfg = { empresa_id: string; provedor: string; email_envio: string; nome_remetente: string; host: string; port: number; secure: boolean; usuario: string; senha: string };

export async function loadMailCfg(db: Db, empresaId: string): Promise<MailCfg | null> {
  const { data } = await db.from("tms_company_mail").select("*").eq("empresa_id", empresaId).maybeSingle();
  return (data as MailCfg | null) ?? null;
}

const b64 = (s: string) => { const b = new TextEncoder().encode(s); let bin = ""; for (const x of b) bin += String.fromCharCode(x); return btoa(bin); };
const hdr = (s: string) => `=?UTF-8?B?${b64(s)}?=`;

async function smtpSession(cfg: MailCfg, fn?: (cmd: (line: string, ok: number[]) => Promise<string>) => Promise<void>) {
  const conn = await connectRaw(cfg.host, cfg.port, cfg.secure);
  const dec = new TextDecoder(); let buf = "";
  const resposta = async () => {
    for (;;) {
      const linhas = buf.split("\r\n");
      for (let i = 0; i < linhas.length - 1; i++) if (/^\d{3} /.test(linhas[i])) { const r = linhas.slice(0, i + 1).join("\n"); buf = linhas.slice(i + 1).join("\r\n"); return r; }
      const c = await conn.read(); if (!c) throw new Error("O servidor SMTP encerrou a conexão.");
      buf += dec.decode(c);
    }
  };
  const esperar = async (ok: number[]) => { const r = await resposta(); const ultima = r.split("\n").pop()!; if (!ok.includes(Number(ultima.slice(0, 3)))) throw new Error(`SMTP: ${ultima}`); return r; };
  const cmd = async (line: string, ok: number[]) => { await conn.write(line + "\r\n"); return esperar(ok); };
  try {
    await esperar([220]);
    await cmd(`EHLO novaris`, [250]);
    await cmd("AUTH LOGIN", [334]); await cmd(b64(cfg.usuario || cfg.email_envio), [334]);
    try { await cmd(b64(cfg.senha), [235]); } catch { throw new Error("Usuário ou senha do e-mail recusados pelo servidor."); }
    if (fn) await fn(cmd);
    await cmd("QUIT", [221]).catch(() => undefined);
  } finally { await conn.close(); }
}

export async function smtpTest(cfg: MailCfg) { await smtpSession(cfg); }

export async function smtpSend(cfg: MailCfg, to: string[], subject: string, html: string) {
  const from = cfg.email_envio.trim();
  await smtpSession(cfg, async (cmd) => {
    await cmd(`MAIL FROM:<${from}>`, [250]);
    for (const t of to) await cmd(`RCPT TO:<${t}>`, [250, 251]);
    await cmd("DATA", [354]);
    const corpo = b64(html).replace(/.{76}/g, "$&\r\n");
    const msg = [`From: ${cfg.nome_remetente ? `${hdr(cfg.nome_remetente)} ` : ""}<${from}>`, `To: ${to.join(", ")}`, `Subject: ${hdr(subject)}`, `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${from.split("@")[1] ?? "novaris"}>`, "MIME-Version: 1.0", "Content-Type: text/html; charset=UTF-8", "Content-Transfer-Encoding: base64", "", corpo, "."].join("\r\n");
    await cmd(msg, [250]);
  });
}

/** Envia pela caixa cadastrada da empresa. Sem cadastro, o envio é bloqueado. */
export async function sendAsEmpresa(db: Db, empresaId: string | null | undefined, to: string[], subject: string, html: string) {
  if (!empresaId) throw new Error("Defina a empresa emissora para escolher o remetente do e-mail.");
  const cfg = await loadMailCfg(db, empresaId);
  if (!cfg?.email_envio?.trim()) throw new Error("A empresa não tem e-mail de envio cadastrado. Cadastre em Empresas do grupo.");
  if (cfg.provedor === "microsoft") {
    const { graphSendTracking } = await import("./graph-mail.server");
    return graphSendTracking(cfg.email_envio, to, subject, html);
  }
  if (!cfg.host || !cfg.senha) throw new Error("Servidor ou senha de envio da empresa não cadastrados.");
  return smtpSend(cfg, to, subject, html);
}
