"""Lists subdirectories of the media root, for the "Add library" folder picker.

Everything here is scoped to MEDIA_ROOT — callers pass a path *relative* to
it, and every result stays within it, so the picker can never be used to
browse (or register a library at) an arbitrary filesystem location.
"""

import os
from dataclasses import dataclass

from . import config


class PathEscapesMediaRoot(Exception):
    pass


def resolve_under_media_root(relative_path: str) -> str:
    """Resolve a MEDIA_ROOT-relative path to an absolute path, raising if it
    would escape MEDIA_ROOT (via `..`, an absolute path, or a symlink)."""
    root = os.path.realpath(config.MEDIA_ROOT)
    candidate = os.path.realpath(os.path.join(root, relative_path.strip("/\\")))
    if candidate != root and not candidate.startswith(root + os.sep):
        raise PathEscapesMediaRoot(relative_path)
    return candidate


@dataclass
class BrowseEntry:
    name: str
    path: str


@dataclass
class BrowseResult:
    current_path: str
    parent_path: str | None
    entries: list[BrowseEntry]


def browse(relative_path: str = "") -> BrowseResult:
    abs_path = resolve_under_media_root(relative_path)
    if not os.path.isdir(abs_path):
        raise NotADirectoryError(relative_path)

    entries = []
    for e in sorted(os.scandir(abs_path), key=lambda e: e.name.lower()):
        if e.is_dir(follow_symlinks=True) and not e.name.startswith("."):
            rel = os.path.relpath(os.path.join(abs_path, e.name), config.MEDIA_ROOT)
            entries.append(BrowseEntry(name=e.name, path=rel))

    current = os.path.relpath(abs_path, config.MEDIA_ROOT)
    current = "" if current == "." else current
    parent = None if current == "" else (os.path.dirname(current) if os.path.dirname(current) else "")
    return BrowseResult(current_path=current, parent_path=parent, entries=entries)
