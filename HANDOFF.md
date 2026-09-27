# loomAI Handoff

## Current state

- GitHub remote: `https://github.com/aggarwal-saksham/loomAI.git` (`main`).
- Product name is `loomAI`.
- Completed checklist sections: **ALL 10 SECTIONS COMPLETE** (0 scaffolding, 1 data layer, 2 planner, 3 connectors, 4 execution engine, 5 remaining endpoints, 6 frontend foundation, 7 graph, 8 results, 9 history, 10 demo readiness).
- Backend: 100% complete with 13 automated tests (`cd backend; .\.venv\Scripts\python.exe -m unittest discover -s tests -v` -> 13 passing).
- Frontend: 100% complete, fully typed TypeScript + Vite + Tailwind CSS + @xyflow/react + TanStack Table + Zustand + Framer Motion (`npm.cmd run build` -> compiles with 0 errors).
- Seeding: 2 realistic demo tasks with complete graphs and verified signals are automatically seeded upon application startup if not present, ensuring the demo works offline / without burning API credits.

## Running the Application

### 1. Backend:
```powershell
cd backend
.\.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000
```
API endpoints and docs available at `http://127.0.0.1:8000/docs`.

### 2. Frontend:
```powershell
cd frontend
npm.cmd run dev
```
Open `http://localhost:5173` to access the loomAI Signal Intelligence Terminal.

## Credentials

- Root `.env` is gitignored. `SEARCH_API_KEY` is present.
- `GEMINI_API_KEY` can be added to enable live generative planning/extraction with `gemini-2.5-flash-lite`.
- When offline or without API keys, mock search fallback and seeded demo tasks provide a full offline end-to-end experience.


