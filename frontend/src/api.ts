import type {
  Album,
  AlbumDetail,
  AlbumUpdateInput,
  Artist,
  BulkUpdateInput,
  FolderArtist,
  Library,
} from './types'

const BASE = '/api'

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  if (!entries.length) return ''
  return '?' + new URLSearchParams(entries as [string, string][]).toString()
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

export const api = {
  libraries: () => req<Library[]>('/libraries'),
  rescan: (libraryId: string) => req<{ status: string }>(`/libraries/${libraryId}/rescan`, { method: 'POST' }),
  artists: (libraryId: string, search?: string) =>
    req<Artist[]>(`/libraries/${libraryId}/artists${qs({ search })}`),
  albums: (libraryId: string, opts: { artistId?: string; search?: string } = {}) =>
    req<Album[]>(`/libraries/${libraryId}/albums${qs({ artist_id: opts.artistId, search: opts.search })}`),
  folders: (libraryId: string) => req<FolderArtist[]>(`/libraries/${libraryId}/folders`),
  artistNames: (libraryId: string) => req<string[]>(`/libraries/${libraryId}/artist-names`),

  album: (albumId: string) => req<AlbumDetail>(`/albums/${albumId}`),
  updateAlbum: (albumId: string, patch: AlbumUpdateInput) =>
    req<AlbumDetail>(`/albums/${albumId}`, jsonInit('PATCH', patch)),
  uploadCover: (albumId: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return req<AlbumDetail>(`/albums/${albumId}/cover`, { method: 'POST', body: form })
  },

  bulkUpdate: (patch: BulkUpdateInput) => req<AlbumDetail[]>('/albums/bulk', jsonInit('POST', patch)),
  bulkUploadCover: (ids: string[], file: File) => {
    const form = new FormData()
    form.append('file', file)
    return req<AlbumDetail[]>(`/albums/bulk/cover${qs({ ids: ids.join(',') })}`, { method: 'POST', body: form })
  },

  coverUrl: (coverId: string | null | undefined) => (coverId ? `${BASE}/covers/${coverId}` : null),
}
