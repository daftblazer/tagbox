import os
import sqlite3

from . import covers, db, tagio
from .models import (
    AlbumDetailOut,
    AlbumOut,
    AlbumUpdateIn,
    ArtistOut,
    FolderAlbum,
    FolderArtist,
    LibraryOut,
    TrackOut,
)

GENRE_SEP = "\x1f"


def list_libraries() -> list[LibraryOut]:
    conn = db.get_conn()
    rows = conn.execute(
        """
        SELECT l.id, l.name, l.path,
          (SELECT COUNT(*) FROM artists a WHERE a.library_id=l.id) AS artist_count,
          (SELECT COUNT(*) FROM albums al WHERE al.library_id=l.id) AS album_count
        FROM libraries l ORDER BY l.name COLLATE NOCASE
        """
    ).fetchall()
    return [
        LibraryOut(id=r["id"], name=r["name"], path=r["path"], artist_count=r["artist_count"], album_count=r["album_count"])
        for r in rows
    ]


def list_artist_names(library_id: str) -> list[str]:
    """Distinct artist-name-like strings already used in this library (folder
    artist names + album_artist tags), deduped case-insensitively so e.g.
    "Boards of Canada" and "boards of canada" collapse into one suggestion.
    """
    conn = db.get_conn()
    rows = conn.execute(
        """
        SELECT name AS n FROM artists WHERE library_id = ?
        UNION ALL
        SELECT album_artist AS n FROM albums WHERE library_id = ? AND album_artist IS NOT NULL AND album_artist != ''
        """,
        (library_id, library_id),
    ).fetchall()

    variant_counts: dict[str, dict[str, int]] = {}
    for r in rows:
        name = (r["n"] or "").strip()
        if not name:
            continue
        key = name.casefold()
        bucket = variant_counts.setdefault(key, {})
        bucket[name] = bucket.get(name, 0) + 1

    canonical = [max(variants.items(), key=lambda kv: (kv[1], kv[0]))[0] for variants in variant_counts.values()]
    canonical.sort(key=str.casefold)
    return canonical


def list_artists(library_id: str, search: str | None = None) -> list[ArtistOut]:
    conn = db.get_conn()
    sql = """
        SELECT a.id, a.name,
          (SELECT COUNT(*) FROM albums al WHERE al.artist_id=a.id) AS album_count,
          (SELECT al.cover_hash FROM albums al WHERE al.artist_id=a.id AND al.cover_hash IS NOT NULL
             ORDER BY al.title COLLATE NOCASE LIMIT 1) AS cover_id
        FROM artists a
        WHERE a.library_id = ?
    """
    params: list = [library_id]
    if search:
        sql += " AND a.name LIKE ?"
        params.append(f"%{search}%")
    sql += " ORDER BY a.name COLLATE NOCASE"
    rows = conn.execute(sql, params).fetchall()
    return [ArtistOut(id=r["id"], name=r["name"], album_count=r["album_count"], cover_id=r["cover_id"]) for r in rows]


def list_albums(library_id: str, artist_id: str | None = None, search: str | None = None) -> list[AlbumOut]:
    conn = db.get_conn()
    sql = """
        SELECT al.id, al.title, al.artist_id, ar.name AS artist_name, al.album_artist, al.year,
               al.compilation, al.cover_hash,
               (SELECT COUNT(*) FROM tracks t WHERE t.album_id = al.id) AS track_count,
               (SELECT GROUP_CONCAT(genre, ?) FROM album_genres g WHERE g.album_id = al.id) AS genres_raw
        FROM albums al JOIN artists ar ON ar.id = al.artist_id
        WHERE al.library_id = ?
    """
    params: list = [GENRE_SEP, library_id]
    if artist_id:
        sql += " AND al.artist_id = ?"
        params.append(artist_id)
    if search:
        sql += " AND (al.title LIKE ? OR ar.name LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%"])
    sql += " ORDER BY ar.name COLLATE NOCASE, al.year, al.title COLLATE NOCASE"
    rows = conn.execute(sql, params).fetchall()
    return [_row_to_album_out(r) for r in rows]


def _row_to_album_out(r: sqlite3.Row) -> AlbumOut:
    genres = r["genres_raw"].split(GENRE_SEP) if r["genres_raw"] else []
    return AlbumOut(
        id=r["id"],
        title=r["title"],
        artist_id=r["artist_id"],
        artist=r["artist_name"],
        album_artist=r["album_artist"] or "",
        year=r["year"] or "",
        genres=genres,
        compilation=bool(r["compilation"]),
        track_count=r["track_count"],
        cover_id=r["cover_hash"],
    )


def get_album_detail(album_id: str) -> AlbumDetailOut | None:
    conn = db.get_conn()
    r = conn.execute(
        """
        SELECT al.*, ar.name AS artist_name,
               (SELECT GROUP_CONCAT(genre, ?) FROM album_genres g WHERE g.album_id = al.id) AS genres_raw
        FROM albums al JOIN artists ar ON ar.id = al.artist_id
        WHERE al.id = ?
        """,
        (GENRE_SEP, album_id),
    ).fetchone()
    if not r:
        return None
    genres = r["genres_raw"].split(GENRE_SEP) if r["genres_raw"] else []
    track_rows = conn.execute(
        "SELECT id, disc_num, track_num, title, filename FROM tracks WHERE album_id=? ORDER BY disc_num, track_num, filename",
        (album_id,),
    ).fetchall()
    tracks = [TrackOut(id=t["id"], disc_num=t["disc_num"], track_num=t["track_num"], title=t["title"], filename=t["filename"]) for t in track_rows]
    return AlbumDetailOut(
        id=r["id"],
        title=r["title"],
        artist_id=r["artist_id"],
        artist=r["artist_name"],
        album_artist=r["album_artist"] or "",
        year=r["year"] or "",
        genres=genres,
        compilation=bool(r["compilation"]),
        track_count=len(tracks),
        cover_id=r["cover_hash"],
        comments=r["comments"] or "",
        relpath=r["relpath"],
        tracks=tracks,
    )


def get_folders(library_id: str) -> list[FolderArtist]:
    conn = db.get_conn()
    artists = conn.execute(
        "SELECT id, name FROM artists WHERE library_id=? ORDER BY name COLLATE NOCASE", (library_id,)
    ).fetchall()
    result = []
    for a in artists:
        albums = conn.execute(
            """
            SELECT al.id, al.title, (SELECT COUNT(*) FROM tracks t WHERE t.album_id=al.id) AS track_count
            FROM albums al WHERE al.artist_id=? ORDER BY al.year, al.title COLLATE NOCASE
            """,
            (a["id"],),
        ).fetchall()
        result.append(
            FolderArtist(
                id=a["id"],
                name=a["name"],
                albums=[FolderAlbum(id=al["id"], title=al["title"], track_count=al["track_count"]) for al in albums],
            )
        )
    return result


def search_library(library_id: str, q: str) -> dict:
    return {
        "artists": [a.model_dump() for a in list_artists(library_id, search=q)],
        "albums": [al.model_dump() for al in list_albums(library_id, search=q)],
    }


def _album_file_context(conn, album_id: str):
    row = conn.execute(
        """
        SELECT al.id, al.artist_id, al.relpath, lib.path AS library_path
        FROM albums al JOIN libraries lib ON lib.id = al.library_id
        WHERE al.id = ?
        """,
        (album_id,),
    ).fetchone()
    if not row:
        return None, []
    tracks = conn.execute(
        "SELECT id, relpath, title, disc_num, track_num FROM tracks WHERE album_id=? ORDER BY disc_num, track_num", (album_id,)
    ).fetchall()
    return row, tracks


def update_album(album_id: str, patch: AlbumUpdateIn) -> AlbumDetailOut | None:
    conn = db.get_conn()
    album, tracks = _album_file_context(conn, album_id)
    if not album:
        return None

    track_patch_map = {t.id: t for t in (patch.tracks or [])}
    for t in tracks:
        track_patch = track_patch_map.get(t["id"])
        if track_patch is None:
            continue
        abspath = os.path.join(album["library_path"], t["relpath"])
        title_changed = track_patch.title != t["title"]
        disc_changed = track_patch.disc_num != t["disc_num"]
        track_num_changed = track_patch.track_num != t["track_num"]

        if title_changed:
            tagio.write_track_title(abspath, track_patch.title)
        if disc_changed or track_num_changed:
            tagio.write_track_position(
                abspath,
                disc_num=track_patch.disc_num if disc_changed else None,
                track_num=track_patch.track_num if track_num_changed else None,
            )
        if title_changed or disc_changed or track_num_changed:
            conn.execute(
                "UPDATE tracks SET title=?, disc_num=?, track_num=? WHERE id=?",
                (track_patch.title, track_patch.disc_num, track_patch.track_num, t["id"]),
            )

    album_level_changed = any(v is not None for v in (patch.title, patch.album_artist, patch.artist, patch.year, patch.genres, patch.comments))
    if album_level_changed:
        for t in tracks:
            abspath = os.path.join(album["library_path"], t["relpath"])
            tagio.write_album_fields(
                abspath,
                album=patch.title,
                album_artist=patch.album_artist,
                artist=patch.artist,
                year=patch.year,
                genres=patch.genres,
                comment=patch.comments,
            )

    set_clauses = []
    values: list = []
    if patch.title is not None:
        set_clauses.append("title=?")
        values.append(patch.title)
    if patch.album_artist is not None:
        set_clauses.append("album_artist=?")
        values.append(patch.album_artist)
    if patch.year is not None:
        set_clauses.append("year=?")
        values.append(patch.year)
    if patch.compilation is not None:
        set_clauses.append("compilation=?")
        values.append(int(patch.compilation))
    if patch.comments is not None:
        set_clauses.append("comments=?")
        values.append(patch.comments)
    if set_clauses:
        values.append(album_id)
        conn.execute(f"UPDATE albums SET {', '.join(set_clauses)} WHERE id=?", values)

    if patch.genres is not None:
        conn.execute("DELETE FROM album_genres WHERE album_id=?", (album_id,))
        for g in patch.genres:
            conn.execute("INSERT OR IGNORE INTO album_genres (album_id, genre) VALUES (?, ?)", (album_id, g))

    conn.commit()
    return get_album_detail(album_id)


def bulk_update_albums(ids: list[str], *, album_artist: str | None, comments: str | None, add_genres: list[str] | None) -> list[AlbumDetailOut]:
    results = []
    for album_id in ids:
        conn = db.get_conn()
        existing = get_album_detail(album_id)
        if not existing:
            continue
        merged_genres = None
        if add_genres:
            merged_genres = list(dict.fromkeys([*existing.genres, *add_genres]))
        patch = AlbumUpdateIn(
            album_artist=album_artist if album_artist else None,
            comments=comments if comments else None,
            genres=merged_genres,
        )
        updated = update_album(album_id, patch)
        if updated:
            results.append(updated)
    return results


def set_album_cover(album_id: str, data: bytes, mime: str) -> AlbumDetailOut | None:
    conn = db.get_conn()
    album, tracks = _album_file_context(conn, album_id)
    if not album:
        return None
    for t in tracks:
        abspath = os.path.join(album["library_path"], t["relpath"])
        tagio.write_cover(abspath, data, mime)
    cover_hash = covers.store_cover(data, mime)
    conn.execute("UPDATE albums SET cover_hash=? WHERE id=?", (cover_hash, album_id))
    conn.commit()
    return get_album_detail(album_id)
