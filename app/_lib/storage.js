import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@king-music/favorites';
const PLAYLISTS_KEY = '@king-music/playlists';
const IMPORTED_TRACKS_KEY = '@king-music/imported-tracks';

export async function loadFavorites() {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveFavorites(ids) {
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export async function loadPlaylists() {
  const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function savePlaylists(playlists) {
  await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}

export async function loadImportedTracks() {
  const raw = await AsyncStorage.getItem(IMPORTED_TRACKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveImportedTracks(tracks) {
  await AsyncStorage.setItem(IMPORTED_TRACKS_KEY, JSON.stringify(tracks));
}
