from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .database import connect_to_mongo, close_mongo_connection
from .config import settings
from .routes import (
    auth_router,
    components_router,
    transactions_router,
    chat_router,
    dashboard_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()


app = FastAPI(
    title="LogGPT API",
    description="Hardware & IoT Components Room Management System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(components_router, prefix="/api")
app.include_router(transactions_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "LogGPT API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
