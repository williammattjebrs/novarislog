// Cliente IMAP mínimo, compatível com o servidor publicado (sockets nativos)
// e com o ambiente de desenvolvimento (Node tls/net).

type Conn = { write(s: string): Promise<void>; read(): Promise<Uint8Array | null>; close(): Promise<void> };

const enc = new TextEncoder();
const dec = new TextDecoder("utf-8");

function withTimeout<T>(p: Promise<T>, ms = 30000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

async function connectRaw(host: string, port: number, secure: boolean): Promise<Conn> {
  try {
    const modName = "cloudflare:sockets";
    const { connect } = await import(/* @vite-ignore */ modName);
    const sock = connect({ hostname: host, port }, { secureTransport: secure ? "on" : "off", allowHalfOpen: false });
    await withTimeout(sock.opened as Promise<unknown>);
    const reader = sock.readable.getReader();
    const writer = sock.writable.getWriter();
    return {
      write: (s) => writer.write(enc.encode(s)),
      read: async () => { const r = await reader.read(); return r.done ? null : (r.value as Uint8Array); },
      close: async () => { try { await sock.close(); } catch { /* ignore */ } },
    };
  } catch (e) {
    if (e instanceof Error && e.message === "timeout") throw e;
    return connectNode(host, port, secure);
  }
}

async function connectNode(host: string, port: number, secure: boolean): Promise<Conn> {
  const tlsName = "node:tls";
  const netName = "node:net";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod: any = await import(/* @vite-ignore */ secure ? tlsName : netName);
  const chunks: Uint8Array[] = [];
  let waiter: ((v: Uint8Array | null) => void) | null = null;
  let ended = false;
  let failure: Error | null = null;
  const sock = mod.connect({ host, port, servername: host });
  await withTimeout(new Promise<void>((res, rej) => {
    sock.once(secure ? "secureConnect" : "connect", () => res());
    sock.once("error", rej);
  }));
  sock.on("data", (d: Uint8Array) => { if (waiter) { const w = waiter; waiter = null; w(new Uint8Array(d)); } else chunks.push(new Uint8Array(d)); });
  sock.on("end", () => { ended = true; if (waiter) { const w = waiter; waiter = null; w(null); } });
  sock.on("error", (e: Error) => { failure = e; ended = true; if (waiter) { const w = waiter; waiter = null; w(null); } });
  return {
    write: (s) => new Promise((res) => sock.write(s, () => res())),
    read: () => {
      if (chunks.length) return Promise.resolve(chunks.shift()!);
      if (failure) return Promise.reject(failure);
      if (ended) return Promise.resolve(null);
      return new Promise((res) => { waiter = res; });
    },
    close: async () => { try { sock.end(); } catch { /* ignore */ } },
  };
}

export class ImapError extends Error {}

export type ImapLine = { text: string; literals: Uint8Array[] };

export class ImapLite {
  private buf = new Uint8Array(0);
  private n = 0;
  private constructor(private conn: Conn) {}

  static async open(host: string, port: number, secure: boolean) {
    const c = new ImapLite(await connectRaw(host, port, secure));
    const greet = await c.readLine();
    if (!/^\* (OK|PREAUTH)/i.test(greet)) throw new ImapError(greet);
    return c;
  }

  private async fill() {
    const chunk = await withTimeout(this.conn.read());
    if (!chunk) throw new ImapError("Conexão encerrada pelo servidor de e-mail.");
    const nb = new Uint8Array(this.buf.length + chunk.length);
    nb.set(this.buf); nb.set(chunk, this.buf.length);
    this.buf = nb;
  }

  private async readLine(): Promise<string> {
    for (;;) {
      for (let i = 0; i < this.buf.length - 1; i++) {
        if (this.buf[i] === 13 && this.buf[i + 1] === 10) {
          const line = dec.decode(this.buf.subarray(0, i));
          this.buf = this.buf.slice(i + 2);
          return line;
        }
      }
      await this.fill();
    }
  }

  private async readBytes(len: number): Promise<Uint8Array> {
    while (this.buf.length < len) await this.fill();
    const out = this.buf.slice(0, len);
    this.buf = this.buf.slice(len);
    return out;
  }

  async cmd(c: string): Promise<ImapLine[]> {
    const tag = `A${++this.n}`;
    await this.conn.write(`${tag} ${c}\r\n`);
    const out: ImapLine[] = [];
    for (;;) {
      let text = await this.readLine();
      const literals: Uint8Array[] = [];
      let m: RegExpMatchArray | null;
      while ((m = text.match(/\{(\d+)\}$/))) {
        literals.push(await this.readBytes(Number(m[1])));
        text += await this.readLine();
      }
      if (text.startsWith(tag + " ")) {
        const rest = text.slice(tag.length + 1);
        if (!/^OK/i.test(rest)) throw new ImapError(rest.replace(/^(NO|BAD)\s*/i, ""));
        return out;
      }
      out.push({ text, literals });
    }
  }

  static q(s: string) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  async login(user: string, pass: string) {
    await this.cmd(`LOGIN ${ImapLite.q(user)} ${ImapLite.q(pass)}`);
  }

  async select(box: string): Promise<number> {
    const lines = await this.cmd(`SELECT ${ImapLite.q(box)}`);
    const ex = lines.map((l) => l.text.match(/^\* (\d+) EXISTS/i)).find(Boolean);
    return ex ? Number(ex[1]) : 0;
  }

  async searchSince(since: Date, from?: string): Promise<number[]> {
    const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = `${since.getUTCDate()}-${M[since.getUTCMonth()]}-${since.getUTCFullYear()}`;
    const lines = await this.cmd(`UID SEARCH SINCE ${d}${from ? ` FROM ${ImapLite.q(from)}` : ""}`);
    const uids: number[] = [];
    for (const l of lines) {
      const m = l.text.match(/^\* SEARCH(.*)$/i);
      if (m) m[1].trim().split(/\s+/).filter(Boolean).forEach((x) => uids.push(Number(x)));
    }
    return uids;
  }

  // Retorna UIDs cuja estrutura menciona XML (anexo provável).
  async uidsWithXml(uids: number[]): Promise<number[]> {
    if (!uids.length) return [];
    const lines = await this.cmd(`UID FETCH ${uids.join(",")} (UID BODYSTRUCTURE)`);
    const out: number[] = [];
    for (const l of lines) {
      const um = l.text.match(/UID (\d+)/i);
      if (!um) continue;
      const all = l.text + l.literals.map((b) => dec.decode(b)).join(" ");
      if (/xml/i.test(all)) out.push(Number(um[1]));
    }
    return out;
  }

  async fetchRaw(uid: number): Promise<Uint8Array | null> {
    const lines = await this.cmd(`UID FETCH ${uid} (UID BODY.PEEK[])`);
    for (const l of lines) if (l.literals.length) return l.literals[l.literals.length - 1];
    return null;
  }

  async logout() {
    try { await this.cmd("LOGOUT"); } catch { /* ignore */ }
    await this.conn.close();
  }
}
