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
- [ ] `planner.py`: prompt → DAG JSON via LLM structured output
- [ ] Validate output against `schemas/workflow_node.json`; retry once on failure
- [ ] Tested against both `examples/sample_prompt_1.json` and `sample_prompt_2.json`
- [ ] `POST /tasks` persists the validated DAG (status=draft)

## 3. Backend — connectors
- [ ] Connector interface (`connectors/base.py`)
- [ ] Web search connector (Tavily/SerpAPI)
- [ ] Mock search connector (fallback, no API key required)
- [ ] RemoteOK connector
- [ ] HN Algolia connector

## 4. Backend — execution engine
- [ ] Topological sort + async executor
- [ ] `fetch` node handler
- [ ] `extract` node handler (LLM structured output, validated against
      `schemas/extraction_output.json`, every row requires `source_url`)
- [ ] `clean` node handler (normalize + fuzzy dedupe)
- [ ] `validate` node handler (flag missing required fields → `needs_review`)
- [ ] `output` node handler (writes `ResultRow`s)
- [ ] Per-node retry-once-then-fail-isolated behavior
- [ ] `POST /tasks/{id}/run`
- [ ] `GET /tasks/{id}/stream` (SSE) — or polling fallback, per `DECISIONS.md`

## 5. Backend — remaining endpoints
- [ ] `GET /tasks`
- [ ] `GET /tasks/{id}`
- [ ] `GET /tasks/{id}/results` (paginated, filterable by `needs_review`)
- [ ] `GET /tasks/{id}/export?format=csv|json`
- [ ] `POST /tasks/{id}/rerun`

## 6. Frontend — foundation
- [ ] Tailwind theme tokens set up per `DESIGN_SYSTEM.md` (colors, fonts)
- [ ] Base layout shell (left rail / center canvas / bottom drawer)
- [ ] Zustand stores (task state, node status, results)
- [ ] API client + SSE hook

## 7. Frontend — graph
- [ ] Custom React Flow node components (one per node type)
- [ ] Live status wiring via SSE/polling
- [ ] Edge animation while data flows
- [ ] Node completion micro-interaction (scale + glow)

## 8. Frontend — results
- [ ] Results drawer (Framer Motion spring physics)
- [ ] TanStack Table: mono data font, zebra rows, confidence bar, source_url
      hover tooltip
- [ ] Search / filter / sort
- [ ] Export buttons (CSV, JSON)

## 9. Frontend — history
- [ ] Left rail task list (collapsed by default)
- [ ] Reopen past task → shows original graph + results
- [ ] Re-run action

## 10. Demo readiness
- [ ] Seed 2 cached demo tasks with real, pre-run results (works offline / no
      API quota burn during judging)
- [ ] Empty states written in-voice per `DESIGN_SYSTEM.md`
- [ ] Error states styled consistently, not default browser/red-text errors
- [ ] Full run-through: fresh prompt → graph → execution → results → export
