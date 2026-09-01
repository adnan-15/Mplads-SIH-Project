from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.alerts import router as alerts_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.anomalies import router as anomalies_router
from backend.app.api.datasets import router as datasets_router
from backend.app.api.preprocessing import router as preprocessing_router
from backend.app.api.projects import router as projects_router
from backend.app.api.risk import router as risk_router
from backend.app.api.routes import router
from backend.app.core.config import settings
from backend.app.db.database import Base, engine
from backend.app.models import (  # noqa: F401
    AnomalyDetectionResult,
    Dataset,
    DatasetProcessingResult,
    Project,
    RiskAssessment,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="MPLADS Sentinel AI API",
    description="Foundation API for the MPLADS Sentinel AI government analytics platform.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(alerts_router)
app.include_router(projects_router)
app.include_router(datasets_router)
app.include_router(analytics_router)
app.include_router(preprocessing_router)
app.include_router(anomalies_router)
app.include_router(risk_router)