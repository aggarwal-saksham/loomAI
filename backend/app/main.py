from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from dotenv import load_dotenv

from .db import init_db
from .routes.tasks import router as tasks_router


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="loomAI", lifespan=lifespan)
app.include_router(tasks_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
