import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config
from .face_db import db
from .face_engine import engine
from .models import HealthResponse
from .routers import analyze, detect, recognize, swap

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
log = logging.getLogger("face_analysis")


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("Starting face_analysis backend")
    engine.load()
    db.load()
    log.info("Ready: %s", engine.health())
    yield
    log.info("Shutting down")


app = FastAPI(title="Face Analysis", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(detect.router, prefix="/api", tags=["detect"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(recognize.router, prefix="/api", tags=["recognize"])
app.include_router(swap.router, prefix="/api", tags=["swap"])


@app.get("/api/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    info = engine.health()
    info["db_count"] = len(db.list_all())
    return HealthResponse(**info)
