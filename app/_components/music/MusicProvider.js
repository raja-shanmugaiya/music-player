import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, Platform } from 'react-native';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {
  ensureLibraryDirectory,
  getLibraryFolderHint,
  loadLibrarySongs,
  requestFileStoragePermission,
} from '../../_lib/musicLibrary';
import {
  createPlaylistExportZip,
  importPlaylistsFromZip,
} from '../../_lib/playlistTransfer';
import {
  loadFavorites,
  loadImportedTracks,
  loadPlaylists,
  saveFavorites,
  saveImportedTracks,
  savePlaylists,
} from '../../_lib/storage';

const MusicContext = createContext(null);

export function MusicProvider({ children }) {
  const player = useAudioPlayer(null, { updateInterval: 250 });
  const playback = useAudioPlayerStatus(player);

  const [permission, setPermission] = useState(null);
  const [deviceSongs, setDeviceSongs] = useState([]);
  const [importedSongs, setImportedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [queue, setQueue] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [transferingPlaylists, setTransferingPlaylists] = useState(false);
  const didJustFinishRef = useRef(false);

  const songs = useMemo(
    () => [...deviceSongs, ...importedSongs],
    [deviceSongs, importedSongs],
  );

  useEffect(() => {
    loadFavorites()
      .then(setFavoriteIds)
      .catch(() => {});
    loadPlaylists()
      .then(setPlaylists)
      .catch(() => {});
    loadImportedTracks()
      .then(setImportedSongs)
      .catch(() => {});
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
  }, []);

  const loadSongs = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Local music files are available on iOS and Android.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setDeviceSongs(await loadLibrarySongs());
    } catch (loadError) {
      setError(
        loadError?.message ?? 'Could not read songs from the app folder.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const requestAccess = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Local music files are available on iOS and Android.');
      return false;
    }

    try {
      const response = await requestFileStoragePermission({
        forcePrompt: true,
      });
      setPermission(response);

      if (!response.granted) {
        setError(
          'Allow file storage access so King Music can create its folder and read MP3 files.',
        );
        return false;
      }

      await ensureLibraryDirectory();
      await loadSongs();
      return true;
    } catch (permissionError) {
      setError(
        permissionError?.message ?? 'Could not request file storage access.',
      );
      return false;
    }
  }, [loadSongs]);

  useEffect(() => {
    const id = setTimeout(() => {
      void requestFileStoragePermission().then((response) => {
        setPermission(response);
        if (response.granted) {
          void loadSongs();
        }
      });
    }, 0);

    return () => clearTimeout(id);
  }, [loadSongs]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadSongs();
      }
    });

    return () => subscription.remove();
  }, [loadSongs]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return undefined;
    }

    let subscription;

    void ensureLibraryDirectory()
      .then((library) => {
        if (
          library.kind !== 'file' ||
          typeof library.directory.watch !== 'function'
        ) {
          return;
        }

        subscription = library.directory.watch(() => {
          loadSongs();
        });
      })
      .catch(() => {});

    return () => subscription?.remove();
  }, [loadSongs]);

  const resolveUri = useCallback(async (song) => {
    if (!song?.uri) {
      throw new Error(
        'This file is no longer in the King Music Player folder.',
      );
    }

    return song.uri;
  }, []);

  const playSong = useCallback(
    async (song) => {
      try {
        const uri = await resolveUri(song);
        const track = { ...song, uri };
        setCurrentTrack(track);
        setQueue((current) => {
          if (current.length === 0) {
            return current;
          }

          const index = current.findIndex((item) => item.id === song.id);
          if (index > 0) {
            return current.slice(index + 1);
          }
          if (index === 0) {
            return current.slice(1);
          }
          return [];
        });
        player.replace({ uri, name: track.title });
        player.play();
      } catch (playError) {
        Alert.alert(
          'Playback error',
          playError?.message ?? 'Could not play this song.',
        );
      }
    },
    [player, resolveUri],
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) {
      return;
    }

    if (playback.playing) {
      player.pause();
      return;
    }

    player.play();
  }, [currentTrack, playback.playing, player]);

  const seekTo = useCallback(
    async (seconds) => {
      if (!currentTrack || playback.duration <= 0) {
        return;
      }

      const position = Math.min(Math.max(seconds, 0), playback.duration);
      await player.seekTo(position);
    },
    [currentTrack, playback.duration, player],
  );

  const addToQueue = useCallback((song) => {
    setQueue((current) => {
      if (current.some((item) => item.id === song.id)) {
        return current;
      }
      return [...current, song];
    });
  }, []);

  const upNext = useMemo(() => {
    if (queue.length > 0) {
      return queue;
    }

    const currentIndex = songs.findIndex(
      (song) => song.id === currentTrack?.id,
    );
    return currentIndex >= 0 ? songs.slice(currentIndex + 1) : [];
  }, [currentTrack, queue, songs]);

  const moveUpNext = useCallback(
    (from, to) => {
      if (from === to) {
        return;
      }

      setQueue((current) => {
        let list;
        if (current.length > 0) {
          list = [...current];
        } else {
          const currentIndex = songs.findIndex(
            (song) => song.id === currentTrack?.id,
          );
          list = currentIndex >= 0 ? songs.slice(currentIndex + 1) : [];
        }

        if (from < 0 || from >= list.length || to < 0 || to >= list.length) {
          return current;
        }

        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return list;
      });
    },
    [currentTrack, songs],
  );

  const nextTrack = useCallback(() => {
    const queuedTrack = queue[0];
    if (queuedTrack) {
      void playSong(queuedTrack);
      return;
    }

    const currentIndex = songs.findIndex(
      (song) => song.id === currentTrack?.id,
    );
    const next = currentIndex >= 0 ? songs[currentIndex + 1] : songs[0];
    if (next) {
      void playSong(next);
    }
  }, [currentTrack, playSong, queue, songs]);

  const previousTrack = useCallback(() => {
    const currentIndex = songs.findIndex(
      (song) => song.id === currentTrack?.id,
    );
    const previous = currentIndex > 0 ? songs[currentIndex - 1] : null;
    if (previous) {
      void playSong(previous);
    }
  }, [currentTrack, playSong, songs]);

  useEffect(() => {
    if (playback.didJustFinish === didJustFinishRef.current) {
      return undefined;
    }

    didJustFinishRef.current = playback.didJustFinish;

    if (!playback.didJustFinish) {
      return undefined;
    }

    const id = setTimeout(() => {
      nextTrack();
    }, 0);

    return () => clearTimeout(id);
  }, [playback.didJustFinish, nextTrack]);

  const toggleFavorite = useCallback(
    async (song) => {
      const isFavorite = favoriteIds.includes(song.id);
      const nextIds = isFavorite
        ? favoriteIds.filter((id) => id !== song.id)
        : [...favoriteIds, song.id];

      setFavoriteIds(nextIds);
      await saveFavorites(nextIds);
    },
    [favoriteIds],
  );

  const createPlaylist = useCallback(
    async (name, song) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }

      const playlist = {
        id: Date.now().toString(),
        name: trimmed,
        songIds: song ? [song.id] : [],
      };
      const next = [...playlists, playlist];
      setPlaylists(next);
      await savePlaylists(next);
      return playlist;
    },
    [playlists],
  );

  const addToPlaylist = useCallback(
    async (playlistId, song) => {
      const next = playlists.map((playlist) => {
        if (playlist.id !== playlistId) {
          return playlist;
        }
        if (playlist.songIds.includes(song.id)) {
          return playlist;
        }
        return { ...playlist, songIds: [...playlist.songIds, song.id] };
      });
      setPlaylists(next);
      await savePlaylists(next);
    },
    [playlists],
  );

  const deletePlaylist = useCallback(
    async (playlistId) => {
      const next = playlists.filter((playlist) => playlist.id !== playlistId);
      setPlaylists(next);
      await savePlaylists(next);
    },
    [playlists],
  );

  const mergePlaylists = useCallback(
    async (sourceId, targetId) => {
      if (sourceId === targetId) {
        return;
      }

      const source = playlists.find((playlist) => playlist.id === sourceId);
      if (!source) {
        return;
      }

      const next = playlists.map((playlist) => {
        if (playlist.id !== targetId) {
          return playlist;
        }
        return {
          ...playlist,
          songIds: [...new Set([...playlist.songIds, ...source.songIds])],
        };
      });
      setPlaylists(next);
      await savePlaylists(next);
    },
    [playlists],
  );

  const exportPlaylists = useCallback(async () => {
    if (Platform.OS === 'web') {
      throw new Error('Playlist export is available on iOS and Android.');
    }

    setTransferingPlaylists(true);
    try {
      const exportResult = await createPlaylistExportZip({
        playlists,
        songs,
        resolveSongUri: resolveUri,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(exportResult.zipUri, {
          dialogTitle: 'Export playlists',
          mimeType: 'application/zip',
          UTI: 'public.zip-archive',
        });
      }

      return exportResult;
    } finally {
      setTransferingPlaylists(false);
    }
  }, [playlists, resolveUri, songs]);

  const importPlaylists = useCallback(async () => {
    if (Platform.OS === 'web') {
      throw new Error('Playlist import is available on iOS and Android.');
    }

    setTransferingPlaylists(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/zip', 'application/x-zip-compressed'],
      });

      if (picked.canceled) {
        return null;
      }

      const zipUri = picked.assets?.[0]?.uri;
      if (!zipUri) {
        throw new Error('Could not read the selected zip file.');
      }

      const { importedPlaylists, importedSongs: nextImportedSongs } =
        await importPlaylistsFromZip({
          zipUri,
          existingPlaylists: playlists,
          existingSongs: songs,
        });

      const mergedPlaylists = [...playlists, ...importedPlaylists];
      const mergedImportedSongs = [...importedSongs, ...nextImportedSongs];

      setPlaylists(mergedPlaylists);
      setImportedSongs(mergedImportedSongs);
      await savePlaylists(mergedPlaylists);
      await saveImportedTracks(mergedImportedSongs);

      return {
        playlistCount: importedPlaylists.length,
        trackCount: nextImportedSongs.length,
      };
    } finally {
      setTransferingPlaylists(false);
    }
  }, [importedSongs, playlists, songs]);

  const value = useMemo(
    () => ({
      permission,
      libraryFolderHint: getLibraryFolderHint(),
      songs,
      loading,
      error,
      currentTrack,
      queue,
      upNext,
      playlists,
      favoriteIds,
      playback,
      requestAccess,
      loadSongs,
      playSong,
      togglePlay,
      seekTo,
      nextTrack,
      previousTrack,
      addToQueue,
      moveUpNext,
      toggleFavorite,
      createPlaylist,
      addToPlaylist,
      deletePlaylist,
      mergePlaylists,
      exportPlaylists,
      importPlaylists,
      transferingPlaylists,
      isFavorite: (songId) => favoriteIds.includes(songId),
    }),
    [
      addToPlaylist,
      addToQueue,
      createPlaylist,
      currentTrack,
      deletePlaylist,
      error,
      exportPlaylists,
      favoriteIds,
      importPlaylists,
      loadSongs,
      loading,
      mergePlaylists,
      moveUpNext,
      permission,
      playSong,
      playback,
      playlists,
      queue,
      requestAccess,
      songs,
      seekTo,
      transferingPlaylists,
      upNext,
      toggleFavorite,
      togglePlay,
      nextTrack,
      previousTrack,
    ],
  );

  return (
    <MusicContext.Provider value={value}>{children}</MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used inside MusicProvider');
  }
  return context;
}
