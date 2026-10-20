// Leitura da caixa Microsoft 365 pela API oficial (Microsoft Graph) via conexão Microsoft do projeto.
// Usado quando o servidor configurado é do Microsoft 365, que bloqueia IMAP com senha.

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

/** Chaves das contas Microsoft conectadas ao projeto (uma por empresa do grupo). */
function chavesMicrosoft() {
  return Object.keys(process.env).filter((k) => /^MICROSOFT_OUTLOOK_API_KEY(_\d+)?$/.test(k)).sort().map((k) => process.env[k]!).filter(Boolean);
}
const contaCache = new Map<string, string>();
/** Caixas de e-mail das contas Microsoft conectadas, para escolher o remetente de cada empresa. */
export async function contasMicrosoft() {
  const lovable = process.env.LOVABLE_API_KEY;
  if (!lovable) throw new Error("Conexão Microsoft não configurada.");
  const out: { email: string; key: string }[] = [];
  for (const key of chavesMicrosoft()) {
    let email = contaCache.get(key);
    if (!email) {
      try {
        const r = await fetch(`${GATEWAY}/me?$select=mail,userPrincipalName`, { headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, Accept: "application/json" } });
        if (!r.ok) { console.error(`Microsoft conta [${r.status}]: ${await r.text()}`); continue; }
        const j = (await r.json()) as { mail?: string; userPrincipalName?: string };
        email = (j.mail || j.userPrincipalName || "").toLowerCase();
        if (email) contaCache.set(key, email);
      } catch (e) { console.error("Microsoft conta:", e); continue; }
    }
    if (email) out.push({ email, key });
  }
  return out;
}
/** Conexão Microsoft cuja caixa é o remetente da empresa. Sem correspondência, o envio é bloqueado. */
async function chavePara(remetente: string) {
  const alvo = remetente.trim().toLowerCase();
  if (!alvo) throw new Error("A empresa não tem e-mail de envio cadastrado. Cadastre em Empresas do grupo.");
  const conta = (await contasMicrosoft()).find((c) => c.email === alvo);
  if (!conta) throw new Error(`Nenhuma conta Microsoft conectada corresponde ao e-mail de envio ${alvo}. Conecte essa conta para enviar por esta empresa.`);
  return conta.key;
}

export async function graphSendTracking(remetente: string, recipients: string[], subject: string, html: string) {
  const key = await chavePara(remetente);
  const lovable = process.env.LOVABLE_API_KEY!;
  const response = await fetch(`${GATEWAY}/me/sendMail`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ message: { subject, body: { contentType: "HTML", content: html }, toRecipients: recipients.map((address) => ({ emailAddress: { address } })) }, saveToSentItems: true }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Microsoft envio [${response.status}]: ${body}`);
    throw new Error(`Microsoft [${response.status}]: ${body}`);
  }
}

export class EnvioIncertoError extends Error {}
/** Envio individual com anexos. Resposta HTTP de erro = falha definitiva; erro de rede = resultado incerto. */
export async function graphSendMail(remetente: string, to: string, subject: string, html: string, attachments: { name: string; base64: string; contentType: string }[] = []) {
  const key = await chavePara(remetente);
  const lovable = process.env.LOVABLE_API_KEY!;
  let response: Response;
  try {
    response = await fetch(`${GATEWAY}/me/sendMail`, {
      method: "POST",
      headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": key, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ message: { subject, body: { contentType: "HTML", content: html }, toRecipients: [{ emailAddress: { address: to } }],
        attachments: attachments.map((a) => ({ "@odata.type": "#microsoft.graph.fileAttachment", name: a.name, contentType: a.contentType, contentBytes: a.base64 })) }, saveToSentItems: true }),
    });
  } catch (e) { throw new EnvioIncertoError(e instanceof Error ? e.message : "Sem resposta do provedor"); }
  if (!response.ok) { const body = await response.text(); console.error(`Microsoft envio [${response.status}]: ${body}`); throw new Error(`Microsoft [${response.status}]: ${body.slice(0, 200)}`); }
}

/** E-mail de envio da empresa do grupo (cadastro atual). */
export async function remetenteDaEmpresa(db: { from: (t: string) => any }, empresaId: string | null | undefined) {
  if (!empresaId) throw new Error("Defina a empresa emissora para escolher o remetente do e-mail.");
  const { data } = await db.from("app_records").select("data").eq("collection", "companies").eq("id", empresaId).maybeSingle();
  const emp = data?.data as { nome?: string; emailEnvio?: string } | undefined;
  if (!emp) throw new Error("Empresa emissora não encontrada.");
  if (!emp.emailEnvio?.trim()) throw new Error(`A empresa ${emp.nome ?? ""} não tem e-mail de envio cadastrado. Cadastre em Empresas do grupo.`);
  return emp.emailEnvio.trim();
}

export function microsoftDisponivel(host: string | null | undefined) {
  return !!process.env.MICROSOFT_OUTLOOK_API_KEY && /office365|outlook\.(com|office)/i.test(host ?? "");
}

async function g<T>(pathOrUrl: string): Promise<T> {
  const lovable = process.env.LOVABLE_API_KEY;
  const conn = process.env.MICROSOFT_OUTLOOK_API_KEY;
  if (!lovable || !conn) throw new Error("Conexão Microsoft não configurada no sistema.");
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl.replace(/^https:\/\/graph\.microsoft\.com\/v1\.0/, GATEWAY)
    : `${GATEWAY}${pathOrUrl}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Microsoft Graph [${res.status}]: ${body}`);
    throw new Error(`MSGRAPH ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

export function traduzGraph(msg: string): string | null {
  if (!msg.startsWith("MSGRAPH")) return null;
  if (/MailboxNotEnabledForRESTAPI/i.test(msg))
    return "A conta Microsoft conectada não tem caixa de e-mail ativa. Reconecte a integração Microsoft entrando com a conta que recebe os XML (ex.: xml@rtmtransportes.com.br).";
  if (/ErrorAccessDenied|Authorization_RequestDenied|403/i.test(msg))
    return "A conta Microsoft conectada não tem permissão nesta caixa. Reconecte entrando com a conta que recebe os XML.";
  if (/401|InvalidAuthenticationToken/i.test(msg)) return "A conexão Microsoft expirou. É preciso reconectar a conta.";
  if (/ErrorItemNotFound|404/i.test(msg)) return "Pasta não encontrada na caixa Microsoft. Confira o nome da pasta.";
  return `Erro da Microsoft: ${msg.replace(/^MSGRAPH /, "").slice(0, 300)}`;
}

async function folderId(pasta: string): Promise<string> {
  const p = (pasta || "INBOX").trim();
  if (/^inbox$/i.test(p) || /^caixa de entrada$/i.test(p)) return "inbox";
  const safe = p.replace(/'/g, "''");
  const r = await g<{ value: { id: string }[] }>(
    `/me/mailFolders?$filter=${encodeURIComponent(`displayName eq '${safe}'`)}&$select=id&$top=1`,
  );
  if (!r.value[0]) throw new Error(`MSGRAPH 404: ErrorItemNotFound pasta "${p}"`);
  return r.value[0].id;
}

export async function graphTest(pasta: string) {
  const id = await folderId(pasta);
  const f = await g<{ displayName: string; totalItemCount: number }>(
    `/me/mailFolders/${id}?$select=displayName,totalItemCount`,
  );
  return { nome: f.displayName, total: f.totalItemCount };
}

export type GraphXml = {
  filename: string; xml: string; remetente: string; assunto: string; recebidoEm: string | null;
};

type Msg = { id: string; subject?: string; receivedDateTime?: string; from?: { emailAddress?: { address?: string } } };
type Att = { "@odata.type"?: string; name?: string; contentType?: string; contentBytes?: string };

function b64ToText(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

export async function graphFetchXml(pasta: string, since: Date, filtroRemetente: string, max = 500) {
  const id = await folderId(pasta);
  const filtros = filtroRemetente.split(/[,;\s]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const filter = `receivedDateTime ge ${since.toISOString()} and hasAttachments eq true`;
  let next: string | undefined =
    `/me/mailFolders/${id}/messages?$filter=${encodeURIComponent(filter)}&$select=id,subject,from,receivedDateTime&$orderby=receivedDateTime desc&$top=50`;
  const msgs: Msg[] = [];
  while (next && msgs.length < max) {
    const page: { value: Msg[]; "@odata.nextLink"?: string } = await g(next);
    msgs.push(...page.value);
    next = page["@odata.nextLink"];
  }
  const alvo = msgs.slice(0, max).filter((m) => {
    if (!filtros.length) return true;
    const from = (m.from?.emailAddress?.address ?? "").toLowerCase();
    return filtros.some((f) => from.includes(f));
  });
  const out: GraphXml[] = [];
  for (const m of alvo) {
    const atts = await g<{ value: Att[] }>(`/me/messages/${m.id}/attachments`);
    for (const a of atts.value) {
      if (a["@odata.type"] !== "#microsoft.graph.fileAttachment" || !a.contentBytes) continue;
      if (!/\.xml$/i.test(a.name ?? "") && !/xml/i.test(a.contentType ?? "")) continue;
      out.push({
        filename: a.name || "anexo.xml",
        xml: b64ToText(a.contentBytes),
        remetente: m.from?.emailAddress?.address ?? "",
        assunto: m.subject ?? "",
        recebidoEm: m.receivedDateTime ?? null,
      });
    }
  }
  return { mensagens: alvo.length, xmls: out };
}
