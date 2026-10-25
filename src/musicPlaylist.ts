import playlistData from './music-playlist.json';
export interface MusicPreset { title: string; artist: string; genre?: string; coverUrl: string; audioUrl: string; audioName?: string }
/** Shared source for the Studio playlist and future customer music form. */
export const musicPlaylist = playlistData as MusicPreset[];