# loomAI

> **Turn any data request into a live, visual workflow DAG that collects, cleans, and exports source-backed data.**

---

## 🎬 Demo & Tutorial

<div align="center">
  <video src="./tutorial_loomAI.mp4" controls="controls" width="100%" style="max-height: 480px; border-radius: 8px; border: 1px solid #2B3038;">
    <source src="./tutorial_loomAI.mp4" type="video/mp4">
    https://github.com/user-attachments/assets/962db8b6-0d86-4025-9b1e-e4a88244d2cf
  </video>
</div>

---

## 💡 What Problem Does loomAI Solve?

When businesses need information from the web—such as job listings, sales leads, hackathon sponsors, or market data—they usually face two bad options:

1. **Manual / Custom Scrapers**: Writing a custom scraper for every website is slow, brittle, and breaks whenever a page layout changes.
2. **Generic AI Tools**: Most AI agents run in an invisible "black box"—you don't know where the data came from, results can be hallucinated, and if something fails, the entire process crashes silently.

### How loomAI Solves This:
- **No Black Boxes**: You type what you need in plain English (e.g. *"Find 15 companies sponsoring student hackathons in fintech"*). loomAI dynamically builds a visible workflow graph (DAG) showing each step.
- **Live Observability**: Watch nodes execute in real time (`Source` → `Fetch` → `Extract` → `Clean` → `Validate` → `Output`) with animated connections and instant progress status.
- **100% Source-Traceable**: Every single extracted row includes a direct, working link to the source page it came from.
- **Fault-Tolerant**: If one source or website fails, only that branch is isolated. The rest of the workflow keeps running and delivers your data.
- **No Lost Data**: Instead of silently dropping rows that are incomplete or low-confidence, loomAI flags them for review so you stay in full control.

---

## ✨ Features

- **Dynamic Workflow Planner**: Automatically designs an executable pipeline tailored to your prompt using Google Gemini.
- **Interactive Graph Canvas**: Built with `@xyflow/react` featuring custom nodes, status indicators, and animated flowing edges.
- **Multi-Source Connectors**: Queries web search, RemoteOK jobs, Hacker News Algolia, or local offline fixtures.
- **Smart Cleaning & Deduplication**: Normalizes data, trims whitespace, and uses fuzzy matching to remove duplicate entries.
- **Quality Control**: Flags missing fields or rows with confidence below 70% with a `Needs Review` badge.
- **Spring-Physics Results Drawer**: Smooth terminal drawer powered by Framer Motion and TanStack Table with instant column sorting and search.
- **One-Click Export**: Download verified datasets directly as **CSV** or **JSON**.
- **Mission History & Re-Run**: Access past collection tasks from the collapsible left rail and re-run them with fresh data anytime.
- **Ready Out-of-the-Box**: Pre-seeded with demo tasks and an offline search fallback so you can explore immediately without burning API credits.

---

## 🛠️ Tech Stack

| Layer | Tools & Libraries |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Workflow Graph** | `@xyflow/react` (React Flow) with custom node styling |
| **UI Components** | `framer-motion` (Spring Drawer), `@tanstack/react-table` (Data Grid), `zustand` (State Management) |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, SQLite, SQLAlchemy 2.0 |
| **Live Streaming** | Server-Sent Events (SSE) for real-time node status streaming |
| **AI / LLM** | Google Gemini (`gemini-3.8-flash`), OpenAI, Anthropic |
| **Data Quality** | `rapidfuzz` (fuzzy matching), `jsonschema` (output validation) |

---

## 📁 Project Structure

```
loomAI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI server entrypoint & CORS setup
│   │   ├── models.py            # SQLAlchemy database models (Task, Node, Edge, Result)
│   │   ├── db.py                # Database connection & session setup
│   │   ├── schemas.py           # Pydantic validation schemas
│   │   ├── seed.py              # Pre-seeded demo tasks for instant evaluation
│   │   ├── connectors/          # Data sources (Web Search, RemoteOK, HackerNews, Mock)
│   │   ├── workflow/            # Planner (LLM DAG), Executor (Async engine), Nodes (Handlers)
│   │   └── routes/              # REST API endpoints & SSE event stream
│   ├── tests/                   # 13 automated backend unit & integration tests
│   └── requirements.txt         # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CommandBar.tsx   # Top prompt input bar & preset chips
│   │   │   ├── graph/           # React Flow custom nodes & canvas
│   │   │   ├── history/         # Collapsible past missions sidebar
│   │   │   └── results/         # Results table & CSV/JSON export drawer
│   │   ├── store/               # Zustand application store
│   │   ├── lib/                 # API client, SSE hook, and types
│   │   ├── App.tsx              # Main layout
│   │   └── index.css            # Custom terminal styles & animations
│   ├── tailwind.config.js       # Dark control-room theme colors
│   └── package.json             # Frontend dependencies
│
├── docs/                        # Architecture, PRD, and design system guidelines
├── schemas/                     # Strict JSON schemas for workflow validation
├── examples/                    # Sample prompt inputs and expected outputs
├── tutorial_loomAI.mp4          # App tutorial and walkthrough video
└── README.md
```

---

## 🚀 Getting Started

### 1. Environment Setup

Create a `.env` file in the root directory:

```powershell
cp .env.example .env
```

Add your Google Gemini API key:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Optional: Tavily web search key (uses offline mock search if omitted)
SEARCH_API_KEY=
```

---

### 2. Run the Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Backend will run at: `http://127.0.0.1:8000`  
Swagger API Docs: `http://127.0.0.1:8000/docs`

---

### 3. Run the Frontend

In a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```
Open your browser at: `http://localhost:5173`

---

## 🧪 Testing

Run backend tests:
```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Build frontend for production:
```powershell
cd frontend
npm run build
```

---

## 📄 License

MIT
