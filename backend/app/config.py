import os
from dataclasses import dataclass


@dataclass
class LibraryConfig:
    id: str
    name: str
    path: str


def _default_media_root() -> str:
    env = os.environ.get("TAGBOX_MEDIA_ROOT")
    if env:
        return env
    # Fall back to the repo-relative dev fixture library for local dev.
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "..", "..", "dev-library")


def _default_data_dir() -> str:
    env = os.environ.get("TAGBOX_DATA_DIR")
    if env:
        return env
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "..", "..", "data")


MEDIA_ROOT = os.path.abspath(_default_media_root())
DATA_DIR = os.path.abspath(_default_data_dir())
DB_PATH = os.path.join(DATA_DIR, "tagbox.db")
COVERS_DIR = os.path.join(DATA_DIR, "covers")


def ensure_data_dirs() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(COVERS_DIR, exist_ok=True)
