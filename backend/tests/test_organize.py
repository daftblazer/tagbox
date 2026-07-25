import os

from app import repo, tagio
from app.config import LibraryConfig
from app.organize import find_loose_files, organize_loose_files, sanitize_folder_name
from app.scanner import scan_library


def _lib(root) -> LibraryConfig:
    return LibraryConfig(id="music", name="Music", path=str(root))


def test_finds_loose_file_directly_in_artist_folder(library_root_with_loose_file):
    lib = _lib(library_root_with_loose_file)

    loose = find_loose_files(lib)

    assert len(loose) == 1
    assert loose[0].artist_name == "Boards of Canada"
    assert loose[0].filename == "B-Side Single.mp3"
    assert loose[0].suggested_folder == "B-Side Single"
    assert loose[0].relpath == os.path.join("Boards of Canada", "B-Side Single.mp3")


def test_does_not_flag_files_already_in_an_album_folder(library_root):
    lib = _lib(library_root)
    assert find_loose_files(lib) == []


def test_organize_moves_file_into_titled_folder(library_root_with_loose_file):
    lib = _lib(library_root_with_loose_file)
    loose = find_loose_files(lib)

    organized, skipped = organize_loose_files(lib, [f.relpath for f in loose])

    assert organized == [loose[0].relpath]
    assert skipped == []
    new_path = library_root_with_loose_file / "Boards of Canada" / "B-Side Single" / "B-Side Single.mp3"
    assert new_path.is_file()
    assert not (library_root_with_loose_file / "Boards of Canada" / "B-Side Single.mp3").exists()

    # And it's no longer flagged as loose.
    assert find_loose_files(lib) == []


def test_organize_sets_album_tag_to_match_title(library_root_with_loose_file):
    lib = _lib(library_root_with_loose_file)
    loose = find_loose_files(lib)
    assert tagio.read_tags(
        str(library_root_with_loose_file / "Boards of Canada" / "B-Side Single.mp3")
    ).album == ""

    organize_loose_files(lib, [f.relpath for f in loose])

    new_path = library_root_with_loose_file / "Boards of Canada" / "B-Side Single" / "B-Side Single.mp3"
    tags = tagio.read_tags(str(new_path))
    assert tags.album == "B-Side Single"
    assert tags.album == tags.title


def test_organized_file_is_picked_up_as_an_album_on_rescan(db_conn, library_root_with_loose_file):
    lib = _lib(library_root_with_loose_file)
    loose = find_loose_files(lib)
    organize_loose_files(lib, [f.relpath for f in loose])

    scan_library(lib)

    albums = repo.list_albums("music")
    single = next(a for a in albums if a.title == "B-Side Single")
    assert single.artist == "Boards of Canada"
    assert single.track_count == 1


def test_organize_skips_unselected_and_missing_files(library_root_with_loose_file):
    lib = _lib(library_root_with_loose_file)

    organized, skipped = organize_loose_files(lib, ["Boards of Canada/does-not-exist.mp3"])

    assert organized == []
    assert skipped == ["Boards of Canada/does-not-exist.mp3"]
    # The real loose file was never selected, so it's left alone.
    assert (library_root_with_loose_file / "Boards of Canada" / "B-Side Single.mp3").exists()


def test_sanitize_folder_name_strips_invalid_characters():
    assert sanitize_folder_name('Track: "Live" / Remix?') == "Track Live Remix"
    assert sanitize_folder_name("   ") == "Untitled"
    assert sanitize_folder_name("Trailing dot.") == "Trailing dot"


def test_organize_handles_duplicate_titles_without_clobbering(library_root_with_loose_file):
    from tests.conftest import _make_track

    _make_track(
        library_root_with_loose_file / "Boards of Canada" / "B-Side Single (alt take).mp3",
        title="B-Side Single", artist="Boards of Canada", date="1999", genre="Electronic",
    )
    lib = _lib(library_root_with_loose_file)
    loose = find_loose_files(lib)
    assert len(loose) == 2

    organized, skipped = organize_loose_files(lib, [f.relpath for f in loose])

    assert set(organized) == {f.relpath for f in loose}
    assert skipped == []
    folder1 = library_root_with_loose_file / "Boards of Canada" / "B-Side Single"
    folder2 = library_root_with_loose_file / "Boards of Canada" / "B-Side Single (2)"
    assert folder1.is_dir() and len(list(folder1.iterdir())) == 1
    assert folder2.is_dir() and len(list(folder2.iterdir())) == 1
