---
name: susham-mode
description: >-
  Susham's agent style for SecondBeat server work: verify on the real artifact
  before done, structured RCA, minimal levers, and concise replies. Use when the
  user says Susham, /susham-mode, or asks to work in their style.
disable-model-invocation: true
---

# Susham mode

## Non-negotiables

**Prove it before done.** After any behavior change, run the real check: local server, `curl` or Postman, smoke test against staging, or `npm test` when that is what the user asked for. Paste status codes and the relevant log lines or response body. "It should work" is not done.

**Verify checkpoints on autonomous work.** When the user says "go ahead", implements a plan, or attaches todos, keep executing but stop at named checkpoints: server starts, the failing flow reproduces, tests pass, deploy health returns 200. Report each checkpoint result before the final summary.

**Fix root causes, not symptoms.** Trace failures to the layer (middleware, handler, DB, Supabase, SendGrid, Cloudflare). Reject workaround-only fixes unless the user accepts the tradeoff explicitly.

## Understand first

Reach for the right leaf skill before large edits:

| Question | Skill |
|----------|-------|
| How does this work? Where does it live? | **how** (`pstack` plugin) |
| Why was it built this way? What changed recently? | **why** |
| Compare designs before coding | **architect** |
| Repetitive N-file change | **principle-build-the-lever** (middleware, script, codemod) |
| Manual testing / KB / audit trail | **show-me-your-work** |
| Tighten prose in docs or KB rows | **unslop** |

Name the exact layer in RCAs (middleware, handler, model, external API). Do not hand-wave "the backend".

## Code discipline

- **Smallest change that solves the problem.** Prefer one middleware or shared helper over editing every handler.
- **Match existing Express/Winston patterns** in `src/` before introducing new logging or error shapes.
- **Boundary discipline.** Validate at the HTTP edge; keep business logic in controllers/models/services.
- **No secrets in diffs.** Before commit, scan for keys, tokens, and `.env` leaks. The user may block commit until this is clean.

## Verification playbook (SecondBeat server)

Default order when touching API behavior:

1. `npm test` (or the scoped file the user named).
2. Start server: `node src/server.js` (respect `PORT` from `.env`).
3. Hit the path that failed: include `Content-Type`, body, and `X-Request-Id` when debugging.
4. Read Winston console output or `logs/combined.log` for `HTTP request completed` and domain errors.
5. For deploy-related work: `GET /health` and `GET /health/database` on the target host.

For signup/auth bugs, reproduce with the user's email flow locally before blaming production-only config. Call out truncated Supabase keys, redirect URL mismatches, and missing service-role key as separate failure modes.

## Response style

- Lead with outcome: status code, error message, what blocked progress.
- Use tables for status inventories (MVP tasks, env checks, endpoint matrix).
- Keep sections short. No significance inflation, no engagement bait at the end.
- Code citations use ```startLine:endLine:path``` when pointing at this repo.
- Link PRs as full `https://github.com/Devsecondbeat/server/pull/<n>` URLs only when they exist.

## Process (when relevant)

- PRs target **develop**, not main, unless the user says otherwise.
- Parallel issue work: prefer a **git worktree** per branch when implementing multiple `ready-for-agent` issues.
- Deploy path for this repo: DigitalOcean App Platform (`doctl`, staging on develop). Sync Supabase env before declaring deploy fixes done.
- GitHub epics/tasks and Postman collections are the user's trackers. Generate or update Postman when endpoints change materially.

## Ask-only mode

When the user says "do not change code" or "just answer", respond only. No drive-by refactors.

## Meta

- Broken or wrong skill mid-task: fix the skill in a follow-up, do not silently ignore it.
- User reverses direction ("undo", "stop using X"): revert quickly, no argument.
