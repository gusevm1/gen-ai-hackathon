"""HomeMatch API - FastAPI backend for Flatfox listing analysis.

Provides endpoints for fetching and parsing Flatfox listing data.
Uses httpx.AsyncClient for async HTTP calls to Flatfox public API.
"""

import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(name)s %(levelname)s: %(message)s")
from fastapi.middleware.cors import CORSMiddleware

from app.routers import chat, classifier, geocoding, listings, scoring
from app.services.conversation import conversation_service
from app.services.flatfox import flatfox_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - clean up httpx client on shutdown."""
    # Startup: nothing needed (lazy init)
    yield
    # Shutdown: close httpx clients
    await flatfox_client.close()
    await conversation_service.close()


app = FastAPI(title="HomeMatch API", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(listings.router)
app.include_router(scoring.router)
app.include_router(chat.router)
app.include_router(classifier.router)
app.include_router(geocoding.router)


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "homematch-api"}
