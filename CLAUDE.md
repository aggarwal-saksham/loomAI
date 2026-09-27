# Agent Instructions — loomAI


Read these files, in this order, before writing or changing any code:

1. `docs/PRD.md` — what we're building and why. Do not deviate from the goal here.
2. `docs/ARCHITECTURE.md` — stack, data model, API contracts, file structure. Treat this as the source of truth for anything technical. It is human-edited; do not rewrite it. If you believe something here should change, propose it and add an entry to `docs/DECISIONS.md` explaining why — don't silently diverge.
3. `docs/DESIGN_SYSTEM.md` — visual rules for the frontend. It includes a ban list of "generic AI app" patterns. Follow it exactly, even if your default instincts pull toward the banned patterns.
4. `TASKS.md` — the current build checklist. Check what's already done before starting work. Update it (`- [x]`) as you complete items.
5. `docs/DECISIONS.md` — an append-only log of choices made mid-build. Read it so you don't "fix" something that was a deliberate decision. Add an entry any time you make a non-obvious technical choice.

## Rules while working

- Validate any LLM-generated structured output (the workflow DAG, extraction results) against the JSON Schemas in `/schemas` using code (e.g. `jsonschema.validate`), not just prompt instructions. If validation fails, retry once with the error appended to the prompt, then mark the step failed — never silently accept malformed output.
- Use the example input/output pairs in `/examples` as few-shot references when building or debugging the LLM planner and extractor calls.
- Before a large or structural change, state which doc justifies it (e.g. "per ARCHITECTURE.md §API Endpoints").
- Work in small, sequential steps per `TASKS.md`, not one giant unscoped pass. Prefer a working, narrow slice over a broad, half-working one.
- Commit (or clearly checkpoint) after each milestone in `TASKS.md` so work can be rolled back cleanly if a later change breaks something.
- Never introduce a new library, service, or architectural pattern not listed in `ARCHITECTURE.md` without adding a `DECISIONS.md` entry first.
- If a requirement is ambiguous, check `PRD.md` and `ARCHITECTURE.md` first; only ask the user if it's genuinely unresolved there.
