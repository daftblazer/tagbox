from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from .. import covers

router = APIRouter(prefix="/api/covers", tags=["covers"])


@router.get("/{filename}")
def get_cover(filename: str) -> FileResponse:
    path = covers.cover_path(filename)
    if not path:
        raise HTTPException(status_code=404, detail="Cover not found")
    return FileResponse(path, media_type=covers.mime_for_filename(filename))
