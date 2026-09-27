# lunaAI

lunaAI turns a natural-language data request into a visible, executable
collection workflow. It runs permitted connectors, traces every result to its
source, and exports a cleaned dataset.

## Prerequisites

- Python 3.11+
- Node.js 20+

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000`.

## Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite prints the local application URL, normally `http://localhost:5173`.

## Configuration

Copy `.env.example` to `.env` in the repository root. `SEARCH_API_KEY` is
optional: without it, lunaAI uses fixture-backed mock search data so the full
workflow remains runnable. Set either `OPENAI_API_KEY` or
`ANTHROPIC_API_KEY` to enable LLM planning and extraction.

## Development

The implementation checklist lives in `TASKS.md`. Product, architecture, and
design constraints are in `docs/`. Structured planner and extractor output is
validated against the JSON schemas in `schemas/` before persistence.
