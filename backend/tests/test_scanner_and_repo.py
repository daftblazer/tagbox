from app import repo, tagio
from app.config import LibraryConfig
from app.models import AlbumUpdateIn, TrackUpdateIn
from app.scanner import scan_library


def _scan(library_root):
    lib = LibraryConfig(id="music", name="Music", path=str(library_root))
    scan_library(lib)
    return lib


def test_scan_populates_artists_and_albums(db_conn, library_root):
    _scan(library_root)

    artists = repo.list_artists("music")
    assert {a.name for a in artists} == {"Boards of Canada", "Nils Frahm"}

    albums = repo.list_albums("music")
    assert len(albums) == 2
    boc_album = next(a for a in albums if a.artist == "Boards of Canada")
    assert boc_album.title == "Music Has the Right to Children"
    assert boc_album.year == "1998"
    assert boc_album.track_count == 2
    assert "Electronic" in boc_album.genres


def test_rescan_is_idempotent(db_conn, library_root):
    _scan(library_root)
    _scan(library_root)

    albums = repo.list_albums("music")
    assert len(albums) == 2


def test_update_album_writes_tags_to_disk_and_db(db_conn, library_root):
    _scan(library_root)
    album = next(a for a in repo.list_albums("music") if a.artist == "Boards of Canada")

    updated = repo.update_album(
        album.id,
        AlbumUpdateIn(genres=["Electronic", "IDM"], comments="great record", year="1999"),
    )
    assert updated is not None
    assert set(updated.genres) == {"Electronic", "IDM"}
    assert updated.comments == "great record"
    assert updated.year == "1999"

    # Tags should persist across a rescan, since the files on disk are the source of truth.
    _scan(library_root)
    reread = repo.get_album_detail(album.id)
    assert set(reread.genres) == {"Electronic", "IDM"}
    assert reread.year == "1999"


def test_update_track_disc_and_track_number(db_conn, library_root):
    _scan(library_root)
    album = next(a for a in repo.list_albums("music") if a.artist == "Boards of Canada")
    detail = repo.get_album_detail(album.id)
    track = next(t for t in detail.tracks if t.title == "An Eagle in Your Mind")
    other_track = next(t for t in detail.tracks if t.id != track.id)
    assert track.disc_num == 1 and track.track_num == 2

    updated = repo.update_album(
        album.id,
        AlbumUpdateIn(
            tracks=[
                TrackUpdateIn(id=track.id, title=track.title, disc_num=2, track_num=1),
                TrackUpdateIn(id=other_track.id, title=other_track.title, disc_num=other_track.disc_num, track_num=other_track.track_num),
            ]
        ),
    )
    updated_track = next(t for t in updated.tracks if t.id == track.id)
    assert updated_track.disc_num == 2
    assert updated_track.track_num == 1

    # Written to the actual file, not just the DB.
    abspath = str(library_root / "Boards of Canada" / "Music Has the Right to Children" / "02 An Eagle in Your Mind.mp3")
    tags = tagio.read_tags(abspath)
    assert tags.disc_num == 2
    assert tags.track_num == 1

    # Untouched tracks keep their original position, on disk and in the DB.
    reread = repo.get_album_detail(album.id)
    other_reread = next(t for t in reread.tracks if t.id == other_track.id)
    assert other_reread.disc_num == other_track.disc_num
    assert other_reread.track_num == other_track.track_num

    _scan(library_root)  # rescan should confirm the file itself now reports the new position
    lib_again = repo.get_album_detail(album.id)
    assert next(t for t in lib_again.tracks if t.id == track.id).disc_num == 2


def test_bulk_update_adds_genre_to_multiple_albums(db_conn, library_root):
    _scan(library_root)
    albums = repo.list_albums("music")
    ids = [a.id for a in albums]

    results = repo.bulk_update_albums(ids, album_artist=None, comments=None, add_genres=["Chill"])
    assert len(results) == 2
    assert all("Chill" in a.genres for a in results)


def test_artist_names_dedupes_case_variants(db_conn, library_root):
    _scan(library_root)
    album = next(a for a in repo.list_albums("music") if a.artist == "Nils Frahm")

    # A case-variant sneaks in via the album_artist tag on another album.
    repo.update_album(album.id, AlbumUpdateIn(album_artist="NILS FRAHM"))

    names = repo.list_artist_names("music")
    lower_names = [n.lower() for n in names]
    assert lower_names.count("nils frahm") == 1
    assert "Boards of Canada" in names


def test_removed_album_folder_is_pruned_on_rescan(db_conn, library_root):
    lib = _scan(library_root)
    assert len(repo.list_albums("music")) == 2

    import shutil

    shutil.rmtree(library_root / "Nils Frahm")
    scan_library(lib)

    albums = repo.list_albums("music")
    assert len(albums) == 1
    assert albums[0].artist == "Boards of Canada"
    assert {a.name for a in repo.list_artists("music")} == {"Boards of Canada"}
