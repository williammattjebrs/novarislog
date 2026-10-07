import { TRACKING_COLUMNS, type buildTrackingEmail } from "@/lib/tracking-email";

export function TrackingEmailPreview({ email }: { email: ReturnType<typeof buildTrackingEmail> }) {
  return <section aria-label="Prévia da atualização" className="space-y-3">
    <h3 className="font-medium text-sm">{email.title}</h3>
    <p className="text-sm whitespace-pre-line">{email.intro}</p>
    <div className="overflow-x-auto border border-border rounded-md">
      <table className="w-full min-w-[850px] text-xs border-collapse">
        <thead className="bg-elevated"><tr>{TRACKING_COLUMNS.map((label) => <th key={label} scope="col" className="p-3 text-left border-b border-border">{label}</th>)}</tr></thead>
        <tbody>{email.rows.map((row, i) => <tr key={i}>{row.map((text, j) => <td key={j} className="p-3 border-b border-border align-top">{text}</td>)}</tr>)}</tbody>
      </table>
    </div>
    <p className="text-xs text-muted-foreground">Previsões no horário de Brasília.</p>
  </section>;
}