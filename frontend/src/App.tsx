import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { AddLibraryModal } from './components/AddLibraryModal'
import { AlbumGrid } from './components/AlbumGrid'
import { AlbumTree } from './components/AlbumTree'
import { ArtistGrid } from './components/ArtistGrid'
import { BulkEditModal } from './components/BulkEditModal'
import { EditorDrawer } from './components/EditorDrawer'
import { FolderView } from './components/FolderView'
import { OrganizeLooseFilesModal } from './components/OrganizeLooseFilesModal'
import { SelectionBar } from './components/SelectionBar'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { ACTIVE_TEXT_ON_ACCENT, PALETTES, accentForLibrary, type ThemeName } from './theme'
import type { Album, Artist, FolderArtist, Library, ViewMode } from './types'

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])
  return debounced
}

export default function App() {
  const [theme, setTheme] = useState<ThemeName>(() =>
    window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  )
  const pal = PALETTES[theme]

  const [libraries, setLibraries] = useState<Library[]>([])
  const [libraryId, setLibraryId] = useState<string | null>(null)
  const [librariesError, setLibrariesError] = useState<string | null>(null)

  const [viewMode, setViewModeState] = useState<ViewMode>('artists')
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)

  const [artists, setArtists] = useState<Artist[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [folders, setFolders] = useState<FolderArtist[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listVersion, setListVersion] = useState(0)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [rescanning, setRescanning] = useState(false)
  const [artistSuggestions, setArtistSuggestions] = useState<string[]>([])
  const [organizeOpen, setOrganizeOpen] = useState(false)
  const [artistAlbumView, setArtistAlbumView] = useState<'tree' | 'grid'>('tree')
  const [addLibraryOpen, setAddLibraryOpen] = useState(false)

  const currentLibrary = libraries.find((l) => l.id === libraryId) ?? null
  const accent = libraryId ? accentForLibrary(libraryId) : accentForLibrary('default')

  const showArtistGrid = viewMode === 'artists' && !selectedArtist
  const showAlbumGrid = viewMode === 'albums' || (viewMode === 'artists' && !!selectedArtist)
  const showFolders = viewMode === 'folders'
  // The Grid/Tree toggle only applies to one artist's discography, not the all-artists Albums tab.
  const isArtistAlbumView = viewMode === 'artists' && !!selectedArtist

  const bumpListVersion = useCallback(() => setListVersion((v) => v + 1), [])

  const reloadLibraries = useCallback(() => {
    api
      .libraries()
      .then((libs) => {
        setLibraries(libs)
        setLibrariesError(null)
      })
      .catch((e) => setLibrariesError(String(e)))
  }, [])

  useEffect(() => {
    reloadLibraries()
  }, [reloadLibraries])

  useEffect(() => {
    if (!libraryId && libraries.length > 0) setLibraryId(libraries[0].id)
  }, [libraries, libraryId])

  function selectLibrary(id: string) {
    setLibraryId(id)
    setSelectedArtist(null)
    setSelectMode(false)
    setSelectedIds(new Set())
    setSearch('')
  }

  function setViewMode(m: ViewMode) {
    setViewModeState(m)
    setSelectedArtist(null)
  }

  function openArtist(artist: Artist) {
    setViewModeState('artists')
    setSelectedArtist(artist)
  }

  function backToArtists() {
    setViewModeState('artists')
    setSelectedArtist(null)
  }

  // Load whichever list is currently visible.
  useEffect(() => {
    if (!libraryId) return
    let cancelled = false
    setListError(null)

    async function load() {
      try {
        if (showFolders) {
          const data = await api.folders(libraryId!)
          if (!cancelled) setFolders(data)
        } else if (showAlbumGrid) {
          const data = await api.albums(libraryId!, {
            artistId: viewMode === 'artists' ? selectedArtist?.id : undefined,
            search: debouncedSearch,
          })
          if (!cancelled) setAlbums(data)
        } else {
          const data = await api.artists(libraryId!, debouncedSearch)
          if (!cancelled) setArtists(data)
        }
      } catch (e) {
        if (!cancelled) setListError(String(e))
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryId, viewMode, selectedArtist, debouncedSearch, listVersion, showFolders, showAlbumGrid])

  // Artist-name suggestions for the tag editors' autocomplete, refreshed whenever
  // edits might introduce a new name.
  useEffect(() => {
    if (!libraryId) return
    let cancelled = false
    api
      .artistNames(libraryId)
      .then((names) => !cancelled && setArtistSuggestions(names))
      .catch(() => !cancelled && setArtistSuggestions([]))
    return () => {
      cancelled = true
    }
  }, [libraryId, listVersion])

  function toggleSelectMode() {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  function toggleSelectAlbum(albumId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(albumId)) next.delete(albumId)
      else next.add(albumId)
      return next
    })
  }

  async function handleDeleteLibrary(id: string) {
    if (!window.confirm('Remove this library from Tagbox? Your files on disk will not be touched.')) return
    try {
      await api.deleteLibrary(id)
      if (libraryId === id) setLibraryId(null)
      reloadLibraries()
    } catch (e) {
      setLibrariesError(String(e))
    }
  }

  async function rescan() {
    if (!libraryId) return
    setRescanning(true)
    try {
      await api.rescan(libraryId)
      // Scanning runs in the background on the server; give it a moment before refreshing.
      setTimeout(() => {
        reloadLibraries()
        bumpListVersion()
        setRescanning(false)
      }, 1500)
    } catch {
      setRescanning(false)
    }
  }

  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds])

  return (
    <div
      style={{
        display: 'flex', height: '100vh', width: '100%', background: pal.appBg, color: pal.textPrimary,
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif", overflow: 'hidden', position: 'relative',
      }}
    >
      <Sidebar
        pal={pal}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        libraries={libraries}
        libraryId={libraryId}
        currentLibrary={currentLibrary}
        onSelectLibrary={selectLibrary}
        onRescan={rescan}
        rescanning={rescanning}
        onAddLibrary={() => setAddLibraryOpen(true)}
        onDeleteLibrary={handleDeleteLibrary}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {librariesError && (
          <div style={{ padding: '10px 22px', fontSize: 12.5, color: 'oklch(65% 0.19 25)' }}>{librariesError}</div>
        )}

        {!currentLibrary && !librariesError && (
          <div style={{ padding: 22, fontSize: 13, color: pal.textFaint }}>
            No libraries yet. Click <strong>+ Add library</strong> in the sidebar to register a folder from your
            mounted media root.
          </div>
        )}

        {currentLibrary && (
          <>
            <Toolbar
              pal={pal}
              accent={accent}
              libraryName={currentLibrary.name}
              selectedArtistName={selectedArtist?.name ?? null}
              onBackToArtists={backToArtists}
              search={search}
              onSearchChange={setSearch}
              viewMode={viewMode}
              onSetViewMode={setViewMode}
              selectMode={selectMode}
              onToggleSelectMode={toggleSelectMode}
              onOrganizeLooseFiles={() => setOrganizeOpen(true)}
            />

            <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
              {listError && <div style={{ fontSize: 12.5, color: 'oklch(65% 0.19 25)', marginBottom: 16 }}>{listError}</div>}

              {showArtistGrid && <ArtistGrid pal={pal} artists={artists} onOpen={openArtist} />}

              {isArtistAlbumView && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                  <div style={{ display: 'flex', background: pal.tabBarBg, border: `1px solid ${pal.tabBarBorder}`, borderRadius: 7, padding: 2 }}>
                    {(['tree', 'grid'] as const).map((mode) => {
                      const active = artistAlbumView === mode
                      return (
                        <div
                          key={mode}
                          onClick={() => setArtistAlbumView(mode)}
                          style={{
                            padding: '6px 12px', fontSize: 12.5, borderRadius: 5, cursor: 'pointer', textTransform: 'capitalize',
                            background: active ? accent : 'transparent', color: active ? ACTIVE_TEXT_ON_ACCENT : pal.textSecondary,
                          }}
                        >
                          {mode}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {showAlbumGrid && isArtistAlbumView && artistAlbumView === 'tree' ? (
                <AlbumTree
                  pal={pal}
                  accent={accent}
                  albums={albums}
                  selectMode={selectMode}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelectAlbum}
                  onOpen={setEditingAlbumId}
                />
              ) : (
                showAlbumGrid && (
                  <AlbumGrid
                    pal={pal}
                    accent={accent}
                    albums={albums}
                    selectMode={selectMode}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelectAlbum}
                    onOpen={setEditingAlbumId}
                  />
                )
              )}

              {showFolders && <FolderView pal={pal} folders={folders} onOpenAlbum={setEditingAlbumId} />}
            </div>
          </>
        )}
      </div>

      {editingAlbumId && (
        <EditorDrawer
          albumId={editingAlbumId}
          pal={pal}
          accent={accent}
          artistSuggestions={artistSuggestions}
          onClose={() => setEditingAlbumId(null)}
          onSaved={() => {
            setEditingAlbumId(null)
            bumpListVersion()
          }}
        />
      )}

      <SelectionBar
        pal={pal}
        accent={accent}
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onEditTags={() => setBulkOpen(true)}
      />

      {bulkOpen && (
        <BulkEditModal
          ids={selectedIdList}
          pal={pal}
          accent={accent}
          artistSuggestions={artistSuggestions}
          onClose={() => setBulkOpen(false)}
          onApplied={() => {
            setBulkOpen(false)
            setSelectMode(false)
            setSelectedIds(new Set())
            bumpListVersion()
          }}
        />
      )}

      {organizeOpen && libraryId && (
        <OrganizeLooseFilesModal
          libraryId={libraryId}
          pal={pal}
          accent={accent}
          onClose={() => setOrganizeOpen(false)}
          onOrganized={() => {
            // The server rescans in the background after moving files; give it a moment.
            setTimeout(() => {
              reloadLibraries()
              bumpListVersion()
            }, 1500)
          }}
        />
      )}

      {addLibraryOpen && (
        <AddLibraryModal
          pal={pal}
          accent={accent}
          onClose={() => setAddLibraryOpen(false)}
          onCreated={(lib) => {
            setAddLibraryOpen(false)
            reloadLibraries()
            selectLibrary(lib.id)
            // The server scans in the background right after creation; give it a moment.
            setTimeout(bumpListVersion, 1500)
          }}
        />
      )}
    </div>
  )
}
