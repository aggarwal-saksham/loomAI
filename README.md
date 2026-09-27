# loomAI — AI Data Intelligence Platform

> **Dynamic Prompt-to-DAG Collection, Real-Time Signal Terminal & Traceable Extraction**

loomAI is a prompt-based AI data intelligence platform that transforms natural language requests into schema-validated, executable workflow graphs (DAGs). It queries permitted sources, isolates failures, validates and fuzzy-deduplicates records, guarantees source traceability for every extracted row, and streams live progress into an asymmetric control-room terminal interface.

---

## ✦ Key Capabilities

- **Visible, Dynamic Workflow Planning**: Instead of hiding data collection in a black box, loomAI synthesizes a visible Directed Acyclic Graph (DAG) consisting of `source` → `fetch` → `extract` → `clean` → `validate` → `output` nodes.
- **Real-Time Execution Terminal**: Live streaming via Server-Sent Events (SSE) animates data pulses through the graph with custom node badges and flowing edges.
- **Failure Isolation & Auto-Retry**: Faulty fetch queries or transient LLM timeouts auto-retry once with exponential backoff and fail isolated—unaffected branches continue executing to completion without crashing the task.
- **Strict Source Traceability**: Every single persisted `ResultRow` is strictly required to link back to a valid, non-null `source_url`.
- **Fuzzy Deduplication & Quality Control**: Uses `rapidfuzz` token-ratio matching to deduplicate records and flags missing fields or low-confidence rows (`confidence < 0.7`) with `needs_review=true` rather than silently dropping data.
- **Spring Physics Results Drawer**: Results slide up in a spring-animated drawer using TanStack Table with horizontal confidence meters, search filtering, and one-click CSV/JSON export.
- **Mission History & Instant Re-run**: Collapsible left rail allows inspecting past workflow runs, viewing original graphs, and re-executing saved DAGs.
- **100% Offline / Zero-Quota Demo Ready**: Automatically seeds realistic demo missions on initial launch and falls back to a fixture-backed mock search connector if no search API key is provided.

---

## ✦ System Architecture

```mermaid
flowchart TD
    User([User Natural Language Directive]) --> UI[loomAI Signal Terminal\nReact 18 + TS + Vite]
    UI -->|POST /tasks| Planner[LLM Planner\nGemini 3.8 Flash]
    Planner -->|Validates JSON Schema| DB[(SQLite Database\nTasks, Nodes, Edges)]
    UI -->|POST /tasks/:id/run| Executor[Async DAG Executor\nTopological Order]
    
    subgraph Execution Pipeline
        N1[Source Nodes\nWeb Search / RemoteOK / HN] --> N2[Fetch Node]
        N2 --> N3[Extract Node\nLLM Structured Parser]
        N3 --> N4[Clean Node\nNormalize + Fuzzy Dedupe]
        N4 --> N5[Validate Node\nField Check + Confidence Gate]
        N5 --> N6[Output Node\nPersist ResultRows]
    end

    Executor --> Execution Pipeline
    Executor -->|SSE Stream: GET /tasks/:id/stream| UI
    N6 --> DB
    UI -->|GET /tasks/:id/results| Drawer[Results Drawer\nTanStack Grid + CSV/JSON Export]
```

---

## ✦ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, TypeScript, Vite, Tailwind CSS, `@xyflow/react` (Graph Canvas), `framer-motion` (Spring Drawer), `@tanstack/react-table`, `zustand` (State) |
| **Design System** | Signal intelligence control-room aesthetic (`#0B0D10` near-black base, `#15181C` graphite surfaces, `#FF7A1A` hot amber active state, JetBrains Mono & Space Grotesk typefaces) |
| **Backend API** | FastAPI, Python 3.11+, SQLAlchemy 2.0, SQLite, `asyncio` task execution, Server-Sent Events (SSE) streaming |
| **Intelligence** | Google Gemini (`gemini-3.8-flash` with `x-goog-api-key` header & exponential backoff), OpenAI, Anthropic |
| **Connectors** | Tavily Web Search API, RemoteOK Job API, Hacker News Algolia API, and built-in `MockSearchConnector` |
| **Validation** | `jsonschema` validation against `schemas/workflow_node.json` and `schemas/extraction_output.json` |

---

## ✦ Directory Structure

```
loomAI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entrypoint, CORS, startup lifespan & seed
│   │   ├── db.py                # SQLite engine & SQLAlchemy SessionLocal
│   │   ├── models.py            # Task, WorkflowNode, WorkflowEdge, ResultRow
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── seed.py              # Realistic demo missions for offline evaluation
│   │   ├── connectors/          # Web search, RemoteOK, Hacker News, Mock
│   │   ├── workflow/            # Planner (LLM DAG), Executor (Async), Nodes (Handlers)
│   │   └── routes/              # /tasks REST & SSE endpoints
│   ├── tests/                   # 13 automated unit & integration test suites
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandBar.tsx   # Top directive bar & preset chips
│   │   │   ├── graph/           # Custom React Flow nodes & animated edge canvas
│   │   │   ├── history/         # Collapsible mission history left rail
│   │   │   └── results/         # Spring results drawer & TanStack table
│   │   ├── store/               # Zustand application store
│   │   ├── lib/                 # API client, SSE hook, TypeScript types
│   │   ├── App.tsx              # Asymmetric 3-zone layout orchestrator
│   │   ├── index.css            # Custom scrollbars, glow pulses, edge keyframes
│   │   └── main.tsx
│   ├── index.html               # Google Fonts (JetBrains Mono, Space Grotesk)
│   ├── tailwind.config.js       # Design system tokens
│   └── package.json
├── docs/                        # PRD, Architecture, Design System, Decisions Log
├── schemas/                     # Strict JSON schemas for workflow and extractions
├── examples/                    # Few-shot sample prompts and expected DAG fixtures
├── TASKS.md                     # Completed build checklist
└── README.md
```

---

## ✦ Getting Started

### Prerequisites

- **Python**: 3.11 or newer
- **Node.js**: v20 or newer (v24 supported)
- **Package Manager**: `npm` (Windows PowerShell: use `npm.cmd`)

---

### 1. Environment Configuration

Create a `.env` file in the root directory:

```powershell
cp .env.example .env
```

Open `.env` and configure your API credentials:

```bash
# Recommended LLM Provider (Google AI Studio)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Optional: Tavily Web Search API key (falls back to mock connector if omitted)
SEARCH_API_KEY=your_search_api_key_here

# Alternative LLM Providers (Optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

> [!TIP]
> **No API keys?** You can still run and explore the entire platform! loomAI automatically boots with pre-seeded demo missions and an offline mock search connector.

---

### 2. Backend Setup

Open a terminal in the `backend/` directory:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The FastAPI backend will start at `http://127.0.0.1:8000`.  
Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Setup

Open a second terminal in the `frontend/` directory:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open your browser at `http://localhost:5173` to access the loomAI Signal Terminal.

---

## ✦ REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/tasks` | Synthesizes an LLM workflow DAG from `{ prompt }`, validates against JSON Schema, and saves task in `draft` status. |
| `POST` | `/tasks/{id}/run` | Starts async execution of the DAG in topological order. Returns `{ status: "running" }`. |
| `GET` | `/tasks/{id}/stream` | Server-Sent Events (SSE) stream broadcasting live status updates per node (`pending` → `running` → `done`/`failed`). |
| `GET` | `/tasks` | Retrieves list of all past missions with prompt, status, result count, and timestamps. |
| `GET` | `/tasks/{id}` | Retrieves full graph topology (nodes, positions, configs, and edges) with current statuses. |
| `GET` | `/tasks/{id}/results` | Paginated results grid. Supports `?page=1&page_size=50&needs_review=true\|false`. |
| `GET` | `/tasks/{id}/export` | Generates a downloadable file of all results in `csv` or `json` (`?format=csv` or `?format=json`). |
| `POST` | `/tasks/{id}/rerun` | Resets node statuses, clears old result rows, and re-executes the saved DAG. |
| `GET` | `/health` | Health-check endpoint returning `{"status": "ok"}`. |

---

## ✦ Quality Assurance & Automated Tests

loomAI includes a comprehensive test suite covering the data layer, planner few-shot validation, connector routing, DAG executor topological ordering, failure isolation, SSE event bus, and all REST endpoints.

Run the test suite from `backend/`:

```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

All 13 automated tests run and pass in under 5 seconds:
```
test_mock_connector_returns_traceable_fixture_documents ... ok
test_execute_task_end_to_end ... ok
test_node_retry_and_isolation ... ok
test_run_endpoint ... ok
test_sse_event_bus ... ok
test_fixture_plans_validate ... ok
test_invalid_plan_retries_once ... ok
test_post_tasks_persists_a_valid_plan ... ok
test_export_task_results ... ok
test_get_task_by_id ... ok
test_get_task_results_pagination_and_filter ... ok
test_get_tasks_history_list ... ok
test_rerun_task ... ok

Ran 13 tests in 3.5s — OK
```

To validate the frontend build:

```powershell
cd frontend
npm.cmd run build
```

---

## ✦ Design System Compliance

Per `docs/DESIGN_SYSTEM.md`, loomAI intentionally rejects generic "AI wrapper" aesthetics (no purple/blue gradients, no centered chat-bubbles, no stock hero cards). Instead, it adopts a technical, high-density **Signal Intelligence Terminal** aesthetic:

- **Asymmetric Three-Zone Layout**:
  1. *Left Rail*: Mission history, collapsed by default.
  2. *Center Canvas*: Dominant viewport rendering interactive workflow DAG nodes and flowing dashed edge animations.
  3. *Bottom Drawer*: Spring-physics results table displaying verified records, horizontal confidence meters, and instant export tools.
- **Color Discipline**: True near-black background (`#0B0D10`), graphite panels (`#15181C`), muted borders (`#2B3038`), hot amber active indicator (`#FF7A1A`), and cool green completion glow (`#3FA772`).
- **Technical Typography**: JetBrains Mono for data, timestamps, and node parameters; Space Grotesk for crisp terminal headers.

---

## ✦ License

MIT
