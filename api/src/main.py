from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routes import auth_router, users_router, calendars_router, events_router, ics_router

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NiftyCaldav API",
    description="Kalender API als laag bovenop Radicale (CalDAV)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3330", "http://NiftyCaldav-frontend:3000", "http://localhost:3000", "http://127.0.0.1:3330"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    allow_origin_regex=r"http://localhost:\d+",
)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(calendars_router)
app.include_router(events_router)
app.include_router(ics_router)


@app.get("/")
async def root():
    return {"message": "NiftyCaldav API is running"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
