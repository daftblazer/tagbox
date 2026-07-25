from pydantic import BaseModel


class LibraryOut(BaseModel):
    id: str
    name: str
    path: str
    artist_count: int
    album_count: int


class ArtistOut(BaseModel):
    id: str
    name: str
    album_count: int
    cover_id: str | None = None


class AlbumOut(BaseModel):
    id: str
    title: str
    artist_id: str
    artist: str
    album_artist: str
    year: str
    genres: list[str]
    compilation: bool
    track_count: int
    cover_id: str | None = None


class TrackOut(BaseModel):
    id: str
    disc_num: int
    track_num: int
    title: str
    filename: str


class AlbumDetailOut(AlbumOut):
    comments: str
    relpath: str
    tracks: list[TrackOut]


class FolderAlbum(BaseModel):
    id: str
    title: str
    track_count: int


class FolderArtist(BaseModel):
    id: str
    name: str
    albums: list[FolderAlbum]


class TrackUpdateIn(BaseModel):
    id: str
    title: str


class AlbumUpdateIn(BaseModel):
    title: str | None = None
    artist: str | None = None
    album_artist: str | None = None
    year: str | None = None
    compilation: bool | None = None
    comments: str | None = None
    genres: list[str] | None = None
    tracks: list[TrackUpdateIn] | None = None


class BulkUpdateIn(BaseModel):
    ids: list[str]
    album_artist: str | None = None
    comments: str | None = None
    add_genres: list[str] | None = None
