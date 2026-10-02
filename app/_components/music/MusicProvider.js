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
  Audio,
} from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import {
  ensureLibraryDirectory,
  getLibraryFolderHint,
  loadLibrarySongs,
  requestFileStoragePermission,
  artworkUriToDataUri,
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

function shuffled(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export function MusicProvider({ children }) {
  const player = useAudioPlayer(null, { updateInterval: 1000 });
  const playback = useAudioPlayerStatus(player);

  const [permission, setPermission] = useState(null);
  const [deviceSongs, setDeviceSongs] = useState([]);
  const [importedSongs, setImportedSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [order, setOrder] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [shuffle, setShuffle] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState([]);
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
      interruptionMode: 'doNotMix',
    }).catch(() => {});

    if (Platform.OS === 'android') {
      Audio.requestNotificationPermissionsAsync()
        .then((response) => {
          if (!response.granted) {
            console.warn('Notification permission not granted');
          }
        })
        .catch(() => {});
    }
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
    async (song, { advanceWithinQueue = false } = {}) => {
      try {
        const uri = await resolveUri(song);
        const track = { ...song, uri };
        if (!advanceWithinQueue) {
          setOrder([]);
        }
        setCurrentTrack(track);
        player.replace({ uri, name: track.title });

        const artworkUrl = await artworkUriToDataUri(track.artworkUri);

        try {
          player.setActiveForLockScreen(true, {
            title: track.title,
            artist: track.artist || 'Unknown Artist',
            artworkUrl: artworkUrl || undefined,
          });
        } catch {
          // Lock screen controls are only supported on iOS and Android.
        }

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

  const playSongFromList = useCallback(
    async (song, list) => {
      try {
        const uri = await resolveUri(song);
        const track = { ...song, uri };
        setOrder(list);
        setCurrentTrack(track);
        player.replace({ uri, name: track.title });

        const artworkUrl = await artworkUriToDataUri(track.artworkUri);

        try {
          player.setActiveForLockScreen(true, {
            title: track.title,
            artist: track.artist || 'Unknown Artist',
            artworkUrl: artworkUrl || undefined,
          });
        } catch {
          // Lock screen controls are only supported on iOS and Android.
        }

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

  const addToQueue = useCallback(
    (song) => {
      setOrder((currentOrder) => {
        const base = currentOrder.length > 0 ? currentOrder : songs;
        if (base.some((item) => item.id === song.id)) {
          return currentOrder;
        }
        const currentIndex = base.findIndex(
          (item) => item.id === currentTrack?.id,
        );
        const insertAt = currentIndex >= 0 ? currentIndex + 1 : base.length;
        const next = [
          ...base.slice(0, insertAt),
          song,
          ...base.slice(insertAt),
        ];
        return next;
      });
    },
    [currentTrack, songs],
  );

  const toggleShuffle = useCallback(() => {
    if (shuffle) {
      setShuffle(false);
      return;
    }

    const base = order.length > 0 ? order : songs;
    const rest = base.filter((song) => song.id !== currentTrack?.id);
    setShuffledOrder(
      currentTrack ? [currentTrack, ...shuffled(rest)] : shuffled(base),
    );
    setShuffle(true);
  }, [currentTrack, order, shuffle, songs]);

  const queueList = useMemo(() => {
    if (shuffle && shuffledOrder.length > 0) {
      return shuffledOrder;
    }
    return order.length > 0 ? order : songs;
  }, [order, shuffle, shuffledOrder, songs]);

  const upNext = useMemo(() => {
    const currentIndex = queueList.findIndex(
      (song) => song.id === currentTrack?.id,
    );
    return currentIndex >= 0 ? queueList.slice(currentIndex + 1) : [];
  }, [currentTrack, queueList]);

  const moveUpNext = useCallback(
    (from, to) => {
      if (from === to) {
        return;
      }

      setOrder((currentOrder) => {
        const list = currentOrder.length > 0 ? [...currentOrder] : [...songs];

        if (from < 0 || from >= list.length || to < 0 || to >= list.length) {
          return currentOrder;
        }

        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        return list;
      });
    },
    [songs],
  );

  const nextTrack = useCallback(() => {
    const next = upNext[0];
    if (next) {
      void playSong(next, { advanceWithinQueue: true });
    }
  }, [playSong, upNext]);

  const previousTrack = useCallback(() => {
    const currentIndex = queueList.findIndex(
      (song) => song.id === currentTrack?.id,
    );
    const previous = currentIndex > 0 ? queueList[currentIndex - 1] : null;
    if (previous) {
      void playSong(previous, { advanceWithinQueue: true });
    }
  }, [currentTrack, playSong, queueList]);

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

  useEffect(() => {
    if (currentTrack) {
      return;
    }
    player.clearLockScreenControls();
  }, [currentTrack, player]);

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
      queueList,
      upNext,
      playlists,
      favoriteIds,
      playback,
      requestAccess,
      loadSongs,
      playSong,
      playSongFromList,
      togglePlay,
      seekTo,
      shuffle,
      toggleShuffle,
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
      playSongFromList,
      playback,
      playlists,
      queueList,
      requestAccess,
      songs,
      seekTo,
      shuffle,
      toggleShuffle,
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
