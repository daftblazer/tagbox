import shutil
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _has_ffmpeg() -> bool:
    return shutil.which("ffmpeg") is not None


def _make_track(path: Path, **tags) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    args = ["ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-ar", "44100"]
    for key, value in tags.items():
        args += ["-metadata", f"{key}={value}"]
    args += [str(path), "-loglevel", "error"]
    subprocess.run(args, check=True)


@pytest.fixture()
def library_root(tmp_path, monkeypatch):
    if not _has_ffmpeg():
        pytest.skip("ffmpeg not available to synthesize fixture audio")

    root = tmp_path / "music"
    _make_track(
        root / "Boards of Canada" / "Music Has the Right to Children" / "01 Wildlife Analysis.mp3",
        title="Wildlife Analysis", artist="Boards of Canada", album="Music Has the Right to Children",
        album_artist="Boards of Canada", date="1998", genre="Electronic", track="1", disc="1",
    )
    _make_track(
        root / "Boards of Canada" / "Music Has the Right to Children" / "02 An Eagle in Your Mind.mp3",
        title="An Eagle in Your Mind", artist="Boards of Canada", album="Music Has the Right to Children",
        album_artist="Boards of Canada", date="1998", genre="Electronic", track="2", disc="1",
    )
    _make_track(
        root / "Nils Frahm" / "Spaces" / "01 An Aborted Beginning.flac",
        title="An Aborted Beginning", artist="Nils Frahm", album="Spaces",
        album_artist="Nils Frahm", date="2013", genre="Neo-Classical", track="1", disc="1",
    )

    data_dir = tmp_path / "data"
    monkeypatch.setattr("app.config.DATA_DIR", str(data_dir))
    monkeypatch.setattr("app.config.DB_PATH", str(data_dir / "tagbox.db"))
    monkeypatch.setattr("app.config.COVERS_DIR", str(data_dir / "covers"))

    from app import db as db_module

    db_module._local.__dict__.clear()

    return root


@pytest.fixture()
def db_conn(library_root):
    from app import db as db_module

    db_module.init_db()
    return db_module.get_conn()
