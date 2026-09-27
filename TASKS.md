# Build Checklist — loomAI

Check this before starting work. Update it (`- [x]`) as items complete. Keep
work scoped to one section at a time rather than jumping around.

## 0. Scaffolding
- [x] Repo structure created per `ARCHITECTURE.md`
- [x] Root `README.md` with setup + run instructions for backend and frontend
- [x] `.env.example` with required env vars listed

## 1. Backend — data layer
- [x] SQLAlchemy models: Task, WorkflowNode, WorkflowEdge, ResultRow
- [x] DB init / migration on startup (SQLite file)

## 2. Backend — LLM planner
- [x] `planner.py`: prompt → DAG JSON via LLM structured output
- [x] Validate output against `schemas/workflow_node.json`; retry once on failure
- [x] Tested against both `examples/sample_prompt_1.json` and `sample_prompt_2.json`
- [x] `POST /tasks` persists the validated DAG (status=draft)

## 3. Backend — connectors
- [x] Connector interface (`connectors/base.py`)
- [x] Web search connector (Tavily/SerpAPI)
- [x] Mock search connector (fallback, no API key required)
- [x] RemoteOK connector
- [x] HN Algolia connector

## 4. Backend — execution engine
- [x] Topological sort + async executor
- [x] `fetch` node handler
- [x] `extract` node handler (LLM structured output, validated against
      `schemas/extraction_output.json`, every row requires `source_url`)
- [x] `clean` node handler (normalize + fuzzy dedupe)
- [x] `validate` node handler (flag missing required fields → `needs_review`)
- [x] `output` node handler (writes `ResultRow`s)
- [x] Per-node retry-once-then-fail-isolated behavior
- [x] `POST /tasks/{id}/run`
- [x] `GET /tasks/{id}/stream` (SSE) — or polling fallback, per `DECISIONS.md`

## 5. Backend — remaining endpoints
- [x] `GET /tasks`
- [x] `GET /tasks/{id}`
- [x] `GET /tasks/{id}/results` (paginated, filterable by `needs_review`)
- [x] `GET /tasks/{id}/export?format=csv|json`
- [x] `POST /tasks/{id}/rerun`

## 6. Frontend — foundation
- [x] Tailwind theme tokens set up per `DESIGN_SYSTEM.md` (colors, fonts)
- [x] Base layout shell (left rail / center canvas / bottom drawer)
- [x] Zustand stores (task state, node status, results)
- [x] API client + SSE hook

## 7. Frontend — graph
- [x] Custom React Flow node components (one per node type)
- [x] Live status wiring via SSE/polling
- [x] Edge animation while data flows
- [x] Node completion micro-interaction (scale + glow)

## 8. Frontend — results
- [x] Results drawer (Framer Motion spring physics)
- [x] TanStack Table: mono data font, zebra rows, confidence bar, source_url
      hover tooltip
- [x] Search / filter / sort
- [x] Export buttons (CSV, JSON)

## 9. Frontend — history
- [x] Left rail task list (collapsed by default)
- [x] Reopen past task → shows original graph + results
- [x] Re-run action

## 10. Demo readiness
- [x] Seed 2 cached demo tasks with real, pre-run results (works offline / no
      API quota burn during judging)
- [x] Empty states written in-voice per `DESIGN_SYSTEM.md`
- [x] Error states styled consistently, not default browser/red-text errors
- [x] Full run-through: fresh prompt → graph → execution → results → export

