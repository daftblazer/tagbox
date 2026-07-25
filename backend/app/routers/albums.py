from fastapi import APIRouter, HTTPException, UploadFile

from .. import repo
from ..models import AlbumDetailOut, AlbumUpdateIn, BulkUpdateIn

router = APIRouter(prefix="/api/albums", tags=["albums"])

ALLOWED_COVER_MIME = {"image/jpeg", "image/png", "image/gif", "image/webp"}


@router.get("/{album_id}", response_model=AlbumDetailOut)
def get_album(album_id: str) -> AlbumDetailOut:
    album = repo.get_album_detail(album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album


@router.patch("/{album_id}", response_model=AlbumDetailOut)
def patch_album(album_id: str, patch: AlbumUpdateIn) -> AlbumDetailOut:
    updated = repo.update_album(album_id, patch)
    if not updated:
        raise HTTPException(status_code=404, detail="Album not found")
    return updated


@router.post("/{album_id}/cover", response_model=AlbumDetailOut)
async def upload_cover(album_id: str, file: UploadFile) -> AlbumDetailOut:
    if file.content_type not in ALLOWED_COVER_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {file.content_type}")
    data = await file.read()
    updated = repo.set_album_cover(album_id, data, file.content_type)
    if not updated:
        raise HTTPException(status_code=404, detail="Album not found")
    return updated


@router.post("/bulk", response_model=list[AlbumDetailOut])
def bulk_update(patch: BulkUpdateIn) -> list[AlbumDetailOut]:
    return repo.bulk_update_albums(
        patch.ids, album_artist=patch.album_artist, comments=patch.comments, add_genres=patch.add_genres
    )


@router.post("/bulk/cover", response_model=list[AlbumDetailOut])
async def bulk_upload_cover(ids: str, file: UploadFile) -> list[AlbumDetailOut]:
    """`ids` is a comma-separated list of album ids (form field, not JSON body)."""
    if file.content_type not in ALLOWED_COVER_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {file.content_type}")
    data = await file.read()
    id_list = [i for i in ids.split(",") if i]
    results = []
    for album_id in id_list:
        updated = repo.set_album_cover(album_id, data, file.content_type)
        if updated:
            results.append(updated)
    return results
