# app/main.py

from fastapi import FastAPI
from app.api.v1.endpoints import images, polygons, analytics
from app.db import engine, Base
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from starlette.responses import HTMLResponse
import asyncio
from app.websockets import manager

load_dotenv()

# Access the environment variables
ROOT_URL_BACKEND = os.getenv('ROOT_URL_BACKEND')

# Set root path
app = FastAPI(root_path=ROOT_URL_BACKEND)

allowed_origins = [
    "https://genexis.gov.sg",
    "http://localhost:3001",  # Only for development
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(polygons.router, prefix="/api/v1/polygons", tags=["polygons"])
app.include_router(images.router, prefix="/api/v1/images", tags=["images"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])

@app.get("/", response_class=HTMLResponse)
async def index():
    # Index page with HTML
    return """
        <html> 
            <body>
                <h1>Welcome to Block Finder</h1>
            </body>
        </html>
    """

@app.on_event("startup")
async def startup_event():
    # Set the event loop in the manager
    manager.loop = asyncio.get_event_loop()
