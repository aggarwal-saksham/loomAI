# loomAI

> **An AI-orchestrated data intelligence platform that compiles natural-language requests into observable, self-healing collection DAGs with strict source-traceability.**

---

## 🎯 The Core Problem & What loomAI Solves

### The Problem with Traditional Web Scrapers & AI Wrappers
1. **Fragile, Hardcoded Scrapers**: Businesses need data (sponsorships, leads, job listings, market intel) from dynamic web sources. Writing a bespoke scraper for every query takes days, breaks on minor HTML changes, and doesn't scale.
2. **The "Black Box" Problem in AI Tools**: Most "AI research agents" run invisible Python scripts in the background, hallucinate facts, fail silently without letting you see where they got stuck, or output unverifiable data.
3. **Silent Data Loss & Hallucinations**: Standard scrapers either crash when a field is missing or silently drop low-confidence rows. Furthermore, AI extractors often invent URLs or summarize without citations.

### How loomAI Solves This
- **Visible Dynamic DAG Compiler**: A natural-language prompt doesn't just run a script; it dynamically compiles into an observable **Directed Acyclic Graph (DAG)** (`source` → `fetch` → `extract` → `clean` → `validate` → `output`).
- **Live Signal Terminal**: Each node's execution is streamed in real-time over Server-Sent Events (SSE). Users watch the pipeline execute step-by-step with pulsing status chips and animated flowing edges.
- **Strict Source Traceability**: Every row persisted in the database is verified by schema code to have a working, non-empty `source_url`. No hallucinated sources.
- **Fail-Isolated Branching**: If a node fails (e.g. bad fetch or API rate limit), it retries once, isolates the failure to its branch, and lets independent branches finish. The overall task only fails if the final `output` dataset node cannot run.
- **Data Quality Quarantine**: Incomplete or low-confidence rows (`confidence < 0.70`) aren't deleted—they are quarantined into `needs_review = true` so the user maintains full auditability.

---

## 🛠️ Hard Engineering Problems We Diagnosed & Fixed

During the design and implementation of loomAI, several non-trivial distributed systems, LLM reliability, and frontend challenges were tackled:

### 1. The 503 Overload & Payload Bloat in LLM Extraction
- **The Issue**: Fetch nodes querying search APIs returned massive HTML snippets and raw texts. Passing raw payloads directly to the LLM extractor overloaded Google Gemini's API gateway, resulting in HTTP `503 Service Unavailable`.
- **The Fix**: Implemented an intelligent document sanitizer in `nodes.py` that caps each document snippet to 1,500 characters and prioritizes top relevance matches. Added a 3-stage exponential backoff retry loop in `planner.py` with automatic fallback from `gemini-3.8-flash` to `gemini-flash-latest` / `gemini-flash-lite-latest` if capacity limits are reached.

### 2. API Key Leakage in HTTP Error Traces
- **The Issue**: Gemini's default query param pattern (`?key=...`) caused `httpx` to print the complete API key in terminal exception tracebacks and UI error cards when network calls failed.
- **The Fix**: Migrated to the official `x-goog-api-key` HTTP header so credentials never appear in URLs. Added a regex-based redaction filter in `TaskEventBus.publish` to sanitize any sensitive credentials before streaming error events to the frontend.

### 3. Asynchronous SSE Disconnects & ASGI Server Crashes
- **The Issue**: When users refreshed the browser or switched missions in the UI, open Server-Sent Event (SSE) generators threw unhandled `asyncio.CancelledError` and `ClientDisconnected` exceptions, flooding the Uvicorn console.
- **The Fix**: Rewrote `stream_task` in `tasks.py` with graceful cancellation handling (`(asyncio.CancelledError, GeneratorExit)`) and added 20-second `: keepalive` pings to keep connections healthy through reverse proxies.

### 4. Port Collisions & Direct Execution Support
- **The Issue**: Running `python app/main.py` directly caused `ImportError: attempted relative import with no known parent package`. Additionally, lingering background worker processes occasionally caused Windows socket binding conflicts (`[Errno 10048]`).
- **The Fix**: Added `if __name__ == '__main__': uvicorn.run(...)` with automatic module resolution in `main.py` and enabled full `CORSMiddleware` so the Vite dev server (`:5173`) can communicate seamlessly with FastAPI (`:8000`).

### 5. False Duplicate Collisions in Fuzzy Matching
- **The Issue**: In the `clean` node, rows with missing or generic names collapsed together because `fuzz.ratio("", "") == 100`, accidentally pruning unique data.
- **The Fix**: Updated the deduplication engine in `nodes.py` to require non-empty identity strings, support custom `dedupe_on` field tuples (e.g. `['company_name', 'website']`), and apply strict token matching thresholds before pruning duplicates.

---

## ⚡ Tech Stack

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (custom control-room theme: `#0B0D10` near-black base, `#15181C` graphite cards, `#FF7A1A` hot amber active state)
- **Workflow Canvas**: `@xyflow/react` with custom-rendered nodes and animated SVG flow paths
- **Data Grid**: `@tanstack/react-table` with live column sorting, filtering, and confidence meters
- **Micro-Interactions**: `framer-motion` for spring-physics drawers and completion glow pulses
- **State Management**: `zustand` for single-source-of-truth across DAG states, task lists, and signal data

### Backend & Data
- **API Framework**: FastAPI, Python 3.11+, Uvicorn
- **Database & ORM**: SQLite + SQLAlchemy 2.0 (`Task`, `WorkflowNode`, `WorkflowEdge`, `ResultRow`)
- **Async Execution**: Native `asyncio` background DAG traversal with topological dependency resolution
- **Real-Time Streaming**: Server-Sent Events (SSE) via custom asynchronous `TaskEventBus`
- **Quality & Dedupe**: `rapidfuzz` (string & token similarity) and `jsonschema` (strict schema validation)

### Permitted Connectors & Intelligence
- **LLM Engine**: Google Gemini API (`gemini-3.8-flash` by default; OpenAI and Anthropic supported as drop-ins)
- **Search Connectors**: Tavily Web Search API (live web search)
- **Public APIs**: RemoteOK API (job listings) & Hacker News Algolia API (discussions & launches)
- **Zero-Dependency Mock**: Built-in `MockSearchConnector` backed by fixture data for offline evaluation

---

## 📁 Folder Structure

```
loomAI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization, CORS middleware, lifespan & direct execution
│   │   ├── db.py                # SQLite engine setup and SQLAlchemy SessionLocal provider
│   │   ├── models.py            # SQLAlchemy database models (Task, WorkflowNode, WorkflowEdge, ResultRow)
│   │   ├── schemas.py           # Pydantic v2 validation models for requests, graph responses, and exports
│   │   ├── seed.py              # Automatic offline demo seeding (Fintech Sponsors & Remote DevOps jobs)
│   │   ├── connectors/          # Data ingestion connectors
│   │   │   ├── base.py          # Abstract Connector interface & SourceDocument dataclass
│   │   │   ├── web_search.py    # Tavily Web Search API connector
│   │   │   ├── remoteok.py      # RemoteOK JSON API connector
│   │   │   ├── hn_algolia.py    # Hacker News Algolia Search API connector
│   │   │   └── mock.py          # Offline fixture-backed mock search connector
│   │   ├── workflow/            # Core execution engine
│   │   │   ├── planner.py       # LLM workflow compiler (prompt → validated DAG with retry backoff)
│   │   │   ├── executor.py      # Async topological DAG executor & SSE TaskEventBus
│   │   │   └── nodes.py         # Node handlers (source, fetch, extract, clean, validate, output)
│   │   └── routes/
│   │       └── tasks.py         # REST endpoints: /tasks, /run, /stream, /results, /export, /rerun
│   ├── tests/                   # Automated unit & integration tests
│   │   ├── test_connectors.py   # Tests for source connectors and fixture responses
│   │   ├── test_planner.py      # Tests for LLM prompt compiler and schema validation
│   │   ├── test_executor.py     # Tests for DAG topological sort, failure isolation, and SSE bus
│   │   └── test_routes.py       # Tests for REST endpoints, pagination, CSV/JSON export, and rerun
│   ├── requirements.txt         # Backend Python dependencies
│   └── loomai.db                # Local SQLite database file
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandBar.tsx   # Top terminal bar with mission directive input & preset chips
│   │   │   ├── graph/
│   │   │   │   ├── CustomNode.tsx       # Custom React Flow node with type tags, status pills & glow pulses
│   │   │   │   └── WorkflowCanvas.tsx   # Interactive graph canvas with flowing dashed edge animations
│   │   │   ├── history/
│   │   │   │   └── HistoryRail.tsx      # Collapsible left rail showing past missions with instant re-run
│   │   │   └── results/
│   │   │       └── ResultsDrawer.tsx    # Spring-physics drawer with TanStack Table & CSV/JSON export
│   │   ├── store/
│   │   │   └── useAppStore.ts   # Zustand state store managing task graph, drawer, and live results
│   │   ├── lib/
│   │   │   ├── api.ts           # Frontend REST API client
│   │   │   ├── types.ts         # TypeScript data contracts (TaskGraph, ResultRow, NodeStatus, etc.)
│   │   │   └── useSSE.ts        # React hook for real-time Server-Sent Events subscription
│   │   ├── App.tsx              # Asymmetric three-zone terminal layout
│   │   ├── index.css            # Tailwind directives, custom scrollbars, and keyframe animations
│   │   └── main.tsx             # React DOM entrypoint
│   ├── index.html               # Web entrypoint with Google Fonts (JetBrains Mono & Space Grotesk)
│   ├── tailwind.config.js       # Design system theme tokens
│   ├── vite.config.ts           # Vite bundler configuration & backend proxy
│   ├── tsconfig.json            # TypeScript configuration
│   └── package.json             # Frontend dependencies
│
├── docs/                        # Specifications and decisions history
│   ├── PRD.md                   # Product requirements document
│   ├── ARCHITECTURE.md          # Technical specifications and data contracts
│   ├── DESIGN_SYSTEM.md         # Visual rules, color tokens, and UI ban list
│   └── DECISIONS.md             # Append-only architectural decisions log
│
├── schemas/                     # JSON Schemas validated at runtime
│   ├── workflow_node.json       # Schema for validating LLM-generated DAG plans
│   └── extraction_output.json   # Schema for validating LLM-extracted structured fields
│
├── examples/                    # Few-shot prompts & expected planner/extractor JSON fixtures
│   ├── sample_prompt_1.json     # Fintech hackathon sponsors fixture
│   └── sample_prompt_2.json     # Remote DevOps job listings fixture
│
├── TASKS.md                     # Completed build checklist (All 10 sections checked)
├── HANDOFF.md                   # State handoff and run guide
└── README.md                    # Project documentation
```

---

## 🚀 Quickstart

### 1. Configure Environment
Create `.env` in the project root:
```powershell
cp .env.example .env
```
Add your Gemini API key (free tier supported):
```bash
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.8-flash

# Optional: Tavily web search key (falls back to mock search if empty)
SEARCH_API_KEY=
```

### 2. Start Backend
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*API docs available at `http://127.0.0.1:8000/docs`.*

### 3. Start Frontend
In a second terminal:
```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```
*Open `http://localhost:5173` to launch the terminal.*

---

## 🧪 Test Suite

Run the 13 automated backend tests (covers connectors, planner, DAG executor, retry/isolation, SSE events, and all REST endpoints):
```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```
Build frontend production bundle:
```powershell
cd frontend
npm.cmd run build
```
