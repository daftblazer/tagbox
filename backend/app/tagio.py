"""Read/write common audio tags and embedded cover art across formats.

Text tags (title/artist/album/albumartist/date/genre/discnumber/tracknumber/comment)
go through mutagen's format-agnostic "easy" interface, which maps to the same
key names for MP3 (EasyID3), FLAC, Ogg Vorbis/Opus and MP4 (EasyMP4).

Cover art has no common interface in mutagen, so it's handled per-format below.
"""

import base64
import os
from dataclasses import dataclass, field

import mutagen
from mutagen.easyid3 import EasyID3
from mutagen.flac import FLAC, Picture
from mutagen.id3 import ID3, APIC, COMM, ID3NoHeaderError
from mutagen.mp4 import MP4, MP4Cover

AUDIO_EXTENSIONS = {".mp3", ".flac", ".m4a", ".mp4", ".m4b", ".ogg", ".oga", ".opus"}


def _comment_get(id3: ID3, _key: str) -> list[str]:
    return [c.text[0] for c in id3.getall("COMM") if c.text]


def _comment_set(id3: ID3, _key: str, value: list[str]) -> None:
    id3.delall("COMM")
    id3.add(COMM(encoding=3, lang="eng", desc="", text=value))


def _comment_delete(id3: ID3, _key: str) -> None:
    id3.delall("COMM")


# EasyID3 doesn't map "comment" to an ID3 frame out of the box; register it so
# our generic easy-tags read/write path works uniformly for MP3 files too.
EasyID3.RegisterKey("comment", _comment_get, _comment_set, _comment_delete)


def is_audio_file(path: str) -> bool:
    return os.path.splitext(path)[1].lower() in AUDIO_EXTENSIONS


@dataclass
class TrackTags:
    title: str = ""
    artist: str = ""
    album: str = ""
    album_artist: str = ""
    year: str = ""
    genres: list[str] = field(default_factory=list)
    comment: str = ""
    disc_num: int = 1
    track_num: int = 0


def _first(easy, key: str, default: str = "") -> str:
    vals = easy.get(key)
    return vals[0] if vals else default


def _parse_leading_int(s: str, default: int = 0) -> int:
    if not s:
        return default
    digits = ""
    for ch in s:
        if ch.isdigit():
            digits += ch
        else:
            break
    return int(digits) if digits else default


def read_tags(path: str) -> TrackTags:
    try:
        easy = mutagen.File(path, easy=True)
    except Exception:
        easy = None
    if easy is None:
        return TrackTags()
    return TrackTags(
        title=_first(easy, "title"),
        artist=_first(easy, "artist"),
        album=_first(easy, "album"),
        album_artist=_first(easy, "albumartist", _first(easy, "artist")),
        year=_first(easy, "date")[:4],
        genres=list(easy.get("genre", [])),
        comment=_first(easy, "comment"),
        disc_num=_parse_leading_int(_first(easy, "discnumber"), 1) or 1,
        track_num=_parse_leading_int(_first(easy, "tracknumber"), 0),
    )


def write_track_title(path: str, title: str) -> None:
    easy = mutagen.File(path, easy=True)
    if easy is None:
        return
    easy["title"] = [title]
    easy.save()


def write_track_position(path: str, *, disc_num: int | None = None, track_num: int | None = None) -> None:
    easy = mutagen.File(path, easy=True)
    if easy is None:
        return
    if disc_num is not None:
        easy["discnumber"] = [str(disc_num)]
    if track_num is not None:
        easy["tracknumber"] = [str(track_num)]
    easy.save()


def write_album_fields(
    path: str,
    *,
    album: str | None = None,
    album_artist: str | None = None,
    artist: str | None = None,
    year: str | None = None,
    genres: list[str] | None = None,
    comment: str | None = None,
) -> None:
    easy = mutagen.File(path, easy=True)
    if easy is None:
        return
    if album is not None:
        easy["album"] = [album]
    if album_artist is not None:
        easy["albumartist"] = [album_artist]
    if artist is not None:
        easy["artist"] = [artist]
    if year is not None:
        easy["date"] = [year]
    if genres is not None:
        easy["genre"] = list(genres)
    if comment is not None:
        easy["comment"] = [comment]
    easy.save()


# ---- Cover art -------------------------------------------------------

def read_cover(path: str) -> tuple[str, bytes] | None:
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".mp3":
            return _mp3_cover_read(path)
        if ext == ".flac":
            return _flac_cover_read(path)
        if ext in (".m4a", ".mp4", ".m4b"):
            return _mp4_cover_read(path)
        if ext in (".ogg", ".oga", ".opus"):
            return _ogg_cover_read(path)
    except Exception:
        return None
    return None


def write_cover(path: str, data: bytes, mime: str) -> bool:
    """Embed cover art into a single file. Returns False if unsupported."""
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext == ".mp3":
            _mp3_cover_write(path, data, mime)
        elif ext == ".flac":
            _flac_cover_write(path, data, mime)
        elif ext in (".m4a", ".mp4", ".m4b"):
            _mp4_cover_write(path, data, mime)
        elif ext in (".ogg", ".oga", ".opus"):
            _ogg_cover_write(path, data, mime)
        else:
            return False
    except Exception:
        return False
    return True


def _mp3_cover_read(path: str) -> tuple[str, bytes] | None:
    try:
        id3 = ID3(path)
    except ID3NoHeaderError:
        return None
    apics = id3.getall("APIC")
    if not apics:
        return None
    pic = apics[0]
    return pic.mime, bytes(pic.data)


def _mp3_cover_write(path: str, data: bytes, mime: str) -> None:
    try:
        id3 = ID3(path)
    except ID3NoHeaderError:
        id3 = ID3()
    id3.delall("APIC")
    id3.add(APIC(encoding=3, mime=mime, type=3, desc="Cover", data=data))
    id3.save(path)


def _flac_cover_read(path: str) -> tuple[str, bytes] | None:
    f = FLAC(path)
    if not f.pictures:
        return None
    pic = f.pictures[0]
    return pic.mime, pic.data


def _flac_cover_write(path: str, data: bytes, mime: str) -> None:
    f = FLAC(path)
    f.clear_pictures()
    pic = Picture()
    pic.type = 3
    pic.mime = mime
    pic.data = data
    f.add_picture(pic)
    f.save()


def _mp4_cover_read(path: str) -> tuple[str, bytes] | None:
    f = MP4(path)
    if f.tags is None:
        return None
    covr = f.tags.get("covr")
    if not covr:
        return None
    cover = covr[0]
    mime = "image/png" if getattr(cover, "imageformat", None) == MP4Cover.FORMAT_PNG else "image/jpeg"
    return mime, bytes(cover)


def _mp4_cover_write(path: str, data: bytes, mime: str) -> None:
    f = MP4(path)
    if f.tags is None:
        f.add_tags()
    fmt = MP4Cover.FORMAT_PNG if mime == "image/png" else MP4Cover.FORMAT_JPEG
    f.tags["covr"] = [MP4Cover(data, imageformat=fmt)]
    f.save()


def _ogg_cover_read(path: str) -> tuple[str, bytes] | None:
    f = mutagen.File(path)
    if f is None:
        return None
    raw = f.get("metadata_block_picture")
    if not raw:
        return None
    pic = Picture(base64.b64decode(raw[0]))
    return pic.mime, pic.data


def _ogg_cover_write(path: str, data: bytes, mime: str) -> None:
    f = mutagen.File(path)
    if f is None:
        raise ValueError(f"Unsupported ogg variant: {path}")
    pic = Picture()
    pic.type = 3
    pic.mime = mime
    pic.data = data
    encoded = base64.b64encode(pic.write()).decode("ascii")
    f["metadata_block_picture"] = [encoded]
    f.save()
