import logging
import os
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import config, db, repo, scanner
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
    # Scanning runs in a background thread rather than inline here: this
    # function blocks uvicorn from accepting connections until it returns, so
    # scanning synchronously on startup means the whole UI is unreachable
    # (looks like the app is broken/hung) until every library finishes.
    threading.Thread(target=_scan_all_libraries, daemon=True).start()


def _scan_all_libraries() -> None:
    if not os.path.isdir(config.MEDIA_ROOT):
        logger.warning(
            "Media root '%s' does not exist — mount it (TAGBOX_MEDIA_ROOT) so libraries can be added from the UI.",
            config.MEDIA_ROOT,
        )
        return
    for lib in repo.list_library_configs():
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
