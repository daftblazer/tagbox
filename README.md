# Tagbox

A self-hosted web UI for browsing and editing audio tags across multiple
music libraries (e.g. a regular music library and a separate video game
music library), without needing MusicBrainz matches or a Windows/macOS tag
editor over SMB.

- Browse by artist, album, or raw folder structure
- Edit tags (title, artist, album artist, year, genres, comments, compilation,
  per-track titles) and cover art, one album or many at once (multi-select +
  bulk edit)
- Multiple independent libraries, each with its own root folder
- Folder layout on disk (`Artist/Album/*.ext`) is the source of truth for
  grouping; ID3/FLAC/MP4/Vorbis tags are read and written directly on the
  files — there's no separate database of truth to fall out of sync

## Quick start (local dev, fastest way to try it out)

Requires Python 3.12+, Node 20+, and `ffmpeg` on `PATH` (only needed if you
want to run the backend test suite, which synthesizes fixture audio files).

```bash
# 1. Point at a library (or two) to scan
cp config/libraries.example.yaml config/libraries.yaml
# edit config/libraries.yaml — set each `path:` to a real folder on your machine

# 2. Backend — terminal 1
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/uvicorn app.main:app --reload --port 8000

# 3. Frontend — terminal 2
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend proxies API calls to the backend
on port 8000, and both reload live as you edit code. See
[Local development](#local-development) below for test-running and env var
details, or [Running with Docker](#running-with-docker) for the production
single-container setup.

## Stack

- **Backend**: Python (FastAPI) + [mutagen](https://mutagen.readthedocs.io/)
  for tag/cover I/O, SQLite as a local index that's rebuilt from the files on
  disk (never the other way around)
- **Frontend**: React + Vite + TypeScript
- **Packaging**: single Docker image (backend serves the built frontend as
  static files)

## Directory layout

```
backend/            FastAPI app, scanner, tag I/O
frontend/            React + Vite UI
config/
  libraries.example.yaml   copy to libraries.yaml and edit
  libraries.yaml            (gitignored — your actual config)
data/                SQLite index + cover art cache (gitignored)
dev-library/         local fixture library for manual testing (gitignored)
design-reference/    original UI mockup this app's design is based on
```

## Running with Docker

1. Copy the example config and point each library at a folder **inside the
   container** (the path after the colon in the volume mount below):

   ```
   cp config/libraries.example.yaml config/libraries.yaml
   ```

2. Edit `docker-compose.yml` and replace the placeholder volume lines with
   your real library folders, e.g.:

   ```yaml
   volumes:
     - ./config:/config:ro,Z
     - ./data:/data:Z
     - /mnt/media/music:/libraries/music:rw,Z
     - /mnt/media/vgm:/libraries/vgm:rw,Z
   ```

   Each `path:` in `config/libraries.yaml` must match the *container-side*
   path of one of these mounts.

3. Start it:

   ```
   docker compose up -d --build
   ```

   Then open `http://localhost:8420`.

The `,Z` suffix relabels the mount for SELinux (needed on Fedora/RHEL-based
hosts running Docker or Podman with SELinux enforcing — e.g. this was
developed and tested on Bazzite). It's a harmless no-op on distros without
SELinux, but drop it if your particular setup complains about it.

If you hit a permission error writing to `./data` or a library folder, the
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
cp ../config/libraries.example.yaml ../config/libraries.yaml   # then edit paths
.venv/bin/uvicorn app.main:app --reload --port 8000
```

By default the backend looks for `../config/libraries.yaml` and stores its
SQLite index/cover cache under `../data`. Override with the `TAGBOX_CONFIG`
and `TAGBOX_DATA_DIR` env vars if you'd rather point elsewhere.

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
