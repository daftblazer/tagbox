import pytest

from app import browse, repo


def test_browse_lists_subfolders_of_media_root(media_root):
    result = browse.browse("")
    assert result.current_path == ""
    assert result.parent_path is None
    assert {e.name for e in result.entries} == {"Music", "Video Game Music"}


def test_browse_into_subfolder(media_root):
    (media_root / "Music" / "Boards of Canada").mkdir()
    result = browse.browse("Music")
    assert result.current_path == "Music"
    assert result.parent_path == ""
    assert [e.name for e in result.entries] == ["Boards of Canada"]


def test_browse_rejects_path_escaping_media_root(media_root):
    with pytest.raises(browse.PathEscapesMediaRoot):
        browse.resolve_under_media_root("../../etc")


def test_create_library_registers_and_scans(media_root):
    lib = repo.create_library("My Music", "Music")
    assert lib.id == "my-music"
    assert lib.path == str(media_root / "Music")

    libs = repo.list_libraries()
    assert [l.name for l in libs] == ["My Music"]


def test_create_library_rejects_path_outside_media_root(media_root):
    with pytest.raises(browse.PathEscapesMediaRoot):
        repo.create_library("Sneaky", "../outside")


def test_create_library_rejects_missing_folder(media_root):
    with pytest.raises(NotADirectoryError):
        repo.create_library("Ghost", "Does Not Exist")


def test_create_library_rejects_duplicate_path(media_root):
    repo.create_library("Music", "Music")
    with pytest.raises(ValueError):
        repo.create_library("Music Again", "Music")


def test_create_library_dedupes_id_on_name_collision(media_root):
    (media_root / "Music2").mkdir()
    first = repo.create_library("Music", "Music")
    second = repo.create_library("Music", "Music2")
    assert first.id == "music"
    assert second.id == "music-2"


def test_delete_library_removes_it(media_root):
    lib = repo.create_library("My Music", "Music")
    assert repo.delete_library(lib.id) is True
    assert repo.list_libraries() == []


def test_delete_library_returns_false_for_unknown_id(media_root):
    assert repo.delete_library("does-not-exist") is False


def test_delete_library_cascades_to_scanned_data(media_root):
    from tests.conftest import _has_ffmpeg, _make_track

    if not _has_ffmpeg():
        pytest.skip("ffmpeg not available to synthesize fixture audio")

    _make_track(
        media_root / "Music" / "Boards of Canada" / "Geogaddi" / "01 Ready Lets Go.mp3",
        title="Ready Lets Go", artist="Boards of Canada", album="Geogaddi", date="2002",
    )
    lib = repo.create_library("Music", "Music")
    from app.scanner import scan_library

    scan_library(lib)
    assert len(repo.list_artists(lib.id)) > 0

    repo.delete_library(lib.id)
    assert repo.list_artists(lib.id) == []
