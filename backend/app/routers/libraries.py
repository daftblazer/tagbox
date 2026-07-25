from fastapi import APIRouter, BackgroundTasks, HTTPException

from .. import config, repo, scanner
from ..models import AlbumOut, ArtistOut, FolderArtist, LibraryOut

router = APIRouter(prefix="/api/libraries", tags=["libraries"])


def _lib_config_or_404(library_id: str) -> config.LibraryConfig:
    for lib in config.load_libraries():
        if lib.id == library_id:
            return lib
    raise HTTPException(status_code=404, detail=f"Unknown library '{library_id}'")


@router.get("", response_model=list[LibraryOut])
def get_libraries() -> list[LibraryOut]:
    return repo.list_libraries()


@router.post("/{library_id}/rescan", status_code=202)
def rescan_library(library_id: str, background_tasks: BackgroundTasks) -> dict:
    lib = _lib_config_or_404(library_id)
    background_tasks.add_task(scanner.scan_library, lib)
    return {"status": "scanning", "library_id": library_id}


@router.get("/{library_id}/artists", response_model=list[ArtistOut])
def get_artists(library_id: str, search: str | None = None) -> list[ArtistOut]:
    return repo.list_artists(library_id, search=search)


@router.get("/{library_id}/albums", response_model=list[AlbumOut])
def get_albums(library_id: str, artist_id: str | None = None, search: str | None = None) -> list[AlbumOut]:
    return repo.list_albums(library_id, artist_id=artist_id, search=search)


@router.get("/{library_id}/artist-names", response_model=list[str])
def get_artist_names(library_id: str) -> list[str]:
    return repo.list_artist_names(library_id)


@router.get("/{library_id}/folders", response_model=list[FolderArtist])
def get_folders(library_id: str) -> list[FolderArtist]:
    return repo.get_folders(library_id)


@router.get("/{library_id}/search")
def search(library_id: str, q: str) -> dict:
    return repo.search_library(library_id, q)
