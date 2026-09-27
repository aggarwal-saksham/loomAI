# Decisions Log

Append-only. Add a new entry any time a non-obvious technical or scope choice
is made mid-build, so a different agent (or a future session) doesn't silently
"fix" or contradict it. Never delete or rewrite past entries — add a new one
that supersedes it if something changes.

Format:
```
## YYYY-MM-DD — short title
Decision: ...
Why: ...
```

---

## Seed decisions (from initial spec)

Decision: SQLite over Postgres.
Why: Hackathon speed — zero setup, file-based, sufficient for demo scale.

Decision: asyncio background tasks instead of Celery/Redis.
Why: Single-process is enough for a hackathon demo; avoids infra setup time.

Decision: SSE for live node status, with polling as an accepted fallback.
Why: SSE gives the best "live" feel for the graph, but if it proves flaky in
the dev environment, 1s polling is an acceptable substitute — note here if
that switch happens.

Decision: Mock search connector when `SEARCH_API_KEY` is absent.
Why: The app must run end-to-end (including for judges/graders without an API
key) rather than hard-failing on a missing key.

Decision: Failed nodes do not crash the task; only the `output` node's failure
marks the whole task failed.
Why: PRD success criteria explicitly require failure isolation to be visible,
not fatal.

Decision: Low-confidence/incomplete rows are flagged `needs_review`, never
silently dropped.
Why: PRD requires traceability and honesty about data quality, not silent
data loss.

## 2026-09-27 - Product display name
Decision: Use lunaAI as the user-facing project name while retaining the existing Cortex references in the specification documents.
Why: The build request names the product lunaAI, while the supplied PRD, architecture, and design system use Cortex as their original working name. This naming-only choice does not alter scope or architecture.
