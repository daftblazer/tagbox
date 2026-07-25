"""Finds and fixes "loose" audio files: singles that sit directly in an
artist folder instead of their own album folder, which the scanner
otherwise silently ignores (it only looks one level deeper, at Artist/Album).
"""

import os
import re
import shutil
from dataclasses import dataclass

from . import tagio
from .config import LibraryConfig
from .scanner import _list_dirs

_INVALID_CHARS = re.compile(r'[\/\\:*?"<>|\x00-\x1f]')


def sanitize_folder_name(name: str) -> str:
    cleaned = _INVALID_CHARS.sub("", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.rstrip(" .")
    return cleaned or "Untitled"


@dataclass
class LooseFile:
    relpath: str
    artist_name: str
    filename: str
    suggested_folder: str


def find_loose_files(lib: LibraryConfig) -> list[LooseFile]:
    results: list[LooseFile] = []
    for artist_name in sorted(_list_dirs(lib.path)):
        artist_dir = os.path.join(lib.path, artist_name)
        try:
            entries = sorted(os.scandir(artist_dir), key=lambda e: e.name)
        except FileNotFoundError:
            continue
        for entry in entries:
            if not entry.is_file() or not tagio.is_audio_file(entry.name):
                continue
            tags = tagio.read_tags(entry.path)
            title = tags.title or os.path.splitext(entry.name)[0]
            results.append(
                LooseFile(
                    relpath=os.path.relpath(entry.path, lib.path),
                    artist_name=artist_name,
                    filename=entry.name,
                    suggested_folder=sanitize_folder_name(title),
                )
            )
    return results


def _unique_dir(path: str) -> str:
    if not os.path.exists(path):
        return path
    n = 2
    while True:
        candidate = f"{path} ({n})"
        if not os.path.exists(candidate):
            return candidate
        n += 1


def organize_loose_files(lib: LibraryConfig, relpaths: list[str]) -> tuple[list[str], list[str]]:
    """Moves each given loose file into a new sibling folder named after its
    title tag. Returns (organized, skipped) relpaths — a file is skipped if
    it no longer exists or isn't actually a loose file (safety check against
    a stale relpath from the client, e.g. path traversal or a rescan race).
    """
    organized: list[str] = []
    skipped: list[str] = []

    for relpath in relpaths:
        abspath = os.path.normpath(os.path.join(lib.path, relpath))
        if not abspath.startswith(os.path.normpath(lib.path) + os.sep):
            skipped.append(relpath)
            continue
        artist_dir = os.path.dirname(abspath)
        is_direct_child_of_artist_dir = os.path.dirname(artist_dir) == os.path.normpath(lib.path)
        if not (os.path.isfile(abspath) and is_direct_child_of_artist_dir and tagio.is_audio_file(abspath)):
            skipped.append(relpath)
            continue

        tags = tagio.read_tags(abspath)
        title = tags.title or os.path.splitext(os.path.basename(abspath))[0]
        target_dir = _unique_dir(os.path.join(artist_dir, sanitize_folder_name(title)))
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, os.path.basename(abspath))
        shutil.move(abspath, target_path)
        # A loose file becomes a single-track "album" named after itself, so
        # give it a matching album tag rather than leaving the old one (often
        # blank, or the artist's actual album name it doesn't belong to).
        tagio.write_album_fields(target_path, album=title)
        organized.append(relpath)

    return organized, skipped
