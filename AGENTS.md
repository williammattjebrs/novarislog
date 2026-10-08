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
- NF-e import (manual or headless) only adds the NF to the Rotas queue; OCs are created from selected NFs as v2 drafts and emitted only by the server (tms_oc_emit_worker) with immutable PDF snapshots, an NF–OC active-link table and a durable per-recipient email outbox; Monitoramento lists emitted OCs only. This keeps planning, documents and execution separate and race-safe.
- Import CT-e via tms_import_cte with server-side fiscal checks, proportional allocation and unique revenue; historical regularization requires an explicit preview confirmation.

- Keep original fiscal document content immutable and financial payment histories append-only; server triggers reject invalid partial payments and reversals.
- Backups read authorized persisted records, and versioned restoration requires a preview and confirmed transactional merge without deletion.
- Parse headless NF-e through an injected XML parser and commit only the NF via the service-only transactional import; this supports scheduling without browser globals and never creates OCs.
- Legacy OCs (no modelo v2) convert only through the preview + explicit admin confirmation in Ordens de coleta; they never enter Monitoramento or the outbox retroactively.
