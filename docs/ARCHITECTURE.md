# Architecture — Cortex

This is the source of truth for anything technical. Do not deviate without
adding an entry to `DECISIONS.md`.

## Stack

- **Frontend:** React + TypeScript + Vite, Tailwind CSS (custom theme, see
  `DESIGN_SYSTEM.md`), React Flow (graph canvas), Framer Motion (motion),
  TanStack Table (results grid), Zustand (client state).
- **Backend:** FastAPI (Python 3.11+), SQLite + SQLAlchemy, async execution via
  `asyncio` background tasks (no Redis/Celery — out of scope), Server-Sent
  Events for live node-status streaming (fall back to 1s polling if SSE proves
  unreliable in the dev environment — log this in `DECISIONS.md` if so).
- **LLM:** Anthropic or OpenAI API, structured/JSON output mode (tool-calling
  or JSON mode) for both the planner and extractor calls. Read the API key
  from an environment variable; never hardcode it.
- **Connectors (permitted sources only):**
  - Web search API (Tavily or SerpAPI — env var `SEARCH_API_KEY`). If absent,
    fall back to a `MockSearchConnector` that returns fixture data from
    `/examples`, so the app still runs end-to-end without a key.
  - RemoteOK API (jobs) — `https://remoteok.com/api`
  - Hacker News Algolia API — `https://hn.algolia.com/api/v1/search`
  - GitHub public API (optional third connector if time allows)

## Repository structure

```
/backend
  /app
    main.py                # FastAPI app entrypoint
    models.py               # SQLAlchemy models
    db.py                    # engine/session setup
    schemas.py               # Pydantic request/response models
    /connectors
      base.py                # Connector interface
      web_search.py
      remoteok.py
      hn_algolia.py
      mock.py
    /workflow
      planner.py             # LLM call → DAG JSON, schema-validated
      executor.py             # async DAG executor, node handlers
      nodes.py                # per-type node handler functions
    /routes
      tasks.py                # all /tasks endpoints
  requirements.txt
/frontend
  /src
    /components
      /graph                 # custom React Flow node components
      /results                # TanStack Table + export
      /history                # left rail task list
    /store                    # Zustand stores
    /lib                      # API client, SSE hook
    App.tsx
  package.json
/docs
  PRD.md
  ARCHITECTURE.md
  DESIGN_SYSTEM.md
  DECISIONS.md
/schemas
  workflow_node.json
  extraction_output.json
/examples
  sample_prompt_1.json
  sample_prompt_2.json
TASKS.md
AGENTS.md
CLAUDE.md
README.md
```

## Data model (SQLAlchemy)

```
Task
  id: str (uuid)
  prompt: str
  status: enum(draft, running, done, failed)
  created_at: datetime

WorkflowNode
  id: str (uuid)
  task_id: FK(Task)
  type: enum(source, fetch, extract, clean, validate, output)
  label: str
  config_json: JSON
  status: enum(pending, running, done, failed)
  position_x: float
  position_y: float
  started_at: datetime | null
  completed_at: datetime | null
  error_message: str | null

WorkflowEdge
  id: str (uuid)
  task_id: FK(Task)
  from_node_id: FK(WorkflowNode)
  to_node_id: FK(WorkflowNode)

ResultRow
  id: str (uuid)
  task_id: FK(Task)
  fields_json: JSON            # the extracted structured fields
  source_url: str               # required, non-null
  confidence: float             # 0.0–1.0
  needs_review: bool
  created_at: datetime
```

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/tasks` | Body `{prompt}`. Runs the LLM planner, validates output against `schemas/workflow_node.json`, persists Task + WorkflowNode + WorkflowEdge rows (status=draft). Returns full graph. |
| POST | `/tasks/{id}/run` | Executes the DAG asynchronously in topological order. Returns immediately with status=running. |
| GET | `/tasks/{id}/stream` | SSE stream of node status updates: `{node_id, status, timestamp, error?}`. |
| GET | `/tasks` | History list: `{id, prompt, status, result_count, created_at}[]`. |
| GET | `/tasks/{id}` | Full graph (nodes + edges) with current statuses. |
| GET | `/tasks/{id}/results` | Paginated `ResultRow[]`, filterable by `needs_review`. |
| GET | `/tasks/{id}/export?format=csv\|json` | Downloadable file of all ResultRows. |
| POST | `/tasks/{id}/rerun` | Re-executes the existing saved DAG (new ResultRows, same graph). |

## Execution rules

- Nodes execute in topological order per the DAG. Nodes with no unmet
  dependency can run as soon as their dependencies are done (don't force
  strict serial execution if the DAG allows parallelism, but serial is
  acceptable for hackathon scope if simpler).
- If a node fails (fetch error, malformed LLM output, etc.): retry once. If it
  fails again, mark it `failed` with `error_message` set, and continue
  executing any other nodes whose dependencies were satisfied. Do not crash
  the task. Only mark the overall `Task.status = failed` if the `output` node
  itself cannot run.
- `extract` node output must be validated against `schemas/extraction_output.json`
  before being written to `ResultRow`. Every row must have a non-null `source_url`.
- `clean` node: normalize whitespace/casing/date formats; dedupe by fuzzy match
  on name+domain (e.g. `rapidfuzz.fuzz.ratio` with a threshold, tune during
  build). Rows below the confidence threshold go to `needs_review=true`
  instead of being dropped.
- `validate` node: flag rows missing required fields (per the extraction
  schema) — these also get `needs_review=true`, not deleted.

## Environment variables

```
ANTHROPIC_API_KEY=            # or OPENAI_API_KEY
SEARCH_API_KEY=                # Tavily or SerpAPI; optional (falls back to mock)
```

## Non-negotiable technical constraints

- Every `ResultRow` has a `source_url`. No exceptions — if extraction can't
  determine one, that row is invalid and must not be persisted.
- Structured LLM outputs (planner DAG, extraction fields) are validated with
  `jsonschema.validate()` against the files in `/schemas`, in code — not just
  requested via prompt.
