"""FastAPI app. Sin frontend todavia (fase 3+): solo login y el endpoint de analisis."""

from __future__ import annotations

import logging
import shutil
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.auth import router as auth_router
from app.routers.analisis import limiter, router as analisis_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("radiografia")

if shutil.which("pdftotext") is None:
    sys.exit(
        "pdftotext no esta instalado (paquete poppler-utils). "
        "El servidor no puede arrancar sin el."
    )

app = FastAPI(title="Radiografia Financiera")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(analisis_router)
