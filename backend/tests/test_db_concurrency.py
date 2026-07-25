import threading
import time

from app import db


def test_concurrent_writers_do_not_raise_database_locked(media_root):
    """Reproduces the shape of the bug reported on Unraid: one connection
    holding a write transaction open (a library scan committing lots of
    rows) while another connection tries to write at the same time (a
    second POST /api/libraries). Without WAL + a generous busy_timeout,
    SQLite raises `database is locked` instead of waiting.
    """
    errors: list[Exception] = []

    def writer(n: int) -> None:
        try:
            conn = db.get_conn()
            conn.execute("BEGIN IMMEDIATE")
            time.sleep(0.3)
            conn.execute(
                "INSERT INTO libraries (id, name, path) VALUES (?, ?, ?)",
                (f"lib-{n}", f"Lib {n}", str(media_root)),
            )
            conn.commit()
        except Exception as exc:  # noqa: BLE001 - captured for the assertion below
            errors.append(exc)

    threads = [threading.Thread(target=writer, args=(i,)) for i in range(6)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert errors == [], f"Unexpected errors under concurrent writes: {errors}"

    conn = db.get_conn()
    count = conn.execute("SELECT COUNT(*) AS n FROM libraries").fetchone()["n"]
    assert count == 6


def test_journal_mode_is_wal(media_root):
    conn = db.get_conn()
    mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
    assert mode.lower() == "wal"
