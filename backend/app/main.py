from contextlib import asynccontextmanager

from fastapi import FastAPI

from .db import init_db
from .routes.tasks import router as tasks_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="lunaAI", lifespan=lifespan)
app.include_router(tasks_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
