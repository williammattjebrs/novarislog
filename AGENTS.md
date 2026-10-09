<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep in-app training content in a browser-safe module and render it through a dedicated manual route available to all signed-in roles; this keeps guidance separate from operational workflows.
- Send tracking updates through authenticated server functions using the existing workspace Outlook connection and a shared escaped HTML formatter; mailto cannot preserve tables or control character encoding.
- Use the secret-protected server scheduler with durable job claims; browser timers are removed to prevent double execution, and production scheduling stays disabled until explicitly activated.
- Persist authorized operational collections through versioned tms_records_read/tms_records_commit RPCs and src/lib/shared-db.ts; confirmation precedes cache changes, polling refreshes authorized snapshots, and old browser cache is never migrated automatically.
- NF-e import (manual or headless) also places the NF in a v2 draft OC via tms_oc_auto_draft_worker (same remetente+destinatário draft is extended, else a new one), under an advisory lock so it stays idempotent; drafts never send email, and OCs are emitted only by the server (tms_oc_emit_worker); emitted OCs are followed up in Acompanhamento de Coleta (/rotas) and with immutable PDF snapshots, an NF–OC active-link table and a durable per-recipient email outbox; Monitoramento lists emitted OCs only. This keeps planning, documents and execution separate and race-safe.
- Import CT-e via tms_import_cte with server-side fiscal checks, proportional allocation and unique revenue; historical regularization requires an explicit preview confirmation.

- Keep original fiscal document content immutable and financial payment histories append-only; server triggers reject invalid partial payments and reversals.
- Backups read authorized persisted records, and versioned restoration requires a preview and confirmed transactional merge without deletion.
- Parse headless NF-e through an injected XML parser and commit via the service-only transactional import, which also extends/creates the draft OC; this supports scheduling without browser globals.
- Legacy OCs (no modelo v2) convert only through the preview + explicit admin confirmation in Ordens de coleta; they never enter Monitoramento or the outbox retroactively.
- OC collection location is per NF (coletaPorNf, header local is only the default); emission emails go only to collection warehouses, body-only table with just that warehouse's NFs, while the full PDF goes to the driver via WhatsApp — each party receives only what it operates.
- Group companies live in the shared `companies` collection; OCs carry empresaId, contratacao and custoMotorista, validated at emission and frozen in the snapshot (PDF/email branding). A global per-browser company filter (src/lib/empresa-filter.ts) scopes OCs, NFs (via their active OC) and finance titles.
- Group basic registration links in a collapsible AppShell navigation section, filtering each child by existing permissions and preserving its route; navigation grouping must not expand access.
- Render managerial reports from record-level lists and use those same rows for exports; enable CT-e NF details only in reports to preserve the finance table's existing interaction.
- Build tracking rows through the shared OC-enrichment formatter for manual previews, sends and scheduling; use recorded collection events, never scheduled dates, and ignore system logs when selecting the last observation.
- Store delivery proofs in a private bucket with append-only NF-linked metadata and permission-gated signed reads; quick monitoring notes reuse the confirmed atomic OC/NF update flow.
