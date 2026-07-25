# Tagbox

A self-hosted web UI for browsing and editing audio tags across multiple
music libraries (e.g. a regular music library and a separate video game
music library), without needing MusicBrainz matches or a Windows/macOS tag
editor over SMB.

- Browse by artist, album, or raw folder structure
- Edit tags (title, artist, album artist, year, genres, comments, compilation,
  disc/track numbers, per-track titles) and cover art — one album or many at
  once (multi-select + bulk edit), with drag-to-crop for cover uploads
- Multiple independent libraries, added/removed from within the app — mount
  one media root folder and register each library subfolder from the UI
- Folder layout on disk (`Artist/Album/*.ext`) is the source of truth for
  grouping; ID3/FLAC/MP4/Vorbis tags are read and written directly on the
  files — there's no separate database of truth to fall out of sync

## Quick start (local dev, fastest way to try it out)

Requires Python 3.12+, Node 20+, and `ffmpeg` on `PATH` (only needed if you
want to run the backend test suite, which synthesizes fixture audio files).

```bash
# 1. Backend — terminal 1
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# 2. Frontend — terminal 2
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`, then click **+ Add library** in the sidebar to
register a folder as a library (see [Adding libraries](#adding-libraries)
below — by default local dev points at the bundled `dev-library/` fixture,
so there'll be folders to pick from immediately). The frontend proxies API
calls to the backend on port 8000, and both reload live as you edit code.

See [Local development](#local-development) for test-running and env var
details, or [Running with Docker](#running-with-docker) for the production
single-container setup.

## Stack

- **Backend**: Python (FastAPI) + [mutagen](https://mutagen.readthedocs.io/)
  for tag/cover I/O, SQLite as a local index that's rebuilt from the files on
  disk (never the other way around) — the same SQLite database is also where
  the list of libraries itself now lives, managed from the UI instead of a
  config file
- **Frontend**: React + Vite + TypeScript
- **Packaging**: single Docker image (backend serves the built frontend as
  static files)

## Directory layout

```
backend/            FastAPI app, scanner, tag I/O
frontend/            React + Vite UI
data/                SQLite index (incl. the library list) + cover art cache (gitignored)
dev-library/         local fixture library for manual testing (gitignored) —
                     doubles as the default TAGBOX_MEDIA_ROOT for local dev
design-reference/    original UI mockup this app's design is based on
```

## Adding libraries

Libraries aren't configured by hand anymore — mount **one** folder that
contains all of them as subfolders (a "media root"), then use **+ Add
library** in the sidebar to browse into it and register each one. Add as
many as you like, and remove one later by hovering its row in the sidebar
and clicking the `×` that appears (this only unregisters it in Tagbox —
nothing on disk is touched).

Example layout under a single mounted media root:

```
/mnt/user/music/              <- this whole folder is what you mount
  Music/                      <- add as a library named "Music"
    Boards of Canada/
      Music Has the Right to Children/
        01 Wildlife Analysis.mp3
        ...
  Video Game Music/           <- add as a library named "Video Game Music"
    Yasunori Mitsuda/
      Chrono Trigger OST/
        ...
```

## Running with Docker

1. Edit `docker-compose.yml` and point the volume mount at your real media
   folder (the one containing your library subfolders):

   ```yaml
   volumes:
     - ./data:/data:Z
     - /path/to/your/media:/media:rw,Z
   ```

2. Start it:

   ```
   docker compose up -d --build
   ```

3. Open `http://localhost:8420` and add your libraries from the UI (see
   [Adding libraries](#adding-libraries)).

The `,Z` suffix relabels the mount for SELinux (needed on Fedora/RHEL-based
hosts running Docker or Podman with SELinux enforcing — e.g. this was
developed and tested on Bazzite). It's a harmless no-op on distros without
SELinux, but drop it if your particular setup complains about it.

If you hit a permission error writing to `./data` or the media folder, the
container runs as root by default (typical for a plain Docker Engine setup);
under rootless Podman you may additionally need `--userns=keep-id` or to
`chmod`/`chown` the host directories so the container's user can write to
them.

Rescanning: click **Rescan library** in the sidebar after adding/removing
files on disk, or `POST /api/libraries/{id}/rescan`.

## Local development

Requires Python 3.12+ and Node 20+.

**Backend:**

```
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000
```

By default the backend uses `../dev-library` as its media root and stores
its SQLite index/cover cache under `../data`. Override with the
`TAGBOX_MEDIA_ROOT` and `TAGBOX_DATA_DIR` env vars if you'd rather point
elsewhere.

Run the backend tests (they synthesize real audio files with `ffmpeg`, so it
must be on `PATH`):

```
.venv/bin/pytest
```

**Frontend:**

```
cd frontend
npm install
npm run dev
```

This starts Vite on `http://localhost:5173` and proxies `/api/*` to
`http://localhost:8000` (the backend above). Override the proxy target with
`TAGBOX_API_PROXY` if your backend runs elsewhere.

With both running, open `http://localhost:5173` — edits to either the
backend (`--reload`) or frontend (Vite HMR) apply live.

## Supported formats

Reading/writing common tags and cover art is implemented for MP3 (ID3),
FLAC, MP4/M4A, and Ogg Vorbis/Opus — the formats mutagen supports well and
that cover the vast majority of ripped/downloaded libraries.
