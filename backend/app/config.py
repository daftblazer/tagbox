import os
from dataclasses import dataclass

import yaml


@dataclass
class LibraryConfig:
    id: str
    name: str
    path: str


def _default_config_path() -> str:
    env = os.environ.get("TAGBOX_CONFIG")
    if env:
        return env
    # Fall back to a repo-relative path for local dev.
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "..", "..", "config", "libraries.yaml")


def _default_data_dir() -> str:
    env = os.environ.get("TAGBOX_DATA_DIR")
    if env:
        return env
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "..", "..", "data")


CONFIG_PATH = os.path.abspath(_default_config_path())
DATA_DIR = os.path.abspath(_default_data_dir())
DB_PATH = os.path.join(DATA_DIR, "tagbox.db")
COVERS_DIR = os.path.join(DATA_DIR, "covers")


def load_libraries() -> list[LibraryConfig]:
    if not os.path.exists(CONFIG_PATH):
        raise FileNotFoundError(
            f"No library config found at {CONFIG_PATH}. "
            "Copy config/libraries.example.yaml to config/libraries.yaml and edit it."
        )
    with open(CONFIG_PATH, "r") as f:
        raw = yaml.safe_load(f) or {}

    libs = []
    for entry in raw.get("libraries", []):
        lib_id = str(entry["id"])
        path = str(entry["path"])
        if not os.path.isdir(path):
            raise NotADirectoryError(
                f"Library '{lib_id}' points at '{path}', which does not exist or isn't mounted."
            )
        libs.append(LibraryConfig(id=lib_id, name=str(entry.get("name", lib_id)), path=path))

    if not libs:
        raise ValueError(f"No libraries defined in {CONFIG_PATH}")

    return libs


def ensure_data_dirs() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(COVERS_DIR, exist_ok=True)
