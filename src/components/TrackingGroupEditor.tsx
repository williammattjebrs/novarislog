import { useEffect, useState } from "react";
import { Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { readTrackingGroup, saveTrackingGroup } from "@/lib/tracking-groups";

export function TrackingGroupEditor({ client, defaultEmail }: { client: string; defaultEmail?: string }) {
  const [emails, setEmails] = useState("");
  const [automatic, setAutomatic] = useState(false);
  const [intervalMin, setIntervalMin] = useState(60);
  const [status, setStatus] = useState("");
  useEffect(() => { const group = readTrackingGroup(client); setEmails(group.emails.join("; ") || defaultEmail || ""); setAutomatic(group.automatic); setIntervalMin(group.intervalMin); }, [client, defaultEmail]);
  function save() {
    const recipients = Array.from(new Set(emails.split(/[;,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)));
    if (!recipients.length || recipients.length > 30 || recipients.some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) { setStatus("Informe de 1 a 30 e-mails válidos."); return; }
    saveTrackingGroup(client, { emails: recipients, automatic, intervalMin, lastSent: readTrackingGroup(client).lastSent });
    setStatus("Grupo salvo para as atualizações deste cliente.");
  }
  return <section className="border-t border-border pt-4 mt-4 space-y-3">
    <h3 className="font-medium flex items-center gap-2"><Mail className="size-4 text-primary" /> Grupo de e-mails de rastreio</h3>
    <label className="block text-xs text-muted-foreground">Destinatários (separados por ponto e vírgula)<textarea aria-label="Destinatários de rastreio" value={emails} onChange={(e) => setEmails(e.target.value)} className="input mt-1" rows={3} /></label>
    <div className="flex flex-wrap gap-3 items-center text-sm">
      <label className="flex gap-2 items-center"><input type="checkbox" checked={automatic} onChange={(e) => setAutomatic(e.target.checked)} /> Envio automático</label>
      <select aria-label="Frequência das atualizações" value={intervalMin} onChange={(e) => setIntervalMin(Number(e.target.value))} className="input w-auto"><option value={15}>A cada 15 minutos</option><option value={30}>A cada 30 minutos</option><option value={60}>A cada hora</option><option value={120}>A cada 2 horas</option><option value={240}>A cada 4 horas</option><option value={1440}>A cada 24 horas</option></select>
    </div>
    <p className="text-xs text-muted-foreground">Envia as notas não entregues enquanto Monitoramento estiver aberto neste navegador. Grupo e frequência ficam salvos neste navegador.</p>
    <Button variant="outline" onClick={save}><Save /> Salvar grupo</Button>
    {status && <p role="status" className="text-xs text-info">{status}</p>}
  </section>;
}