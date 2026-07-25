import hashlib
import sqlite3
import threading

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS libraries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    last_scanned TEXT
);

CREATE TABLE IF NOT EXISTS artists (
    id TEXT PRIMARY KEY,
    library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    relpath TEXT NOT NULL,
    UNIQUE(library_id, relpath)
);

CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    library_id TEXT NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    album_artist TEXT,
    year TEXT,
    compilation INTEGER NOT NULL DEFAULT 0,
    comments TEXT NOT NULL DEFAULT '',
    relpath TEXT NOT NULL,
    cover_hash TEXT,
    UNIQUE(artist_id, relpath)
);

CREATE TABLE IF NOT EXISTS album_genres (
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    genre TEXT NOT NULL,
    PRIMARY KEY (album_id, genre)
);

CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    album_id TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    disc_num INTEGER NOT NULL DEFAULT 1,
    track_num INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL DEFAULT '',
    filename TEXT NOT NULL,
    relpath TEXT NOT NULL,
    UNIQUE(album_id, relpath)
);

CREATE INDEX IF NOT EXISTS idx_artists_library ON artists(library_id);
CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album_id);
"""

_local = threading.local()


def get_conn() -> sqlite3.Connection:
    conn = getattr(_local, "conn", None)
    if conn is None:
        config.ensure_data_dirs()
        # Each thread gets its own connection (FastAPI runs sync endpoints and
        # background tasks in a thread pool), so concurrent writes — e.g. a
        # library scan committing while another request inserts a new library
        # row — are common, not an edge case. WAL lets readers proceed without
        # blocking on a writer, and a generous busy_timeout makes writer-vs-writer
        # contention retry instead of immediately raising "database is locked".
        conn = sqlite3.connect(config.DB_PATH, check_same_thread=False, timeout=30)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA busy_timeout = 30000")
        _local.conn = conn
    return conn


def init_db() -> None:
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()


def stable_id(*parts: str) -> str:
    digest = hashlib.sha1("::".join(parts).encode("utf-8")).hexdigest()
    return digest[:16]
