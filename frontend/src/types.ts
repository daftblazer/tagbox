export interface Library {
  id: string
  name: string
  path: string
  artist_count: number
  album_count: number
}

export interface Artist {
  id: string
  name: string
  album_count: number
  cover_id: string | null
}

export interface Album {
  id: string
  title: string
  artist_id: string
  artist: string
  album_artist: string
  year: string
  genres: string[]
  compilation: boolean
  track_count: number
  cover_id: string | null
}

export interface Track {
  id: string
  disc_num: number
  track_num: number
  title: string
  filename: string
}

export interface AlbumDetail extends Album {
  comments: string
  relpath: string
  tracks: Track[]
}

export interface FolderAlbum {
  id: string
  title: string
  track_count: number
}

export interface FolderArtist {
  id: string
  name: string
  albums: FolderAlbum[]
}

export interface AlbumUpdateInput {
  title?: string
  artist?: string
  album_artist?: string
  year?: string
  compilation?: boolean
  comments?: string
  genres?: string[]
  tracks?: { id: string; title: string }[]
}

export interface BulkUpdateInput {
  ids: string[]
  album_artist?: string
  comments?: string
  add_genres?: string[]
}

export type ViewMode = 'artists' | 'albums' | 'folders'
