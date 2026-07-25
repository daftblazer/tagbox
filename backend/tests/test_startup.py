import time

from app import main, repo


def test_startup_does_not_block_on_scanning(media_root, monkeypatch):
    """Regression test: startup() must return almost immediately and let
    uvicorn start accepting connections, even if scanning a library takes a
    long time — that work happens in a background thread instead. Previously
    the whole app was unreachable (looked hung/broken) until every library
    finished its initial scan.
    """
    repo.create_library("Music", "Music")

    def slow_scan(lib):
        time.sleep(2)

    monkeypatch.setattr(main.scanner, "scan_library", slow_scan)

    started = time.monotonic()
    main.startup()
    elapsed = time.monotonic() - started

    assert elapsed < 1, f"startup() blocked for {elapsed:.2f}s waiting on the scan"
