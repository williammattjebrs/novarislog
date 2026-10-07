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
- Keep interval-based tracking sends active only while Monitoramento is open until operational orders are persisted in Cloud; a background scheduler cannot read browser-local orders.
- Persist all operational collections (clients, tables, orders, finance, config, tracking groups) in the shared app_records table via src/lib/shared-db.ts with local cache and realtime; every signed-in user must see the same data.
