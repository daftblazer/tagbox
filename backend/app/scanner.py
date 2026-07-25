"""Walks a library's folders (Artist/Album/*.ext) and syncs the DB from disk.

Folder structure is the source of truth for grouping (matches how the
libraries are actually organized on disk, including non-MusicBrainz VGM
rips); tags are the source of truth for the metadata shown/edited per album.
"""

import os

from . import covers, db, tagio
from .config import LibraryConfig


def scan_library(lib: LibraryConfig) -> None:
    conn = db.get_conn()
    conn.execute(
        """
        INSERT INTO libraries (id, name, path, last_scanned) VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, path=excluded.path, last_scanned=excluded.last_scanned
        """,
        (lib.id, lib.name, lib.path),
    )

    seen_artist_ids: set[str] = set()
    seen_album_ids: set[str] = set()

    for artist_name in sorted(_list_dirs(lib.path)):
        artist_relpath = artist_name
        artist_id = db.stable_id(lib.id, artist_relpath)
        artist_dir = os.path.join(lib.path, artist_name)

        # Upsert the artist row first so album inserts below can satisfy their FK;
        # it's pruned afterwards if it turns out to have no albums.
        conn.execute(
            """
            INSERT INTO artists (id, library_id, name, relpath) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name
            """,
            (artist_id, lib.id, artist_name, artist_relpath),
        )

        album_ids_for_artist: list[str] = []
        for album_name in sorted(_list_dirs(artist_dir)):
            album_relpath = os.path.join(artist_relpath, album_name)
            album_dir = os.path.join(lib.path, album_relpath)
            audio_files = sorted(_walk_audio_files(album_dir))
            if not audio_files:
                continue

            album_id = _sync_album(conn, lib, artist_id, album_relpath, audio_files)
            album_ids_for_artist.append(album_id)

        if album_ids_for_artist:
            seen_artist_ids.add(artist_id)
            seen_album_ids.update(album_ids_for_artist)

    _prune(conn, "albums", lib.id, seen_album_ids)
    _prune(conn, "artists", lib.id, seen_artist_ids)
    conn.commit()


def _sync_album(conn, lib: LibraryConfig, artist_id: str, album_relpath: str, audio_files: list[str]) -> str:
    album_id = db.stable_id(lib.id, album_relpath)
    tags_by_file = {fp: tagio.read_tags(fp) for fp in audio_files}

    album_title = _majority([t.album for t in tags_by_file.values() if t.album]) or os.path.basename(album_relpath)
    fallback_artist = os.path.basename(os.path.dirname(album_relpath))
    album_artist = _majority([t.album_artist for t in tags_by_file.values() if t.album_artist]) or fallback_artist
    year = _majority([t.year for t in tags_by_file.values() if t.year]) or ""
    distinct_artists = {t.artist for t in tags_by_file.values() if t.artist}
    compilation = len(distinct_artists) > 1
    comment = next((t.comment for t in tags_by_file.values() if t.comment), "")

    genres: list[str] = []
    for t in tags_by_file.values():
        for g in t.genres:
            if g not in genres:
                genres.append(g)

    cover_hash = None
    for fp in audio_files:
        cov = tagio.read_cover(fp)
        if cov:
            mime, data = cov
            cover_hash = covers.store_cover(data, mime)
            break

    conn.execute(
        """
        INSERT INTO albums (id, artist_id, library_id, title, album_artist, year, compilation, comments, relpath, cover_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            title=excluded.title, album_artist=excluded.album_artist, year=excluded.year,
            compilation=excluded.compilation, comments=excluded.comments,
            cover_hash=COALESCE(excluded.cover_hash, albums.cover_hash)
        """,
        (album_id, artist_id, lib.id, album_title, album_artist, year, int(compilation), comment, album_relpath, cover_hash),
    )

    conn.execute("DELETE FROM album_genres WHERE album_id=?", (album_id,))
    for g in genres:
        conn.execute("INSERT OR IGNORE INTO album_genres (album_id, genre) VALUES (?, ?)", (album_id, g))

    existing_track_ids = set()
    for fp in audio_files:
        relpath = os.path.relpath(fp, lib.path)
        track_id = db.stable_id(lib.id, relpath)
        existing_track_ids.add(track_id)
        t = tags_by_file[fp]
        title = t.title or os.path.splitext(os.path.basename(fp))[0]
        conn.execute(
            """
            INSERT INTO tracks (id, album_id, disc_num, track_num, title, filename, relpath)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                disc_num=excluded.disc_num, track_num=excluded.track_num,
                title=excluded.title, filename=excluded.filename
            """,
            (track_id, album_id, t.disc_num, t.track_num, title, os.path.basename(fp), relpath),
        )

    if existing_track_ids:
        placeholders = ",".join("?" * len(existing_track_ids))
        conn.execute(
            f"DELETE FROM tracks WHERE album_id=? AND id NOT IN ({placeholders})",
            (album_id, *existing_track_ids),
        )
    else:
        conn.execute("DELETE FROM tracks WHERE album_id=?", (album_id,))

    return album_id


def _prune(conn, table: str, library_id: str, keep_ids: set[str]) -> None:
    if keep_ids:
        placeholders = ",".join("?" * len(keep_ids))
        conn.execute(
            f"DELETE FROM {table} WHERE library_id=? AND id NOT IN ({placeholders})",
            (library_id, *keep_ids),
        )
    else:
        conn.execute(f"DELETE FROM {table} WHERE library_id=?", (library_id,))


def _list_dirs(path: str) -> list[str]:
    try:
        return [e.name for e in os.scandir(path) if e.is_dir(follow_symlinks=True) and not e.name.startswith(".")]
    except FileNotFoundError:
        return []


def _walk_audio_files(path: str) -> list[str]:
    result = []
    for dirpath, dirnames, filenames in os.walk(path):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in filenames:
            if tagio.is_audio_file(fn):
                result.append(os.path.join(dirpath, fn))
    return result


def _majority(values: list[str]) -> str | None:
    if not values:
        return None
    counts: dict[str, int] = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    return max(counts.items(), key=lambda kv: kv[1])[0]
