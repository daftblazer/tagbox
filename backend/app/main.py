import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config, db, scanner
from .routers import albums, covers, libraries

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tagbox")

app = FastAPI(title="Tagbox")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(libraries.router)
app.include_router(albums.router)
app.include_router(covers.router)


@app.on_event("startup")
def startup() -> None:
    config.ensure_data_dirs()
    db.init_db()
    try:
        libs = config.load_libraries()
    except Exception as exc:
        logger.warning("Skipping initial scan: %s", exc)
        return
    for lib in libs:
        logger.info("Scanning library '%s' (%s)...", lib.name, lib.path)
        try:
            scanner.scan_library(lib)
        except Exception:
            logger.exception("Failed to scan library '%s'", lib.id)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# In the container image, the built frontend is copied to /app/frontend_dist.
# In local dev that directory won't exist, and the Vite dev server is used instead.
_FRONTEND_DIST = os.environ.get("TAGBOX_FRONTEND_DIST", "/app/frontend_dist")
if os.path.isdir(_FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="frontend")
