import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';

import { resolveSongArtworkUri } from './musicLibrary';

const EXPORT_ROOT = `${FileSystem.cacheDirectory}playlist-transfer-export`;
const IMPORT_ROOT = `${FileSystem.documentDirectory}playlist-transfer-imported`;

function sanitizeName(value = '') {
  return String(value)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function extensionFromSong(song) {
  if (song?.filename?.includes('.')) {
    const parts = song.filename.split('.');
    const ext = parts[parts.length - 1];
    return ext ? `.${ext.toLowerCase()}` : '.bin';
  }

  if (typeof song?.uri === 'string') {
    const match = song.uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    if (match?.[1]) {
      return `.${match[1].toLowerCase()}`;
    }
  }

  return '.bin';
}

function buildPlaylistNameMap(existingPlaylists) {
  const names = new Map();
  existingPlaylists.forEach((playlist) => {
    const key = playlist.name.toLowerCase();
    names.set(key, (names.get(key) ?? 0) + 1);
  });
  return names;
}

function nextPlaylistName(baseName, takenNames) {
  const preferred = baseName?.trim() || 'Imported Playlist';
  const lower = preferred.toLowerCase();

  if (!takenNames.has(lower)) {
    takenNames.set(lower, 1);
    return preferred;
  }

  const count = (takenNames.get(lower) ?? 1) + 1;
  takenNames.set(lower, count);
  return `${preferred} (${count})`;
}

export async function createPlaylistExportZip({
  playlists,
  songs,
  resolveSongUri,
}) {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    throw new Error('No playlists to export.');
  }

  const songMap = new Map(songs.map((song) => [song.id, song]));
  const neededSongIds = new Set();
  playlists.forEach((playlist) => {
    (playlist.songIds || []).forEach((songId) => neededSongIds.add(songId));
  });

  const zip = new JSZip();
  const exportedSongs = [];

  const songsRoot = `${EXPORT_ROOT}/songs`;
  await FileSystem.deleteAsync(EXPORT_ROOT, { idempotent: true });
  await FileSystem.makeDirectoryAsync(songsRoot, { intermediates: true });

  for (const songId of neededSongIds) {
    const song = songMap.get(songId);
    if (!song) {
      continue;
    }

    let resolvedUri = song.uri;
    if (!resolvedUri && resolveSongUri) {
      try {
        resolvedUri = await resolveSongUri(song);
      } catch {
        resolvedUri = null;
      }
    }

    if (!resolvedUri) {
      continue;
    }

    const ext = extensionFromSong(song);
    const exportName = `${sanitizeName(song.id) || 'track'}${ext}`;
    const tempCopyUri = `${songsRoot}/${exportName}`;

    try {
      await FileSystem.copyAsync({
        from: resolvedUri,
        to: tempCopyUri,
      });
      const base64 = await FileSystem.readAsStringAsync(tempCopyUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      zip.file(`songs/${exportName}`, base64, { base64: true });

      exportedSongs.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        filename: song.filename,
        duration: song.duration,
        file: `songs/${exportName}`,
      });
    } catch {
      // Skip tracks that cannot be copied/read from the source URI.
    }
  }

  const manifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    playlists,
    songs: exportedSongs,
  };

  zip.file('playlists.json', JSON.stringify(manifest, null, 2));

  const archiveBase64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const zipUri = `${FileSystem.cacheDirectory}playlists-export-${Date.now()}.zip`;
  await FileSystem.writeAsStringAsync(zipUri, archiveBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return {
    zipUri,
    playlistCount: playlists.length,
    trackCount: exportedSongs.length,
  };
}

export async function importPlaylistsFromZip({
  zipUri,
  existingPlaylists,
  existingSongs,
}) {
  const zipBase64 = await FileSystem.readAsStringAsync(zipUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const zip = await JSZip.loadAsync(zipBase64, { base64: true });

  const manifestFile = zip.file('playlists.json');
  if (!manifestFile) {
    throw new Error('Invalid archive: missing playlists.json');
  }

  const manifest = JSON.parse(await manifestFile.async('string'));
  const playlists = Array.isArray(manifest?.playlists)
    ? manifest.playlists
    : [];
  const songs = Array.isArray(manifest?.songs) ? manifest.songs : [];

  await FileSystem.makeDirectoryAsync(IMPORT_ROOT, { intermediates: true });

  const oldIdToNewId = new Map(existingSongs.map((song) => [song.id, song.id]));
  const importedSongs = [];

  for (let index = 0; index < songs.length; index += 1) {
    const song = songs[index];
    const archived = song?.file ? zip.file(song.file) : null;
    if (!archived) {
      continue;
    }

    const ext = extensionFromSong(song);
    const localName = `${Date.now()}-${index}-${sanitizeName(song.id) || 'track'}${ext}`;
    const localUri = `${IMPORT_ROOT}/${localName}`;

    const songBase64 = await archived.async('base64');
    await FileSystem.writeAsStringAsync(localUri, songBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const importedId = `imported-${Date.now()}-${index}-${sanitizeName(song.id) || 'track'}`;
    oldIdToNewId.set(song.id, importedId);

    importedSongs.push({
      id: importedId,
      title: song.title || 'Unknown',
      artist: song.artist || 'Unknown Artist',
      filename: song.filename || localName,
      duration: song.duration ?? null,
      isDeviceFavorite: false,
      isImported: true,
      uri: localUri,
      artworkUri: await resolveSongArtworkUri(localUri),
    });
  }

  const takenNames = buildPlaylistNameMap(existingPlaylists);
  const importedPlaylists = playlists.map((playlist, index) => ({
    id: `imported-playlist-${Date.now()}-${index}`,
    name: nextPlaylistName(playlist.name, takenNames),
    songIds: (playlist.songIds || [])
      .map((songId) => oldIdToNewId.get(songId))
      .filter(Boolean),
  }));

  return {
    importedSongs,
    importedPlaylists,
  };
}
