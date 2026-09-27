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

## 2026-09-27 - Local database location
Decision: Store the SQLite database at `backend/lunaai.db` and initialize its schema with SQLAlchemy on application startup.
Why: This keeps the single-process, file-backed development database beside the backend, avoids machine-specific configuration, and follows the SQLite decision in the architecture.

## 2026-09-27 - Default planner models
Decision: Use `gpt-4o-mini` for OpenAI and `claude-3-5-haiku-latest` for Anthropic planner calls, selected by the available API key.
Why: Both are economical structured-output-capable defaults for a hackathon workflow. The HTTP client boundary keeps model selection easy to adjust without changing planner validation or persistence behavior.

## 2026-09-27 - Search provider selection
Decision: Implement the permitted web-search connector using Tavily.
Why: The architecture permits Tavily or SerpAPI. Tavily's search response provides result URLs and content snippets directly, which supports traceable extraction with the smallest connector surface.

## 2026-09-27 - Product name standardized
Decision: Standardize the product name as loomAI across application code, documentation, package metadata, and local database naming.
Why: The project owner selected loomAI as the final product name. This supersedes the earlier lunaAI display-name decision and replaces the original Cortex working name.

## 2026-09-27 - Root environment loading
Decision: Load the gitignored root `.env` during FastAPI startup with `python-dotenv`.
Why: The documented local startup command runs from `backend/`, while credentials are kept in the repository root. Explicit loading keeps that command reliable without exposing secrets in source control.

## 2026-09-27 - Gemini as default LLM provider
Decision: Add Gemini REST API support through the existing `httpx` client and prefer `GEMINI_API_KEY` with `gemini-2.5-flash-lite` by default.
Why: The project owner has Gemini keys with available free-tier quota. Gemini JSON mode plus loomAI's existing `jsonschema` validation preserves the planner and extractor output contract without introducing an SDK dependency.

## 2026-09-27 - Section 4 & 5 Execution Engine and API Completion
Decision: Complete end-to-end execution test suite, mock connector routing, and implement Section 5 REST endpoints (list, get, paginated results with review filtering, dynamic CSV/JSON export, and task rerun with node status reset).
Why: Fulfills the ARCHITECTURE.md API specification, validates DAG topological execution, isolates node failures gracefully, and prepares the backend contract for frontend connection.

## 2026-09-27 - Frontend Terminal Implementation and Demo Readiness
Decision: Built the React/TypeScript/Vite frontend following the control-room terminal aesthetic from DESIGN_SYSTEM.md: 3-zone layout (collapsible left rail for mission history, center canvas with custom @xyflow nodes and flowing dashes, bottom spring drawer for TanStack table signals), and automatically seed 2 realistic demo tasks at backend startup for offline evaluation.
Why: Strictly enforces the ban list against generic AI apps, fulfills the full PRD user journey, and allows the platform to be evaluated offline without incurring API quota burn.


