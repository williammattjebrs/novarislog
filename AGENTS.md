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
- Keep interval-based tracking sends active only while Monitoramento is open until a server scheduler is validated and explicitly activated; do not enable production scheduling during reliability tests.
- Persist authorized operational collections through versioned tms_records_read/tms_records_commit RPCs and src/lib/shared-db.ts; confirmation precedes cache changes, polling refreshes authorized snapshots, and old browser cache is never migrated automatically.
- Import new NF-e with route and OC in one commitLists transaction, and CT-e via tms_import_cte with server-side fiscal checks, proportional allocation and unique revenue; historical regularization requires an explicit preview confirmation.

- Keep original fiscal document content immutable and financial payment histories append-only; server triggers reject invalid partial payments and reversals.
- Backups read authorized persisted records, and versioned restoration requires a preview and confirmed transactional merge without deletion.
