"""On-disk cache of cover art extracted from / uploaded for albums.

Files are stored as ``<sha1-of-bytes>.<ext>`` under config.COVERS_DIR. That
filename is what we hand out as an album's `cover_hash` / cover URL, so a
given image is only ever stored once and the URL changes whenever the image
does (good for browser caching).
"""

import hashlib
import os

from . import config

MIME_TO_EXT = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}
EXT_TO_MIME = {ext: mime for mime, ext in reversed(MIME_TO_EXT.items())}


def store_cover(data: bytes, mime: str) -> str:
    ext = MIME_TO_EXT.get(mime.lower(), "jpg")
    digest = hashlib.sha1(data).hexdigest()
    filename = f"{digest}.{ext}"
    path = os.path.join(config.COVERS_DIR, filename)
    if not os.path.exists(path):
        os.makedirs(config.COVERS_DIR, exist_ok=True)
        with open(path, "wb") as f:
            f.write(data)
    return filename


def cover_path(filename: str) -> str | None:
    if "/" in filename or "\\" in filename or ".." in filename:
        return None
    path = os.path.join(config.COVERS_DIR, filename)
    return path if os.path.isfile(path) else None


def mime_for_filename(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return EXT_TO_MIME.get(ext, "application/octet-stream")
