# Manual testing knowledge base

Track issues found during manual API testing in [`manual-testing-kb.tsv`](manual-testing-kb.tsv). One row per issue; tab-separated columns.

## Columns

| Column | Content |
|--------|---------|
| `issue_id` | `SRV-###` (next free number) |
| `symptom` | What the user or client sees (status, body, logs) |
| `repro` | Minimal steps: env, method, path, headers, body |
| `evidence` | Request/response snippets, log lines, test output, commit/PR links |
| `root_cause` | Layer and mechanism (see RCA rules below) |
| `fix` | PR/commit or follow-up task; reject workaround-only fixes |
| `verified_by` | Who confirmed and how (manual, `npm test`, `npm run test:api:local`, staging) |

Keep each cell to **3–5 sentences**: symptom, cause, fix, prevention. No filler; name files and layers.

## Issue ID

Assign `SRV-001`, `SRV-002`, … in file order. Do not reuse IDs after close.

## Workflows (agent or human)

### Log a new issue (`/show-me-your-work`)

1. Reproduce once; capture status, body, and relevant server logs.
2. Append a row to `manual-testing-kb.tsv`.
3. In chat, paste the row and point to any open PR or branch.

### History and regressions (`/why "<title>"`)

For an open `issue_id`, gather:

- `git log` / `git blame` on touched paths
- Related PRs and commits (GitHub `gh pr list`, `gh search`)
- Logs or errors (SendGrid, Supabase dashboard, DO app logs, `src/Utils/authErrorLog.js` output if auth)

Update `evidence` and `root_cause` with citations (commit hash, PR #). If intent is unclear, say so; do not invent rationale.

### Code path RCA (`/how "<symptom>"`)

Trace the request until the failure layer is explicit:

```
Client → Express middleware → route handler → service → DB / external API
```

Name the failing layer in `root_cause` (e.g. `middleware/authMiddleware`, `controllers/authController`, `services/supabaseAuth`, Postgres pool, Supabase Auth API).

### Root-cause bar (`/principle-fix-root-causes`)

Reject RCAs that stop at symptoms ("return 500") or masks ("retry on error"). Required:

- **Mechanism**: why this code path fails (config, contract, race, missing env).
- **Fix**: code or config change, or a tracked follow-up (issue link in `fix`).
- **Prevention**: one sentence in `symptom` or `fix` (test added, validator, doc, env check).

If only a workaround exists, set `fix` to the workaround and add `follow-up: …` in the same cell.

### Tighten entries (`/unslop`)

Before closing an issue, edit all seven fields to plain language: concrete nouns, active voice, no significance inflation. Each field should stand alone for someone reading the TSV in six months.

## Local test commands

| Command | Use |
|---------|-----|
| `npm test` | Unit/route tests (mocked externals) |
| `npm run test:api:local` | Live local integration (`RUN_API_INTEGRATION=1`) |
| `npm run test:coverage` | Coverage report |
| `npm run postman:generate` | Refresh Postman collection after route changes |

Postman: `postman/SecondBeat-API.postman_collection.json` with Local / Staging environments.

## TSV rules

- Separate columns with a single tab.
- If a cell contains a tab or newline, wrap the cell in double quotes and escape `"` as `""`.
- Do not put raw secrets in the file; redact tokens and passwords.
